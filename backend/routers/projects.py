"""
ICON APP - Projects Router
Full CRUD with JWT role-based access control.

Permissions:
  GET /           → all authenticated roles (scoped by role)
  GET /{id}       → all authenticated roles (scoped by ownership)
  POST /          → admin, owner, office_staff, dealer
  PUT /{id}/stage → admin, owner, project_manager, office_staff, contractors (own stages)
  PATCH /{id}     → admin, owner, project_manager, office_staff, bank_officer, agency_officer
  DELETE /{id}    → admin, owner only
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import (
    get_current_user, require_roles, is_admin,
    assert_project_access, accessible_project_filter,
    ADMIN_ROLES, STAFF_ROLES, CONTRACTOR_ROLES,
)
from activity import log_activity
from constants.stages import STAGE_REQUIRED_DOCS, CONSTRUCTION, STAGE_LABELS
from field_photos import save_base64_photos
from idempotency import get_cached, save_cached
import models, schemas

router = APIRouter(prefix="/projects", tags=["Projects"])
PROJECT_ITEM_WRITE_ROLES = ADMIN_ROLES | {"office_staff", "project_manager", "dealer"}
PROJECT_CO_APPLICANT_WRITE_ROLES = {"admin", "owner", "office_staff", "dealer"}


# ─── CONTRACTOR → ALLOWED STAGES MAP ─────────────────────────────────────────
CONTRACTOR_STAGE_MAP = {
    "structure_contractor":  {"m1_foundation", "m2_structure_erection", "m3_covering_material", "m4_trellising"},
    "drip_contractor":       {"m5_drip_fitting"},
    "bed_contractor":        {"m6_bed_preparation"},
    "plantation_contractor": {"m7_plantation"},
}

# ─── LIST ─────────────────────────────────────────────────────────────────────
@router.get("/", response_model=schemas.ProjectPageResponse)
def get_projects(
    skip: int = 0,
    limit: int = 100,
    stage: Optional[str] = None,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List projects scoped by the caller's role."""
    query = db.query(models.Project).options(
        joinedload(models.Project.farmer),
        joinedload(models.Project.dealer),
        joinedload(models.Project.bank_branch).joinedload(models.BankBranch.bank),
        joinedload(models.Project.area_type)
    )

    # Role-based scoping — single source of truth in auth_dep, shared with the
    # documents list. (This used to be a third inline copy of the same rules,
    # which is how per-endpoint drift happens; it also silently granted UNKNOWN
    # roles full visibility, whereas the shared filter denies them.)
    access_filter = accessible_project_filter(current_user, db)
    if access_filter is not None:
        query = query.filter(access_filter)

    # Optional filters
    if stage:
        stage_list = [s.strip() for s in stage.split(',') if s.strip()]
        query = query.filter(models.Project.project_stage.in_(stage_list))
    if district:
        query = query.join(models.Project.village).join(models.Village.taluka).join(models.Taluka.district).filter(models.District.name.ilike(f"%{district}%"))

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return {"total": total, "items": items}


# ─── Mobile DPR (project_id in body — offline queue parity) ───────────────────
class MobilePhoto(BaseModel):
    slot: str
    data: str


class MobileDPRCreate(BaseModel):
    project_id: int
    milestone_key: str
    skilled_count: int = 0
    unskilled_count: int = 0
    work_done: str
    materials_note: Optional[str] = None
    photos: list[MobilePhoto] = []
    submitted_at: Optional[str] = None


@router.post("/dpr", response_model=schemas.DailySiteReportResponse, status_code=201)
def submit_mobile_dpr(
    body: MobileDPRCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Submit a Daily Progress Report from the mobile offline queue."""
    route = "/projects/dpr"
    if idempotency_key:
        cached = get_cached(db, idempotency_key)
        if cached:
            code, payload = cached
            return JSONResponse(content=payload, status_code=code)

    ALLOWED = ADMIN_ROLES | {"project_manager", "office_staff"} | CONTRACTOR_ROLES
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")

    project = db.query(models.Project).filter(models.Project.id == body.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)

    photo_paths = save_base64_photos(body.project_id, [p.model_dump() for p in body.photos], "dpr")
    work_done = body.work_done.strip()
    if body.materials_note:
        work_done = f"{work_done}\n\nMaterials: {body.materials_note.strip()}"

    from datetime import date
    import json as _json

    db_report = models.DailySiteReport(
        project_id=body.project_id,
        report_date=date.today(),
        supervisor_id=current_user.id,
        work_done=work_done,
        labor_count=(body.skilled_count or 0) + (body.unskilled_count or 0) or None,
        issues=_json.dumps({
            "milestone_key": body.milestone_key,
            "skilled_count": body.skilled_count,
            "unskilled_count": body.unskilled_count,
            "photos": photo_paths,
            "submitted_at": body.submitted_at,
        }, ensure_ascii=False),
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    if idempotency_key:
        payload = schemas.DailySiteReportResponse.model_validate(db_report).model_dump(mode="json")
        save_cached(db, idempotency_key, route, 201, payload)
    return db_report


# ─── GET ONE ──────────────────────────────────────────────────────────────────
@router.get("/{project_id}", response_model=schemas.ProjectDetailResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    project = (
        db.query(models.Project)
        .options(
            joinedload(models.Project.items),
            joinedload(models.Project.contractors).joinedload(models.ProjectContractor.contractor),
            joinedload(models.Project.contractors).joinedload(models.ProjectContractor.skill),
            joinedload(models.Project.farmer),
            joinedload(models.Project.dealer),
            joinedload(models.Project.bank_branch),
            joinedload(models.Project.area_type),
        )
        .filter(models.Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)
    return project


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Create a new project.
    Allowed: admin, owner, office_staff, dealer.
    Dealers can only create projects linked to their own farmers.
    """
    ALLOWED = ADMIN_ROLES | {"office_staff", "dealer"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to create projects.")

    if current_user.role == "dealer":
        # Ensure dealer only creates projects for their own farmers
        mapping = db.query(models.DealerFarmerMapping).filter(
            models.DealerFarmerMapping.dealer_id == current_user.id,
            models.DealerFarmerMapping.farmer_id == project.farmer_id,
            models.DealerFarmerMapping.is_active == 1,
        ).first()
        if not mapping:
            raise HTTPException(
                status_code=403,
                detail="Dealers can only create projects for their own registered farmers.",
            )

    try:
        new_project = models.Project(**project.model_dump())
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        return new_project
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ─── UPDATE STAGE ─────────────────────────────────────────────────────────────
@router.put("/{project_id}/stage")
def update_project_stage(
    project_id: int,
    stage_name: str,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Advance a project to a new stage.
    - admin/owner: any stage.
    - project_manager/office_staff: any stage.
    - Contractors: only their own allowed stages.
    - Others: forbidden.
    """
    ALLOWED_ROLES = ADMIN_ROLES | {"office_staff", "project_manager"}

    if stage_name not in models.VALID_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"'{stage_name}' is not a valid project stage. Valid stages: {models.VALID_STAGES}",
        )

    if current_user.role in CONTRACTOR_ROLES:
        allowed_stages = CONTRACTOR_STAGE_MAP.get(current_user.role, set())
        if stage_name not in allowed_stages:
            raise HTTPException(
                status_code=403,
                detail=f"Contractors of type '{current_user.role}' can only set stages: {allowed_stages}",
            )
    elif current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to update project stage.")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assert_project_access(project, current_user, db)

    old_stage = project.project_stage

    # Non-admins may only advance one stage forward at a time (reverts still allowed).
    if stage_name != old_stage and current_user.role not in ADMIN_ROLES:
        try:
            old_idx = models.VALID_STAGES.index(old_stage)
            new_idx = models.VALID_STAGES.index(stage_name)
            if new_idx > old_idx + 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cannot skip stages. Current: '{old_stage}', "
                        f"requested: '{stage_name}'. Advance one stage at a time."
                    ),
                )
        except ValueError:
            pass

    # ── Required-document gate — block leaving a stage that still has missing
    # mandatory documents. Admin/owner can override (e.g. fixing data manually).
    if stage_name != old_stage and current_user.role not in ADMIN_ROLES:
        required_docs = STAGE_REQUIRED_DOCS.get(old_stage, [])
        if required_docs:
            uploaded_types = {
                d.document_type for d in
                db.query(models.ProjectDocument.document_type)
                .filter(models.ProjectDocument.project_id == project_id)
                .all()
            }
            missing = [d for d in required_docs if d not in uploaded_types]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot leave stage '{old_stage}' — missing required documents: {missing}",
                )

    project.project_stage = stage_name
    project.project_stage_entered_at = func.now()
    project.version = (project.version or 1) + 1

    log = models.ProjectMilestone(
        project_id=project_id,
        milestone_name=stage_name,
        updated_by=current_user.id,
        status="completed",
        completion_date=func.now()
    )
    db.add(log)
    # Audit trail — surfaced by the web ActivityTimeline.
    log_activity(
        db, project_id, current_user,
        action="advanced the stage" if stage_name != old_stage else "updated the stage",
        from_stage=old_stage, to_stage=stage_name,
    )
    db.commit()
    return {"message": f"Stage updated: {old_stage} → {stage_name}"}


@router.get("/{project_id}/activity")
def get_project_activity(
    project_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Audit trail for a project — most recent first. Consumed by the web ActivityTimeline."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)

    rows = (
        db.query(models.ProjectActivity)
        .filter(models.ProjectActivity.project_id == project_id)
        .order_by(models.ProjectActivity.created_at.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [
        {
            "id": r.id,
            "actor_name": r.actor_name,
            "actor_role": r.actor_role,
            "action": r.action,
            "from_stage": r.from_stage,
            "to_stage": r.to_stage,
            "note": r.note,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


MILESTONE_ORDER = [
    "m1_foundation", "m2_structure_erection", "m3_covering_material", "m4_trellising",
    "m5_drip_fitting", "m6_bed_preparation", "m7_plantation",
]


def _milestone_mobile(record: Optional[models.ProjectMilestone], key: str, project_stage: str) -> dict:
    signed_off = False
    status = "pending"
    progress_pct = 0
    if record:
        signed_off = record.status in ("completed", "signed_off", "done")
        status = "completed" if signed_off else ("active" if record.status in ("active", "in_progress") else "pending")
        progress_pct = 100 if signed_off else (50 if status == "active" else 0)
    elif project_stage == key:
        status = "active"
        progress_pct = 25

    return {
        "key":           key,
        "label":         STAGE_LABELS.get(key, key),
        "status":        status,
        "progress_pct":  progress_pct,
        "photos_count":  0,
        "signed_off":    signed_off,
        "signed_off_at": record.completion_date.isoformat() if record and record.completion_date else None,
        "version":       record.version if record else 1,
    }


@router.get("/{project_id}/milestones")
def get_project_milestones(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Construction milestones for mobile MilestoneTrackerScreen."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)

    records = {
        m.milestone_name: m
        for m in db.query(models.ProjectMilestone)
        .filter(
            models.ProjectMilestone.project_id == project_id,
            models.ProjectMilestone.milestone_name.in_(MILESTONE_ORDER),
        )
        .all()
    }
    return [_milestone_mobile(records.get(k), k, project.project_stage or "") for k in MILESTONE_ORDER]


class MilestonePatchBody(BaseModel):
    progress_pct: int = 0
    description: Optional[str] = None
    version: Optional[int] = None


@router.patch("/{project_id}/milestones/{milestone_key}")
def patch_project_milestone(
    project_id: int,
    milestone_key: str,
    body: MilestonePatchBody,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Update/sign-off a construction milestone from mobile."""
    ALLOWED = ADMIN_ROLES | {"project_manager", "office_staff"} | CONTRACTOR_ROLES
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")

    if milestone_key not in MILESTONE_ORDER:
        raise HTTPException(status_code=400, detail=f"Unknown milestone: {milestone_key}")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)

    record = (
        db.query(models.ProjectMilestone)
        .filter(
            models.ProjectMilestone.project_id == project_id,
            models.ProjectMilestone.milestone_name == milestone_key,
        )
        .first()
    )
    if not record:
        record = models.ProjectMilestone(
            project_id=project_id,
            milestone_name=milestone_key,
            status="in_progress",
            updated_by=current_user.id,
        )
        db.add(record)
        db.flush()

    if body.version is not None and record.version is not None and int(body.version) != int(record.version):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This milestone was changed by someone else since you opened it. Reload and try again.",
        )

    from datetime import date as _date

    if body.progress_pct >= 100:
        record.status = "completed"
        record.completion_date = _date.today()
    else:
        record.status = "in_progress"
    if body.description:
        record.remarks = body.description
    record.updated_by = current_user.id
    record.version = (record.version or 1) + 1
    db.commit()
    db.refresh(record)
    return _milestone_mobile(record, milestone_key, project.project_stage or "")


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    updates: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Full update of a project's core details.
    """
    ALLOWED_ROLES = ADMIN_ROLES | {"office_staff", "dealer"}
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to fully update this project.")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Dealers can only update their own projects
    if current_user.role == "dealer" and project.dealer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Dealers can only update their own projects.")

    assert_project_access(project, current_user, db)

    update_data = updates.model_dump(exclude_unset=True)

    # ── Optimistic concurrency — reject a stale write (lost-update guard) ──
    client_version = update_data.pop("version", None)
    update_data.pop("updated_at", None)
    if client_version is not None and project.version is not None and int(client_version) != int(project.version):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This project was changed by someone else since you opened it. Reload and try again.",
        )

    for key, value in update_data.items():
        if hasattr(project, key):
            setattr(project, key, value)

    project.version = (project.version or 1) + 1
    log_activity(db, project_id, current_user, action="updated project details")
    db.commit()
    db.refresh(project)
    return project

# ─── PROJECT ITEMS ────────────────────────────────────────────────────────────
@router.get("/{project_id}/items", response_model=List[schemas.ProjectItemResponse])
def get_project_items(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get all items for a project ? used for edit mode."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)
    items = db.query(models.ProjectItem).filter(models.ProjectItem.project_id == project_id).all()
    return items

@router.delete("/{project_id}/items")
def delete_all_project_items(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Delete ALL items for a project ? used for edit mode to replace all items at once."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role not in PROJECT_ITEM_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to modify project items.")
    assert_project_access(project, current_user, db)
    items = db.query(models.ProjectItem).filter(models.ProjectItem.project_id == project_id).all()
    count = len(items)
    for item in items:
        db.delete(item)
    db.commit()
    return {"message": f"Deleted {count} items."}

@router.post("/{project_id}/items", response_model=schemas.ProjectItemResponse)
def add_project_item(
    project_id: int,
    item: schemas.ProjectItemCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role not in PROJECT_ITEM_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to modify project items.")
    assert_project_access(project, current_user, db)
    
    new_item = models.ProjectItem(**item.model_dump())
    new_item.project_id = project_id
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.delete("/{project_id}/items/{item_id}")
def delete_project_item(
    project_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role not in PROJECT_ITEM_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to modify project items.")
    assert_project_access(project, current_user, db)
    
    item = db.query(models.ProjectItem).filter(models.ProjectItem.id == item_id, models.ProjectItem.project_id == project_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Project item not found")
        
    db.delete(item)
    db.commit()
    return {"message": "Item deleted."}



# ─── PARTIAL UPDATE (stage action panels) ─────────────────────────────────────
class ProjectFieldUpdate(BaseModel):
    updates: dict


def _coerce_project_field(key: str, value):
    """
    `updates` is an untyped dict, so JSON strings arrive uncoerced: the web
    stage panels submit dates as 'YYYY-MM-DD', numbers as text-input strings,
    and cleared fields as ''. SQLAlchemy's SQLite Date/Integer/Float types
    reject strings at commit (StatementError), so convert by the model
    column's type before assignment. Raises 400 (not 500) on garbage input.
    """
    col = models.Project.__table__.columns.get(key)
    if col is None or value is None or value == "":
        return None if value == "" else value
    t = col.type
    try:
        if isinstance(value, str):
            import sqlalchemy as sa
            from datetime import date, datetime
            if isinstance(t, sa.DateTime):
                return datetime.fromisoformat(value)
            if isinstance(t, sa.Date):
                return date.fromisoformat(value[:10])
            if isinstance(t, sa.Integer):
                return int(value)
            if isinstance(t, (sa.Float, sa.Numeric)):
                return float(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid value for field '{key}': {value!r}")
    return value

@router.patch("/{project_id}")
def update_project_fields(
    project_id: int,
    body: ProjectFieldUpdate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Partial field update — used by stage action panels.
    Each role can only set fields relevant to their domain.
    """
    ALLOWED_ROLES = ADMIN_ROLES | {"office_staff", "project_manager", "bank_officer", "agency_officer", "agronomist"}
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to update project fields.")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assert_project_access(project, current_user, db)

    # Role-scoped field whitelists. Each set mirrors the fields the matching
    # web StageActionPanel form actually collects for that stage/role —
    # see constants/stages.py STAGE_ROLES and web/.../StageActionPanel.tsx.
    ADMIN_FIELDS = {
        "total_project_cost", "total_eligible_cost", "priority", "remarks",
        "project_manager_id",
    }
    CONSTRUCTION_FIELDS = {
        "actual_start_date", "actual_end_date",
    }
    BANK_FIELDS = {
        "loan_amount", "loan_sanction_date", "loan_account_number",
    }
    GOC_FIELDS = {
        "goc_number", "goc_date",
    }
    AGENCY_FIELDS = {
        "subsidy_inspection_date", "subsidy_inspector_name",
        "subsidy_inspection_remarks", "subsidy_inspection_passed",
        "subsidy_meeting_date", "subsidy_meeting_decision",
        "subsidy_approved_amount", "subsidy_meeting_remarks",
        "subsidy_release_order_number", "subsidy_release_amount",
        "subsidy_release_date", "subsidy_bank_credit_date",
    }
    SUBSIDY_CLAIM_FIELDS = {
        "subsidy_claim_reference", "subsidy_claim_date",
    }
    AGRONOMIST_FIELDS = {
        "plantation_date", "seedlings_count", "agronomist_recommendations",
    }
    COMPLETION_FIELDS = {
        "completion_certificate_date", "farmer_feedback", "farmer_rating",
    }
    # office_staff/admin/owner can see every stage panel per STAGE_ROLES, so
    # they get the union of every role-specific set in addition to their own.
    OFFICE_STAFF_FIELDS = (
        GOC_FIELDS | AGENCY_FIELDS | SUBSIDY_CLAIM_FIELDS | COMPLETION_FIELDS
    )

    role = current_user.role
    if role in ADMIN_ROLES | {"office_staff"}:
        ALLOWED_FIELDS = (
            ADMIN_FIELDS | CONSTRUCTION_FIELDS | BANK_FIELDS | OFFICE_STAFF_FIELDS
            | AGRONOMIST_FIELDS
        )
    elif role == "project_manager":
        ALLOWED_FIELDS = ADMIN_FIELDS | CONSTRUCTION_FIELDS
    elif role == "bank_officer":
        ALLOWED_FIELDS = BANK_FIELDS
    elif role == "agency_officer":
        # subsidy_claim is office_staff/admin/owner only per STAGE_ROLES —
        # agency_officer covers goc_registration/agency_inspection/
        # committee_meeting/subsidy_released, not subsidy_claim.
        ALLOWED_FIELDS = GOC_FIELDS | AGENCY_FIELDS
    elif role == "agronomist":
        ALLOWED_FIELDS = AGRONOMIST_FIELDS
    else:
        ALLOWED_FIELDS = set()

    updates = dict(body.updates)

    # ── Optimistic concurrency — reject a stale write (lost-update guard) ──
    client_version = updates.pop("version", None)
    updates.pop("updated_at", None)
    if client_version is not None and project.version is not None and int(client_version) != int(project.version):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This project was changed by someone else since you opened it. Reload and try again.",
        )

    applied = []
    for key, value in updates.items():
        if key in ALLOWED_FIELDS and hasattr(project, key):
            setattr(project, key, _coerce_project_field(key, value))
            applied.append(key)

    if applied:
        project.version = (project.version or 1) + 1
        log_activity(db, project_id, current_user,
                     action="updated fields: " + ", ".join(applied))

    db.commit()
    db.refresh(project)
    return {"message": "Project fields updated", "applied_fields": applied}


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{project_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """
    Delete a project. Admin/Owner only.
    This is a hard delete — use with caution.
    """
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": f"Project ID {project_id} deleted."}


# ─── CO-APPLICANTS ────────────────────────────────────────────────────────────
@router.get("/{project_id}/co-applicants")
def list_co_applicants(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all co-applicants for a project."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)

    records = (
        db.query(models.ProjectCoApplicant)
          .filter(models.ProjectCoApplicant.project_id == project_id)
          .all()
    )
    return [
        {
            "id":         r.id,
            "project_id": r.project_id,
            "farmer_id":  r.farmer_id,
            "farmer_name": f"{r.farmer.first_name} {r.farmer.last_name or ''}".strip()
                           if r.farmer else None,
            "created_at": r.created_at,
        }
        for r in records
    ]


@router.post("/{project_id}/co-applicants")
def add_co_applicant(
    project_id: int,
    body: schemas.ProjectCoApplicantCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Add a farmer as a co-applicant to a project."""
    if current_user.role not in PROJECT_CO_APPLICANT_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized.")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)

    farmer = db.query(models.Person).filter(models.Person.id == body.farmer_id).first()
    if not farmer or farmer.role != "farmer":
        raise HTTPException(status_code=400, detail="Co-applicant must be a valid farmer.")

    if current_user.role == "dealer":
        mapping = db.query(models.DealerFarmerMapping).filter(
            models.DealerFarmerMapping.dealer_id == current_user.id,
            models.DealerFarmerMapping.farmer_id == body.farmer_id,
            models.DealerFarmerMapping.is_active == 1,
        ).first()
        if not mapping:
            raise HTTPException(status_code=403, detail="Dealers can only manage their own farmers as co-applicants.")

    existing = (
        db.query(models.ProjectCoApplicant)
          .filter(
              models.ProjectCoApplicant.project_id == project_id,
              models.ProjectCoApplicant.farmer_id  == body.farmer_id,
          )
          .first()
    )
    if existing:
        return existing

    record = models.ProjectCoApplicant(project_id=project_id, farmer_id=body.farmer_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "project_id": record.project_id, "farmer_id": record.farmer_id}


@router.delete("/{project_id}/co-applicants/{farmer_id}")
def remove_co_applicant(
    project_id: int,
    farmer_id:  int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Remove a co-applicant from a project."""
    if current_user.role not in PROJECT_CO_APPLICANT_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized.")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assert_project_access(project, current_user, db)

    record = (
        db.query(models.ProjectCoApplicant)
          .filter(
              models.ProjectCoApplicant.project_id == project_id,
              models.ProjectCoApplicant.farmer_id  == farmer_id,
          )
          .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Co-applicant mapping not found.")

    if current_user.role == "dealer":
        mapping = db.query(models.DealerFarmerMapping).filter(
            models.DealerFarmerMapping.dealer_id == current_user.id,
            models.DealerFarmerMapping.farmer_id == farmer_id,
            models.DealerFarmerMapping.is_active == 1,
        ).first()
        if not mapping:
            raise HTTPException(status_code=403, detail="Dealers can only manage their own farmers as co-applicants.")

    db.delete(record)
    db.commit()
    return {"message": f"Farmer {farmer_id} removed from project {project_id} co-applicants."}

# ─── DAILY PROGRESS REPORT (DPR) ──────────────────────────────────────────────
@router.post("/{project_id}/dpr", response_model=schemas.DailySiteReportResponse, status_code=201)
def create_daily_progress_report(
    project_id: int,
    report: schemas.DailySiteReportCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Submit a Daily Progress Report (DPR) from the mobile app."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    assert_project_access(project, current_user, db)

    db_report = models.DailySiteReport(**report.dict(exclude_unset=True))
    db_report.project_id = project_id
    
    # Auto-assign the supervisor if not explicitly provided
    if not db_report.supervisor_id:
        db_report.supervisor_id = current_user.id
        
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report
