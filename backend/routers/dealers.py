"""
ICON APP - Dealers Router
Dealer management: list, detail, stats, farmer assignments, project summary.
Access: admin/owner/office_staff see all; dealer sees only themselves.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from auth_dep import get_current_user, require_roles, ADMIN_ROLES
import models

router = APIRouter(prefix="/dealers", tags=["Dealers"])


def _is_admin(user: models.Person) -> bool:
    return user.role in ADMIN_ROLES | {"office_staff", "project_manager"}


# ─── List all dealers ─────────────────────────────────────────────────────────
@router.get("/")
def list_dealers(
    skip: int = 0,
    limit: int = 100,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all dealers. Admins/staff see all; a dealer sees only themselves."""
    if not _is_admin(current_user) and current_user.role != "dealer":
        raise HTTPException(status_code=403, detail="Access denied.")

    query = db.query(models.Person).filter(models.Person.role == "dealer", models.Person.is_active == 1)

    if district:
        query = query.join(models.Person.village).join(models.Village.taluka).join(models.Taluka.district).filter(models.District.name == district)

    if current_user.role == "dealer":
        query = query.filter(models.Person.id == current_user.id)

    dealers = query.offset(skip).limit(limit).all()
    dealer_ids = [d.id for d in dealers]

    # Grouped counts in 2 queries total instead of 2 queries per dealer
    # (was 2N queries for N dealers — see dashboard.py for the same pattern).
    farmer_counts: dict = {}
    project_counts: dict = {}
    if dealer_ids:
        farmer_counts = dict(
            db.query(models.DealerFarmerMapping.dealer_id, func.count(models.DealerFarmerMapping.id))
            .filter(
                models.DealerFarmerMapping.dealer_id.in_(dealer_ids),
                models.DealerFarmerMapping.is_active == 1,
            )
            .group_by(models.DealerFarmerMapping.dealer_id)
            .all()
        )
        project_counts = dict(
            db.query(models.Project.dealer_id, func.count(models.Project.id))
            .filter(models.Project.dealer_id.in_(dealer_ids))
            .group_by(models.Project.dealer_id)
            .all()
        )

    results = []
    for d in dealers:
        farmer_count  = farmer_counts.get(d.id, 0)
        project_count = project_counts.get(d.id, 0)
        results.append({
            "id":            d.id,
            "first_name":    d.first_name,
            "last_name":     d.last_name,
            "full_name":     d.full_name or f"{d.first_name} {d.last_name or ''}".strip(),
            "phone_primary": d.phone_primary,
            "email":         d.email,
            "firm_name":     d.business_profile.firm_name if getattr(d, 'business_profile', None) else None,
            "district":      d.village.taluka.district.name if getattr(d, 'village', None) else None,
            "state":         "Maharashtra" if getattr(d, 'village', None) else None,
            "is_active":     d.is_active,
            "farmer_count":  farmer_count,
            "project_count": project_count,
        })
    return results


# ─── Get single dealer ────────────────────────────────────────────────────────
@router.get("/{dealer_id}")
def get_dealer(
    dealer_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get dealer profile + stats. Dealer can only see themselves."""
    if current_user.role == "dealer" and current_user.id != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not _is_admin(current_user) and current_user.role != "dealer":
        raise HTTPException(status_code=403, detail="Access denied.")

    dealer = db.query(models.Person).filter(
        models.Person.id == dealer_id,
        models.Person.role == "dealer",
    ).first()
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found.")

    mappings      = db.query(models.DealerFarmerMapping).filter(
        models.DealerFarmerMapping.dealer_id == dealer_id,
        models.DealerFarmerMapping.is_active == 1,
    ).all()
    farmer_ids    = [m.farmer_id for m in mappings]
    project_count = db.query(models.Project).filter(models.Project.dealer_id == dealer_id).count()

    return {
        "id":            dealer.id,
        "first_name":    dealer.first_name,
        "last_name":     dealer.last_name,
        "full_name":     dealer.full_name or f"{dealer.first_name} {dealer.last_name or ''}".strip(),
        "phone_primary": dealer.phone_primary,
        "phone_secondary": dealer.phone_secondary,
        "email":         dealer.email,
        "firm_name":     dealer.business_profile.firm_name if getattr(dealer, 'business_profile', None) else None,
        "gst_number":    dealer.business_profile.gst_number if getattr(dealer, 'business_profile', None) else None,
        "address_line1": dealer.address_line1,
        "village":       dealer.village.name if getattr(dealer, 'village', None) else None,
        "district":      dealer.village.taluka.district.name if getattr(dealer, 'village', None) else None,
        "state":         "Maharashtra",
        "pincode":       dealer.village.pincode if getattr(dealer, 'village', None) else None,
        "is_active":     dealer.is_active,
        "farmer_count":  len(farmer_ids),
        "project_count": project_count,
    }


# ─── List farmers under a dealer ─────────────────────────────────────────────
@router.get("/{dealer_id}/farmers")
def get_dealer_farmers(
    dealer_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all farmers assigned to a dealer."""
    if current_user.role == "dealer" and current_user.id != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not _is_admin(current_user) and current_user.role != "dealer":
        raise HTTPException(status_code=403, detail="Access denied.")

    mappings = db.query(models.DealerFarmerMapping).filter(
        models.DealerFarmerMapping.dealer_id == dealer_id,
        models.DealerFarmerMapping.is_active == 1,
    ).all()
    farmer_ids = [m.farmer_id for m in mappings]

    # Batch-fetch farmers + their dealer projects (was 2 queries per mapping —
    # one for the farmer, one for their project — i.e. 2N queries for N farmers).
    farmers_by_id: dict = {}
    projects_by_farmer: dict = {}
    if farmer_ids:
        farmers_by_id = {
            f.id: f for f in
            db.query(models.Person).filter(models.Person.id.in_(farmer_ids)).all()
        }
        for p in db.query(models.Project).filter(
            models.Project.farmer_id.in_(farmer_ids),
            models.Project.dealer_id == dealer_id,
        ).all():
            projects_by_farmer.setdefault(p.farmer_id, p)

    results = []
    for m in mappings:
        farmer = farmers_by_id.get(m.farmer_id)
        if not farmer:
            continue
        project = projects_by_farmer.get(farmer.id)
        results.append({
            "farmer_id":        farmer.id,
            "first_name":       farmer.first_name,
            "last_name":        farmer.last_name,
            "phone_primary":    farmer.phone_primary,
            "district":         farmer.village.taluka.district.name if getattr(farmer, 'village', None) else None,
            "is_active":        farmer.is_active,
            "assigned_date":    str(m.assigned_date) if m.assigned_date else None,
            "project_id":       project.id if project else None,
            "project_code":     project.project_code if project else None,
            "project_stage":    project.project_stage if project else None,
        })
    return results


# ─── List projects under a dealer ────────────────────────────────────────────
@router.get("/{dealer_id}/projects")
def get_dealer_projects(
    dealer_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all projects associated with a dealer."""
    if current_user.role == "dealer" and current_user.id != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not _is_admin(current_user) and current_user.role != "dealer":
        raise HTTPException(status_code=403, detail="Access denied.")

    projects = db.query(models.Project).filter(models.Project.dealer_id == dealer_id).all()

    return [
        {
            "id":            p.id,
            "project_code":  p.project_code,
            "farmer_name":   p.farmer.first_name if getattr(p, 'farmer', None) else "—",
            "project_stage": p.project_stage,
            "district":      p.village.taluka.district.name if getattr(p, 'village', None) else None,
            "land_area":     p.land_area,
            "created_at":    str(p.created_at)[:10] if p.created_at else None,
        }
        for p in projects
    ]


# ─── Dealer summary stats ─────────────────────────────────────────────────────
@router.get("/{dealer_id}/stats")
def get_dealer_stats(
    dealer_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Aggregate stats for a dealer."""
    if current_user.role == "dealer" and current_user.id != dealer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if not _is_admin(current_user) and current_user.role != "dealer":
        raise HTTPException(status_code=403, detail="Access denied.")

    farmer_count  = db.query(models.DealerFarmerMapping).filter(
        models.DealerFarmerMapping.dealer_id == dealer_id,
        models.DealerFarmerMapping.is_active == 1,
    ).count()

    projects      = db.query(models.Project).filter(models.Project.dealer_id == dealer_id).all()
    active_projects    = sum(1 for p in projects if p.project_stage not in ("completed", "cancelled"))
    completed_projects = sum(1 for p in projects if p.project_stage == "completed")

    return {
        "dealer_id":          dealer_id,
        "total_farmers":      farmer_count,
        "total_projects":     len(projects),
        "active_projects":    active_projects,
        "completed_projects": completed_projects,
    }
