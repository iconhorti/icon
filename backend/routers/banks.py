"""
ICON APP - Banks Router
Role-based CRUD.

Permissions:
  GET /                → all authenticated users (reference data)
  GET /branches        → all authenticated users
  POST /               → admin, owner only
  PUT /{id}            → admin, owner only
  DELETE /{id}         → admin, owner only
  POST /branches       → admin, owner only
  PUT /branches/{id}   → admin, owner only
  DELETE /branches/{id}→ admin, owner only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import get_current_user, require_roles
import models, schemas

router = APIRouter(prefix="/banks", tags=["Banks"])


# ─── Update schemas ────────────────────────────────────────────────────────────
class BankUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None

class BranchUpdate(BaseModel):
    branch_name: Optional[str] = None
    branch_code: Optional[str] = None
    ifsc:        Optional[str] = None
    address:     Optional[str] = None
    village_id:  Optional[int] = None
    phone:       Optional[str] = None
    email:       Optional[str] = None


# ─── BANKS ────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[schemas.BankResponse])
def get_banks(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all banks. All authenticated users."""
    return db.query(models.Bank).all()


@router.post("/", response_model=schemas.BankResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_bank(bank: schemas.BankCreate, db: Session = Depends(get_db)):
    """Create a bank. Admin/Owner only."""
    existing = db.query(models.Bank).filter(models.Bank.name == bank.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bank with this name already exists.")
    new_bank = models.Bank(**bank.model_dump())
    db.add(new_bank)
    db.commit()
    db.refresh(new_bank)
    return new_bank


@router.put("/{bank_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def update_bank(bank_id: int, updates: BankUpdate, db: Session = Depends(get_db)):
    """Update a bank record. Admin/Owner only."""
    bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found.")
    if updates.name:
        bank.name = updates.name
    if updates.short_name is not None:
        bank.short_name = updates.short_name
    db.commit()
    return {"message": "Bank updated."}


@router.delete("/{bank_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_bank(bank_id: int, db: Session = Depends(get_db)):
    """Delete a bank. Admin/Owner only."""
    bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found.")
    db.delete(bank)
    db.commit()
    return {"message": f"Bank ID {bank_id} deleted."}


# ─── BRANCHES ─────────────────────────────────────────────────────────────────
@router.get("/branches", response_model=List[schemas.BankBranchResponse])
def get_bank_branches(
    bank_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List bank branches. All authenticated users."""
    query = db.query(models.BankBranch)
    if bank_id:
        query = query.filter(models.BankBranch.bank_id == bank_id)
    return query.all()


@router.post("/branches", response_model=schemas.BankBranchResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_branch(branch: schemas.BankBranchCreate, db: Session = Depends(get_db)):
    """Create a bank branch. Admin/Owner only."""
    new_branch = models.BankBranch(**branch.model_dump())
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch


@router.put("/branches/{branch_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def update_branch(branch_id: int, updates: BranchUpdate, db: Session = Depends(get_db)):
    """Update a bank branch. Admin/Owner only."""
    branch = db.query(models.BankBranch).filter(models.BankBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found.")
    update_data = updates.model_dump(exclude_none=True)
    for key, value in update_data.items():
        if hasattr(branch, key):
            setattr(branch, key, value)
    db.commit()
    return {"message": "Branch updated."}


@router.delete("/branches/{branch_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    """Delete a bank branch. Admin/Owner only."""
    branch = db.query(models.BankBranch).filter(models.BankBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found.")
    db.delete(branch)
    db.commit()
    return {"message": f"Branch ID {branch_id} deleted."}
