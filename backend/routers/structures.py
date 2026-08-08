"""
ICON APP - Unified Components Router
CRUD for Structures, Crops, and Components (all in one table).

Permissions:
  GET *         → all authenticated users (reference data)
  POST / PUT / DELETE → admin, owner only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import get_current_user, require_roles
import models, schemas

router = APIRouter(prefix="/structures", tags=["Reference Data"])


# ─── Unified CRUD ──────────────────────────────────────────────────────────────
class ComponentUpdate(BaseModel):
    component_type:          Optional[str]   = None
    name:                    Optional[str]   = None
    category:                Optional[str]   = None
    variant_code:            Optional[str]   = None
    unit:                    Optional[str]   = None
    eligible_cost_per_unit:  Optional[float] = None
    subsidy_rate_per_unit:   Optional[float] = None
    unit_type:               Optional[str]   = None
    min_qty:                 Optional[int]   = None
    max_qty:                 Optional[int]   = None
    default_qty:             Optional[int]   = None
    is_subsidy_eligible:     Optional[int]   = None
    is_active:               Optional[int]   = None
    description:             Optional[str]   = None


@router.get("/", response_model=List[schemas.ComponentResponse])
def get_components(
    component_type: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Get all components. Optionally filter by component_type.
    component_type: Structure | Crop | Component
    """
    query = db.query(models.Component)
    if component_type:
        query = query.filter(models.Component.component_type == component_type)
    if active_only:
        query = query.filter(models.Component.is_active == 1)
    return query.all()


@router.post("/", response_model=schemas.ComponentResponse,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_component(data: schemas.ComponentCreate, db: Session = Depends(get_db)):
    new_comp = models.Component(**data.model_dump())
    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)
    return new_comp


@router.put("/{component_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def update_component(component_id: int, updates: ComponentUpdate, db: Session = Depends(get_db)):
    comp = db.query(models.Component).filter(models.Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found.")
    for key, value in updates.model_dump(exclude_unset=True).items():
        if hasattr(comp, key):
            setattr(comp, key, value)
    db.commit()
    return {"message": "Component updated."}


@router.delete("/{component_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_component(component_id: int, db: Session = Depends(get_db)):
    comp = db.query(models.Component).filter(models.Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found.")
    comp.is_active = 0
    db.commit()
    return {"message": f"Component ID {component_id} deactivated."}
