"""
ICON APP - Farmers & KYC Router
Full CRUD with JWT role-based access.

Permissions:
  GET /farmers/           → admin, owner, office_staff, project_manager, dealer (own farmers)
  GET /farmers/{id}       → admin, owner, office_staff, dealer (own), farmer (self)
  POST /farmers/          → admin, owner, office_staff, dealer
  PUT /farmers/{id}       → admin, owner, office_staff
  DELETE /farmers/{id}    → admin, owner only
  POST /register          → admin, owner, office_staff, dealer
  POST /dealer-mapping    → admin, owner only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from collections import defaultdict
from datetime import datetime, timedelta
from database import get_db
from auth_dep import get_current_user, require_roles, ADMIN_ROLES, STAFF_ROLES
import models, schemas

router = APIRouter(prefix="/farmers", tags=["Farmers & KYC"])


# ─── FARMER STATS ─────────────────────────────────────────────────────────────
@router.get("/stats")
def get_farmer_stats(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Aggregate KPIs and breakdown data for the Farmer Management dashboard."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager", "bank_officer", "agency_officer", "agronomist"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")

    farmers = db.query(models.Person).filter(models.Person.role == "farmer").all()

    total       = len(farmers)
    active      = sum(1 for f in farmers if f.is_active == 1)
    inactive    = total - active
    with_aadhaar = sum(1 for f in farmers if getattr(f, 'farmer_profile', None) and f.farmer_profile.aadhaar_number)
    with_pan     = sum(1 for f in farmers if getattr(f, 'farmer_profile', None) and f.farmer_profile.pan_number)
    with_land    = sum(1 for f in farmers if getattr(f, 'farmer_profile', None) and f.farmer_profile.land_area)
    total_land   = sum((f.farmer_profile.land_area or 0) if getattr(f, 'farmer_profile', None) else 0 for f in farmers)
    with_project = len(set(
        p.farmer_id for p in db.query(models.Project)
            .filter(models.Project.farmer_id.isnot(None)).all()
    ))
    kyc_complete = sum(1 for f in farmers if getattr(f, 'farmer_profile', None) and f.farmer_profile.aadhaar_number and f.farmer_profile.pan_number)

    # District breakdown (top 10)
    dist_counts: dict = defaultdict(int)
    for f in farmers:
        dist_name = f.village.taluka.district.name if getattr(f, 'village', None) else "Unknown"
        dist_counts[dist_name] += 1
    district_breakdown = sorted(
        [{"district": d, "count": c} for d, c in dist_counts.items()],
        key=lambda x: -x["count"]
    )[:10]

    # Monthly onboarding — last 6 months
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly: dict = defaultdict(int)
    for f in farmers:
        if f.created_at and f.created_at >= six_months_ago:
            month_key = f.created_at.strftime("%b %Y")
            monthly[month_key] += 1
    # Build sorted list for last 6 months
    month_list = []
    for i in range(5, -1, -1):
        dt = datetime.now() - timedelta(days=30 * i)
        key = dt.strftime("%b %Y")
        month_list.append({"month": key, "count": monthly.get(key, 0)})

    # Top 5 farmers by land area
    top_by_land = sorted(
        [f for f in farmers if getattr(f, 'farmer_profile', None) and f.farmer_profile.land_area],
        key=lambda f: -(f.farmer_profile.land_area or 0)
    )[:5]

    return {
        "total_farmers":     total,
        "active_farmers":    active,
        "inactive_farmers":  inactive,
        "with_project":      with_project,
        "kyc_complete":      kyc_complete,
        "kyc_pct":           round(kyc_complete / total * 100) if total else 0,
        "with_aadhaar":      with_aadhaar,
        "with_pan":          with_pan,
        "with_land":         with_land,
        "total_land_sqm":    round(total_land),
        "avg_land_sqm":      round(total_land / with_land) if with_land else 0,
        "district_breakdown": district_breakdown,
        "monthly_onboarding": month_list,
        "top_by_land": [
            {"name": f"{f.first_name} {f.last_name or ''}".strip(),
             "district": f.village.taluka.district.name if getattr(f, 'village', None) else "—",
             "land_area": f.farmer_profile.land_area if getattr(f, 'farmer_profile', None) else None,
             "land_unit": f.farmer_profile.land_unit if getattr(f, 'farmer_profile', None) else "SQM"}
            for f in top_by_land
        ],
    }


# ─── Farmer update schema ─────────────────────────────────────────────────────
class FarmerUpdate(BaseModel):
    first_name:      Optional[str] = None
    last_name:       Optional[str] = None
    full_name:       Optional[str] = None
    phone_secondary: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email:           Optional[str] = None
    address_line1:   Optional[str] = None
    address_line2:   Optional[str] = None
    village_id:      Optional[int] = None
    aadhaar_number:  Optional[str] = None
    pan_number:      Optional[str] = None
    land_area:       Optional[float] = None
    land_unit:       Optional[str] = None
    remarks:         Optional[str] = None
    is_active:       Optional[int] = None


# ─── LIST FARMERS ─────────────────────────────────────────────────────────────
@router.get("/", response_model=List[schemas.PersonResponse])
def list_farmers(
    skip: int = 0,
    limit: int = 100,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all farmers. Dealers see only their own farmers."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager", "dealer", "bank_officer", "agency_officer", "agronomist"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to list farmers.")

    query = db.query(models.Person).filter(models.Person.role == "farmer")

    if current_user.role == "dealer":
        dealer_farmer_ids = [
            m.farmer_id for m in
            db.query(models.DealerFarmerMapping)
              .filter(models.DealerFarmerMapping.dealer_id == current_user.id).all()
        ]
        query = query.filter(models.Person.id.in_(dealer_farmer_ids))

    if district:
        query = query.join(models.Person.village).join(models.Village.taluka).join(models.Taluka.district).filter(models.District.name.ilike(f"%{district}%"))

    return query.offset(skip).limit(limit).all()


# ─── GET FARMER ───────────────────────────────────────────────────────────────
@router.get("/{farmer_id}", response_model=schemas.PersonResponse)
def get_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get farmer details. Farmer can view themselves. Dealer can view own farmers."""
    farmer = db.query(models.Person).filter(
        models.Person.id == farmer_id,
        models.Person.role == "farmer",
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")

    # Self-access
    if current_user.id == farmer_id:
        return farmer

    OPEN_ROLES = ADMIN_ROLES | {"office_staff", "project_manager", "bank_officer", "agency_officer", "agronomist"}
    if current_user.role in OPEN_ROLES:
        return farmer

    if current_user.role == "dealer":
        mapping = db.query(models.DealerFarmerMapping).filter(
            models.DealerFarmerMapping.dealer_id == current_user.id,
            models.DealerFarmerMapping.farmer_id == farmer_id,
        ).first()
        if mapping:
            return farmer
        raise HTTPException(status_code=403, detail="Access denied to this farmer.")

    raise HTTPException(status_code=403, detail="Access denied.")


# ─── UPDATE FARMER ────────────────────────────────────────────────────────────
@router.put("/{farmer_id}", response_model=schemas.PersonResponse)
def update_farmer(
    farmer_id: int,
    updates: FarmerUpdate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Update farmer KYC details. Admin, owner, office_staff, and dealer (own)."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "dealer"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to update farmer records.")

    farmer = db.query(models.Person).filter(
        models.Person.id == farmer_id,
        models.Person.role == "farmer",
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")

    if current_user.role == "dealer":
        mapping = db.query(models.DealerFarmerMapping).filter(
            models.DealerFarmerMapping.dealer_id == current_user.id,
            models.DealerFarmerMapping.farmer_id == farmer_id,
        ).first()
        if not mapping:
            raise HTTPException(status_code=403, detail="Dealers can only edit their own farmers.")

    update_data = updates.model_dump(exclude_none=True)
    # Non-admins cannot change active status
    if current_user.role == "office_staff":
        update_data.pop("is_active", None)

    profile_keys = ["aadhaar_number", "pan_number", "land_area", "land_unit"]
    
    if any(k in update_data for k in profile_keys) and not getattr(farmer, 'farmer_profile', None):
        new_profile = models.FarmerProfile(person_id=farmer.id)
        db.add(new_profile)
        db.flush()
    
    for key, value in update_data.items():
        if key in profile_keys:
            setattr(farmer.farmer_profile, key, value)
        elif hasattr(farmer, key):
            setattr(farmer, key, value)

    db.commit()
    db.refresh(farmer)
    return farmer


# ─── DELETE FARMER ────────────────────────────────────────────────────────────
@router.delete("/{farmer_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_farmer(farmer_id: int, db: Session = Depends(get_db)):
    """Soft-delete a farmer. Admin/Owner only."""
    farmer = db.query(models.Person).filter(
        models.Person.id == farmer_id,
        models.Person.role == "farmer",
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found.")

    farmer.is_active = 0
    db.commit()
    return {"message": f"Farmer {farmer.first_name} (ID {farmer_id}) deactivated."}


# ─── REGISTER FARMER (KYC) ────────────────────────────────────────────────────
@router.post("/register", response_model=schemas.FarmerRegistrationResponse)
def register_farmer(
    registration: schemas.FarmerRegistrationCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Create a KYC registration record for a farmer."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "dealer"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to register farmers.")

    if not db.query(models.Person).filter(models.Person.id == registration.farmer_id).first():
        raise HTTPException(status_code=404, detail="Farmer person record not found.")
    if not db.query(models.Person).filter(models.Person.id == registration.registered_by).first():
        raise HTTPException(status_code=404, detail="Registrar not found.")

    # Dealers can only register their own farmers
    if current_user.role == "dealer":
        mapping = db.query(models.DealerFarmerMapping).filter(
            models.DealerFarmerMapping.dealer_id == current_user.id,
            models.DealerFarmerMapping.farmer_id == registration.farmer_id,
        ).first()
        if not mapping:
            raise HTTPException(status_code=403, detail="Dealer can only register their own farmers.")

    new_reg = models.FarmerRegistration(**registration.model_dump())
    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)
    return new_reg


# ─── DEALER-FARMER MAPPING ────────────────────────────────────────────────────
@router.post("/dealer-mapping", response_model=schemas.DealerFarmerMappingResponse)
def assign_farmer_to_dealer(
    mapping: schemas.DealerFarmerMappingCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(
        require_roles("admin", "owner")
    ),
):
    """Map a farmer to a dealer. Admin/Owner only."""
    new_map = models.DealerFarmerMapping(**mapping.model_dump())
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    return new_map


# ─── LIST DEALER-FARMER MAPPINGS ──────────────────────────────────────────────
@router.get("/dealer-mapping/list")
def list_dealer_mappings(
    dealer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List dealer-farmer mappings. Admin sees all; dealer sees their own."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "dealer"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")

    query = db.query(models.DealerFarmerMapping)
    if current_user.role == "dealer":
        query = query.filter(models.DealerFarmerMapping.dealer_id == current_user.id)
    elif dealer_id:
        query = query.filter(models.DealerFarmerMapping.dealer_id == dealer_id)

    return query.all()
