"""
ICON APP - Users & Staff Router
Full CRUD with JWT-based role-enforcement.

Permissions:
  GET /         → admin, owner, office_staff, project_manager (dealer sees only farmers)
  GET /{id}     → any authenticated user (dealer restricted to farmers)
  POST /        → admin, owner, office_staff, dealer (dealer: farmers only)
  PUT /{id}     → admin, owner (self-update allowed for all)
  DELETE /{id}  → admin, owner only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import get_current_user, require_roles, is_admin, ADMIN_ROLES, STAFF_ROLES
import models, schemas
from routers.auth import hash_password

router = APIRouter(prefix="/users", tags=["Users & Staff"])


# ─── Optional update schema (all fields optional) ─────────────────────────────
class PersonUpdate(BaseModel):
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
    firm_name:       Optional[str] = None
    gst_number:      Optional[str] = None
    land_area:       Optional[float] = None
    designation:     Optional[str] = None
    remarks:         Optional[str] = None
    is_active:       Optional[int] = None
    # Admin can also reset password via this endpoint
    new_password:    Optional[str] = None


# ─── LIST ─────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[schemas.PersonResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    List users.
    - Dealers may only see farmers.
    - Farmers and contractors may not list all users.
    - Staff, admin, owner, project_manager see everyone (optionally filtered by role).
    """
    ALLOWED_TO_LIST = ADMIN_ROLES | {"office_staff", "project_manager", "bank_officer",
                                     "agency_officer", "agronomist", "dealer"}
    if current_user.role not in ALLOWED_TO_LIST:
        raise HTTPException(status_code=403, detail="Not authorized to list users.")

    query = db.query(models.Person)

    if current_user.role == "dealer":
        # Dealers may only see farmers linked to them
        dealer_farmer_ids = [
            m.farmer_id for m in
            db.query(models.DealerFarmerMapping)
              .filter(models.DealerFarmerMapping.dealer_id == current_user.id,
                      models.DealerFarmerMapping.is_active == 1).all()
        ]
        query = query.filter(models.Person.id.in_(dealer_farmer_ids))
    elif role:
        query = query.filter(models.Person.role == role)

    return query.offset(skip).limit(limit).all()


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{user_id}", response_model=schemas.PersonResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Get a single user.
    - Anyone can see their own record.
    - Dealers can only view farmers in their network.
    - Farmers/contractors cannot view other users.
    """
    user = db.query(models.Person).filter(models.Person.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Self-access always allowed
    if current_user.id == user_id:
        return user

    OPEN_ROLES = ADMIN_ROLES | {"office_staff", "project_manager", "bank_officer", "agency_officer", "agronomist"}
    if current_user.role in OPEN_ROLES:
        return user

    if current_user.role == "dealer":
        mapping = db.query(models.DealerFarmerMapping).filter(
            models.DealerFarmerMapping.dealer_id == current_user.id,
            models.DealerFarmerMapping.farmer_id == user_id,
            models.DealerFarmerMapping.is_active == 1,
        ).first()
        if mapping and user.role == "farmer":
            return user
        raise HTTPException(status_code=403, detail="Dealers can only view their own farmers.")

    raise HTTPException(status_code=403, detail="Access denied.")


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=schemas.PersonResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: schemas.PersonCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Create a new Person record.
    - admin/owner: any role.
    - office_staff: any non-admin role.
    - dealer: farmers only.
    - Others: forbidden.
    """
    ALLOWED = ADMIN_ROLES | {"office_staff", "dealer"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to create users.")

    if current_user.role == "dealer" and user.role != "farmer":
        raise HTTPException(status_code=403, detail="Dealers can only add farmers.")

    if current_user.role == "office_staff" and user.role in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Office staff cannot create admin accounts.")

    if db.query(models.Person).filter(models.Person.phone_primary == user.phone_primary).first():
        raise HTTPException(status_code=400, detail="Phone number already registered.")

    user_data = user.model_dump(exclude={"password"})
    new_user = models.Person(**user_data)
    # Set default hashed password
    new_user.hashed_password = hash_password("icon123")

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-map if created by a dealer
    if current_user.role == "dealer" and new_user.role == "farmer":
        from datetime import date
        mapping = models.DealerFarmerMapping(dealer_id=current_user.id, farmer_id=new_user.id, assigned_date=date.today())
        db.add(mapping)
        db.commit()

    return new_user


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{user_id}", response_model=schemas.PersonResponse)
def update_user(
    user_id: int,
    updates: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Update a user record.
    - admin/owner: any user.
    - Any user: their own profile (cannot change role or is_active).
    - Others: forbidden.
    """
    user = db.query(models.Person).filter(models.Person.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    is_self = current_user.id == user_id
    is_admin_user = current_user.role in ADMIN_ROLES

    if not is_self and not is_admin_user:
        raise HTTPException(status_code=403, detail="You can only update your own profile.")

    update_data = updates.model_dump(exclude_none=True)

    # Non-admins cannot change role or active status
    if not is_admin_user:
        update_data.pop("is_active", None)

    # Handle password reset
    new_password = update_data.pop("new_password", None)
    if new_password:
        if not is_admin_user and not is_self:
            raise HTTPException(status_code=403, detail="Cannot reset another user's password.")
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        user.hashed_password = hash_password(new_password)

    farmer_keys = {"aadhaar_number", "pan_number", "land_area"}
    business_keys = {"firm_name", "gst_number"}
    employee_keys = {"designation"}

    if any(k in update_data for k in farmer_keys):
        if not getattr(user, 'farmer_profile', None):
            db.add(models.FarmerProfile(person_id=user.id))
            db.flush()
        for k in farmer_keys:
            if k in update_data: setattr(user.farmer_profile, k, update_data.pop(k))

    if any(k in update_data for k in business_keys):
        if not getattr(user, 'business_profile', None):
            db.add(models.BusinessProfile(person_id=user.id))
            db.flush()
        for k in business_keys:
            if k in update_data: setattr(user.business_profile, k, update_data.pop(k))

    if any(k in update_data for k in employee_keys):
        if not getattr(user, 'employee_profile', None):
            db.add(models.EmployeeProfile(person_id=user.id))
            db.flush()
        for k in employee_keys:
            if k in update_data: setattr(user.employee_profile, k, update_data.pop(k))

    for key, value in update_data.items():
        if hasattr(user, key):
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{user_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Delete a user. Admin/Owner only. Cannot delete yourself."""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    user = db.query(models.Person).filter(models.Person.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Soft-delete: deactivate instead of hard delete to preserve audit trail
    user.is_active = 0
    db.commit()
    return {"message": f"User {user.first_name} (ID {user_id}) has been deactivated."}


# ─── HARD DELETE (owner only) ─────────────────────────────────────────────────
@router.delete("/{user_id}/permanent", dependencies=[Depends(require_roles("owner"))])
def hard_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Permanently delete a user. Owner only. Cannot delete yourself — this is
    the irreversible path, so the self-delete guard matters even more here
    than on the soft-delete endpoint (no recovery, and could strand the system
    with no owner left)."""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot permanently delete your own account.")

    user = db.query(models.Person).filter(models.Person.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()
    return {"message": f"User ID {user_id} permanently deleted."}
