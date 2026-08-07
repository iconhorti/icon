"""
ICON APP - Agronomist field operations (mobile parity).
Farms are projects; farm_id == project_id.
"""
import json
from datetime import date, datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from auth_dep import get_current_user, assert_project_access, accessible_project_filter, ADMIN_ROLES
from database import get_db
from field_photos import save_base64_photos
from idempotency import get_cached, save_cached
import models

router = APIRouter(prefix="/agronomist", tags=["Agronomist"])

AGRONOMIST_ROLES = ADMIN_ROLES | {"agronomist", "office_staff", "project_manager"}


class MobilePhoto(BaseModel):
    slot: str
    data: str


class AssessmentCreate(BaseModel):
    crop_stage: str = ""
    plant_height: float = 0
    canopy_pct: float = 0
    pests: list[dict[str, Any]] = []
    diseases: list[dict[str, Any]] = []
    nutrients: str = ""
    photos: list[MobilePhoto] = []
    submitted_at: Optional[str] = None


class VisitReportCreate(BaseModel):
    findings_summary: str = ""
    recommendations: list[str] = []
    next_visit_date: Optional[str] = None
    farmer_otp: Optional[str] = None
    photos: list[MobilePhoto] = []
    submitted_at: Optional[str] = None


def _days_after_planting(project: models.Project) -> int:
    start = project.actual_start_date or (project.created_at.date() if project.created_at else date.today())
    return max(0, (date.today() - start).days)


def _farm_dict(project: models.Project, last_visit: Optional[date]) -> dict:
    farmer = project.farmer
    village = project.village
    district_name = village.taluka.district.name if village and village.taluka and village.taluka.district else "—"
    village_name = village.name if village else "—"
    acres = round((project.land_area or 0) / 4046.86, 2) if project.land_area else 0
    return {
        "id":           project.id,
        "project_id":   project.id,
        "farmer_name":  f"{farmer.first_name} {farmer.last_name or ''}".strip() if farmer else "—",
        "village":      village_name,
        "district":     district_name,
        "crop_type":    project.crop_category or "Grapes",
        "dap":          _days_after_planting(project),
        "area_acres":   acres,
        "last_visit":   last_visit.isoformat() if last_visit else None,
        "alert_level":  "none",
    }


@router.get("/farms")
def list_farms(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    if current_user.role not in AGRONOMIST_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized.")

    query = (
        db.query(models.Project)
        .options(
            joinedload(models.Project.farmer),
            joinedload(models.Project.village).joinedload(models.Village.taluka).joinedload(models.Taluka.district),
        )
        .filter(models.Project.project_stage.notin_(["completed", "subsidy_released", "draft"]))
    )
    access_filter = accessible_project_filter(current_user, db)
    if access_filter is not None:
        query = query.filter(access_filter)

    projects = query.order_by(models.Project.updated_at.desc()).limit(200).all()

    last_visits: dict[int, date] = {}
    if projects:
        pids = [p.id for p in projects]
        rows = (
            db.query(models.AgronomistConsultation.project_id, models.AgronomistConsultation.consultation_date)
            .filter(models.AgronomistConsultation.project_id.in_(pids))
            .order_by(models.AgronomistConsultation.consultation_date.desc())
            .all()
        )
        for pid, cdate in rows:
            if pid not in last_visits:
                last_visits[pid] = cdate

    return [_farm_dict(p, last_visits.get(p.id)) for p in projects]


@router.post("/farms/{farm_id}/assessment", status_code=status.HTTP_201_CREATED)
def submit_assessment(
    farm_id: int,
    body: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    route = f"/agronomist/farms/{farm_id}/assessment"
    if idempotency_key:
        cached = get_cached(db, idempotency_key)
        if cached:
            code, payload = cached
            return JSONResponse(content=payload, status_code=code)

    if current_user.role not in AGRONOMIST_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized.")

    project = db.query(models.Project).filter(models.Project.id == farm_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Farm not found.")
    assert_project_access(project, current_user, db)

    photo_paths = save_base64_photos(farm_id, [p.model_dump() for p in body.photos], "assessments")
    record = models.AgronomistConsultation(
        project_id=farm_id,
        agronomist_id=current_user.id,
        consultation_date=date.today(),
        crop_advice=json.dumps({
            "type": "health_assessment",
            "crop_stage": body.crop_stage,
            "plant_height": body.plant_height,
            "canopy_pct": body.canopy_pct,
            "nutrients": body.nutrients,
            "photos": photo_paths,
            "submitted_at": body.submitted_at,
        }, ensure_ascii=False),
        pest_control_measures=json.dumps({
            "pests": body.pests,
            "diseases": body.diseases,
        }, ensure_ascii=False),
        remarks="health_assessment",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    result = {"id": record.id}
    if idempotency_key:
        save_cached(db, idempotency_key, route, status.HTTP_201_CREATED, result)
    return result


@router.post("/farms/{farm_id}/visit-report", status_code=status.HTTP_201_CREATED)
def submit_visit_report(
    farm_id: int,
    body: VisitReportCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    route = f"/agronomist/farms/{farm_id}/visit-report"
    if idempotency_key:
        cached = get_cached(db, idempotency_key)
        if cached:
            code, payload = cached
            return JSONResponse(content=payload, status_code=code)

    if current_user.role not in AGRONOMIST_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized.")

    project = db.query(models.Project).filter(models.Project.id == farm_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Farm not found.")
    assert_project_access(project, current_user, db)

    photo_paths = save_base64_photos(farm_id, [p.model_dump() for p in body.photos], "visit_reports")
    follow_up = None
    if body.next_visit_date:
        try:
            follow_up = date.fromisoformat(body.next_visit_date[:10])
        except ValueError:
            pass

    record = models.AgronomistConsultation(
        project_id=farm_id,
        agronomist_id=current_user.id,
        consultation_date=date.today(),
        crop_advice=body.findings_summary,
        fertilizer_recommendations=json.dumps(body.recommendations, ensure_ascii=False),
        follow_up_date=follow_up,
        remarks=json.dumps({
            "type": "visit_report",
            "farmer_otp": body.farmer_otp,
            "photos": photo_paths,
            "submitted_at": body.submitted_at,
        }, ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    result = {"id": record.id}
    if idempotency_key:
        save_cached(db, idempotency_key, route, status.HTTP_201_CREATED, result)
    return result
