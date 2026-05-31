"""
ICON APP - Site Visits & Field Operations Router
Role-based CRUD.

Permissions:
  GET /project/{id}  → admin, owner, office_staff, project_manager, dealer (own)
  GET /{id}          → admin, owner, office_staff, project_manager
  POST /             → admin, owner, project_manager (field staff)
  PUT /{id}          → admin, owner, project_manager (only own visit)
  DELETE /{id}       → admin, owner only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import get_current_user, require_roles, ADMIN_ROLES
import models, schemas

router = APIRouter(prefix="/site-visits", tags=["Field Operations"])


# ─── Update Schema ─────────────────────────────────────────────────────────────
class SiteVisitUpdate(BaseModel):
    visit_date:         Optional[str]   = None
    visit_type:         Optional[str]   = None
    work_status:        Optional[str]   = None
    laborers_present:   Optional[int]   = None
    materials_status:   Optional[str]   = None
    quality_issues:     Optional[str]   = None
    actions_taken:      Optional[str]   = None
    follow_up_required: Optional[int]   = None
    follow_up_date:     Optional[str]   = None
    remarks:            Optional[str]   = None
    location_verified:  Optional[int]   = None


# ─── LIST BY PROJECT ──────────────────────────────────────────────────────────
@router.get("/project/{project_id}", response_model=List[schemas.SiteVisitResponse])
def get_project_visits(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get all site visits for a project."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager", "dealer", "bank_officer", "agency_officer", "agronomist"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to view site visits.")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    from auth_dep import assert_project_access
    assert_project_access(project, current_user, db)

    return db.query(models.SiteVisit).filter(
        models.SiteVisit.project_id == project_id
    ).order_by(models.SiteVisit.visit_date.desc()).all()


# ─── GET SINGLE VISIT ─────────────────────────────────────────────────────────
@router.get("/{visit_id}", response_model=schemas.SiteVisitResponse)
def get_site_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get a single site visit record."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager", "agency_officer"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")

    visit = db.query(models.SiteVisit).filter(models.SiteVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found.")
    return visit


# ─── CREATE VISIT ─────────────────────────────────────────────────────────────
@router.post("/", response_model=schemas.SiteVisitResponse, status_code=status.HTTP_201_CREATED)
def log_site_visit(
    visit: schemas.SiteVisitCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Log a new site visit. Admin, owner, project_manager, office_staff."""
    ALLOWED = ADMIN_ROLES | {"project_manager", "office_staff", "agronomist"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to log site visits.")

    project = db.query(models.Project).filter(models.Project.id == visit.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    new_visit = models.SiteVisit(**visit.model_dump())
    db.add(new_visit)

    # Update project denormalized fields
    if hasattr(project, "last_site_visit_date"):
        project.last_site_visit_date = visit.visit_date
    if hasattr(project, "last_site_visit_by"):
        project.last_site_visit_by = visit.visited_by
    if hasattr(project, "site_visit_count"):
        project.site_visit_count = (project.site_visit_count or 0) + 1

    db.commit()
    db.refresh(new_visit)
    return new_visit


# ─── UPDATE VISIT ─────────────────────────────────────────────────────────────
@router.put("/{visit_id}")
def update_site_visit(
    visit_id: int,
    updates: SiteVisitUpdate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Update a site visit.
    - admin/owner: any visit.
    - project_manager: only visits they created.
    """
    ALLOWED = ADMIN_ROLES | {"project_manager", "office_staff"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to update site visits.")

    visit = db.query(models.SiteVisit).filter(models.SiteVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found.")

    # Project managers can only update their own visits
    if current_user.role == "project_manager" and visit.visited_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own site visit reports.")

    update_data = updates.model_dump(exclude_none=True)
    for key, value in update_data.items():
        if hasattr(visit, key):
            setattr(visit, key, value)

    db.commit()
    return {"message": "Site visit updated successfully."}


# ─── DELETE VISIT ─────────────────────────────────────────────────────────────
@router.delete("/{visit_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_site_visit(visit_id: int, db: Session = Depends(get_db)):
    """Delete a site visit. Admin/Owner only."""
    visit = db.query(models.SiteVisit).filter(models.SiteVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found.")
    db.delete(visit)
    db.commit()
    return {"message": f"Site visit ID {visit_id} deleted."}
