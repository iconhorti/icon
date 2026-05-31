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

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import (
    get_current_user, require_roles, is_admin,
    assert_project_access, ADMIN_ROLES, STAFF_ROLES, CONTRACTOR_ROLES,
)
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
@router.get("/", response_model=List[schemas.ProjectListResponse])
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

    # Role-based scoping
    if current_user.role == "dealer":
        # Dealer sees their own assigned projects OR projects for their mapped farmers
        mapped_farmer_ids = [
            m.farmer_id for m in
            db.query(models.DealerFarmerMapping).filter_by(dealer_id=current_user.id).all()
        ]
        query = query.filter(
            (models.Project.dealer_id == current_user.id) |
            (models.Project.farmer_id.in_(mapped_farmer_ids))
        )
    elif current_user.role == "farmer":
        query = query.filter(models.Project.farmer_id == current_user.id)
    elif current_user.role in CONTRACTOR_ROLES:
        # Contractors see only projects they are assigned to
        assigned_ids = [
            pc.project_id for pc in
            db.query(models.ProjectContractor)
              .filter(models.ProjectContractor.contractor_id == current_user.id).all()
        ]
        query = query.filter(models.Project.id.in_(assigned_ids))
    # admin, owner, office_staff, project_manager, bank_officer, agency_officer, agronomist → all projects

    # Optional filters
    if stage:
        stage_list = [s.strip() for s in stage.split(',') if s.strip()]
        query = query.filter(models.Project.project_stage.in_(stage_list))
    if district:
        query = query.join(models.Project.village).join(models.Village.taluka).join(models.Taluka.district).filter(models.District.name.ilike(f"%{district}%"))

    return query.offset(skip).limit(limit).all()


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
    project.project_stage = stage_name

    log = models.ProjectMilestone(
        project_id=project_id,
        milestone_name=stage_name,
        updated_by=current_user.id,
        status="completed",
        completion_date=func.now()
    )
    db.add(log)
    db.commit()
    return {"message": f"Stage updated: {old_stage} → {stage_name}"}


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
    for key, value in update_data.items():
        setattr(project, key, value)

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

    # Role-scoped field whitelists
    ADMIN_FIELDS = {
        "total_project_cost", "total_eligible_cost", "priority", "remarks",
        "project_manager_id",
    }
    BANK_FIELDS = set()
    GOC_FIELDS = set()
    CONSTRUCTION_FIELDS = {
        "actual_start_date", "actual_end_date"
    }
    SUBSIDY_FIELDS = set()

    role = current_user.role
    if role in ADMIN_ROLES | {"office_staff", "project_manager"}:
        ALLOWED_FIELDS = ADMIN_FIELDS | BANK_FIELDS | GOC_FIELDS | CONSTRUCTION_FIELDS | SUBSIDY_FIELDS
    elif role == "bank_officer":
        ALLOWED_FIELDS = BANK_FIELDS
    elif role == "agency_officer":
        ALLOWED_FIELDS = SUBSIDY_FIELDS
    elif role == "agronomist":
        ALLOWED_FIELDS = {"agronomist_recommendations", "plantation_date", "seedlings_count"}
    else:
        ALLOWED_FIELDS = set()

    updates = body.updates
    applied = []
    for key, value in updates.items():
        if key in ALLOWED_FIELDS and hasattr(project, key):
            setattr(project, key, value)
            applied.append(key)

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
        ).first()
        if not mapping:
            raise HTTPException(status_code=403, detail="Dealers can only manage their own farmers as co-applicants.")

    db.delete(record)
    db.commit()
    return {"message": f"Farmer {farmer_id} removed from project {project_id} co-applicants."}
