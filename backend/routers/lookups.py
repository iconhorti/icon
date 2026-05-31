"""
ICON APP - Lookup Reference Data Router
Provides simple lists for form dropdowns + admin CRUD for AreaTypes and Agencies.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import get_current_user, require_roles
import models

router = APIRouter(prefix="/lookups", tags=["Reference Data"])


# ─── Schemas ──────────────────────────────────────────────────────────────────
class AreaTypeOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    multiplier: float
    is_active: int = 1

    class Config:
        from_attributes = True

class AreaTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    multiplier: float = 1.0
    is_active: int = 1

class AreaTypeUpdate(BaseModel):
    name:        Optional[str]   = None
    description: Optional[str]   = None
    multiplier:  Optional[float] = None
    is_active:   Optional[int]   = None


class AgencyOut(BaseModel):
    id: int
    name: str
    short_code:  Optional[str] = None
    description: Optional[str] = None
    website:     Optional[str] = None
    is_active:   int = 1

    class Config:
        from_attributes = True

class AgencyCreate(BaseModel):
    name: str
    short_code:  Optional[str] = None
    description: Optional[str] = None
    website:     Optional[str] = None
    is_active:   int = 1

class AgencyUpdate(BaseModel):
    name:        Optional[str] = None
    short_code:  Optional[str] = None
    description: Optional[str] = None
    website:     Optional[str] = None
    is_active:   Optional[int] = None


# ─── Area Types ───────────────────────────────────────────────────────────────
@router.get("/area-types", response_model=List[AreaTypeOut])
def get_area_types(
    all: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.ProjectAreaType)
    if not all:
        query = query.filter(models.ProjectAreaType.is_active == 1)
    return query.all()


@router.post("/area-types", response_model=AreaTypeOut,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_area_type(data: AreaTypeCreate, db: Session = Depends(get_db)):
    new = models.ProjectAreaType(**data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return new


@router.put("/area-types/{area_type_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def update_area_type(area_type_id: int, updates: AreaTypeUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.ProjectAreaType).filter(models.ProjectAreaType.id == area_type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Area type not found.")
    for key, value in updates.model_dump(exclude_none=True).items():
        setattr(obj, key, value)
    db.commit()
    return {"message": "Area type updated."}


@router.delete("/area-types/{area_type_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_area_type(area_type_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.ProjectAreaType).filter(models.ProjectAreaType.id == area_type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Area type not found.")
    obj.is_active = 0
    db.commit()
    return {"message": "Area type deactivated."}


# ─── Agencies ─────────────────────────────────────────────────────────────────
@router.get("/agencies", response_model=List[AgencyOut])
def get_agencies(db: Session = Depends(get_db)):
    return db.query(models.GovernmentAgency).all()


@router.post("/agencies", response_model=AgencyOut,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_agency(data: AgencyCreate, db: Session = Depends(get_db)):
    new = models.GovernmentAgency(**data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return new


@router.put("/agencies/{agency_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def update_agency(agency_id: int, updates: AgencyUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.GovernmentAgency).filter(models.GovernmentAgency.id == agency_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Agency not found.")
    for key, value in updates.model_dump(exclude_none=True).items():
        setattr(obj, key, value)
    db.commit()
    return {"message": "Agency updated."}


@router.delete("/agencies/{agency_id}", dependencies=[Depends(require_roles("admin", "owner"))])
def delete_agency(agency_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.GovernmentAgency).filter(models.GovernmentAgency.id == agency_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Agency not found.")
    obj.is_active = 0
    db.commit()
    return {"message": "Agency deactivated."}


# ─── Location Lookup — Full CRUD ─────────────────────────────────────────────

class StateOut(BaseModel):
    id:         int
    short_name: Optional[str] = None
    name:       str
    class Config: from_attributes = True

class StateCreate(BaseModel):
    short_name: Optional[str] = None
    name:       str

class StateUpdate(BaseModel):
    short_name: Optional[str] = None
    name:       Optional[str] = None

class DistrictOut(BaseModel):
    id: int
    name: str
    state_id: int
    class Config: from_attributes = True

class DistrictCreate(BaseModel):
    name: str
    state_id: int

class TalukaOut(BaseModel):
    id: int
    name: str
    district_id: int
    class Config: from_attributes = True

class TalukaCreate(BaseModel):
    name: str
    district_id: int

class VillageOut(BaseModel):
    id: int
    name: str
    taluka_id: int
    pincode: Optional[str] = None
    class Config: from_attributes = True

class VillageCreate(BaseModel):
    name: str
    taluka_id: int
    pincode: Optional[str] = None


# ── States ────────────────────────────────────────────────────────────────────
@router.get("/states", response_model=List[StateOut])
def get_states(db: Session = Depends(get_db)):
    return db.query(models.State).order_by(models.State.name).all()

@router.post("/states", response_model=StateOut, status_code=201,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_state(data: StateCreate, db: Session = Depends(get_db)):
    obj = models.State(name=data.name)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/states/{state_id}", response_model=StateOut,
            dependencies=[Depends(require_roles("admin", "owner"))])
def update_state(state_id: int, data: StateUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.State).filter(models.State.id == state_id).first()
    if not obj: raise HTTPException(404, "State not found.")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(obj, key, value)
    db.commit(); db.refresh(obj)
    return obj

@router.delete("/states/{state_id}",
               dependencies=[Depends(require_roles("admin", "owner"))])
def delete_state(state_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.State).filter(models.State.id == state_id).first()
    if not obj: raise HTTPException(404, "State not found.")
    db.delete(obj); db.commit()
    return {"message": "State deleted."}


# ── Districts ─────────────────────────────────────────────────────────────────
@router.get("/districts", response_model=List[DistrictOut])
def get_districts(state_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.District)
    if state_id:
        q = q.filter(models.District.state_id == state_id)
    return q.order_by(models.District.name).all()

@router.post("/districts", response_model=DistrictOut, status_code=201,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_district(data: DistrictCreate, db: Session = Depends(get_db)):
    obj = models.District(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/districts/{district_id}", response_model=DistrictOut,
            dependencies=[Depends(require_roles("admin", "owner"))])
def update_district(district_id: int, data: DistrictCreate, db: Session = Depends(get_db)):
    obj = db.query(models.District).filter(models.District.id == district_id).first()
    if not obj: raise HTTPException(404, "District not found.")
    obj.name = data.name; obj.state_id = data.state_id
    db.commit(); db.refresh(obj); return obj

@router.delete("/districts/{district_id}",
               dependencies=[Depends(require_roles("admin", "owner"))])
def delete_district(district_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.District).filter(models.District.id == district_id).first()
    if not obj: raise HTTPException(404, "District not found.")
    db.delete(obj); db.commit()
    return {"message": "District deleted."}


# ── Talukas ───────────────────────────────────────────────────────────────────
@router.get("/talukas", response_model=List[TalukaOut])
def get_talukas(district_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Taluka)
    if district_id:
        q = q.filter(models.Taluka.district_id == district_id)
    return q.order_by(models.Taluka.name).all()

@router.post("/talukas", response_model=TalukaOut, status_code=201,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_taluka(data: TalukaCreate, db: Session = Depends(get_db)):
    obj = models.Taluka(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/talukas/{taluka_id}", response_model=TalukaOut,
            dependencies=[Depends(require_roles("admin", "owner"))])
def update_taluka(taluka_id: int, data: TalukaCreate, db: Session = Depends(get_db)):
    obj = db.query(models.Taluka).filter(models.Taluka.id == taluka_id).first()
    if not obj: raise HTTPException(404, "Taluka not found.")
    obj.name = data.name; obj.district_id = data.district_id
    db.commit(); db.refresh(obj); return obj

@router.delete("/talukas/{taluka_id}",
               dependencies=[Depends(require_roles("admin", "owner"))])
def delete_taluka(taluka_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Taluka).filter(models.Taluka.id == taluka_id).first()
    if not obj: raise HTTPException(404, "Taluka not found.")
    db.delete(obj); db.commit()
    return {"message": "Taluka deleted."}


# ── Villages ──────────────────────────────────────────────────────────────────
@router.get("/villages", response_model=List[VillageOut])
def get_villages(taluka_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Village)
    if taluka_id:
        q = q.filter(models.Village.taluka_id == taluka_id)
    return q.order_by(models.Village.name).all()

@router.post("/villages", response_model=VillageOut, status_code=201,
             dependencies=[Depends(require_roles("admin", "owner"))])
def create_village(data: VillageCreate, db: Session = Depends(get_db)):
    obj = models.Village(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/villages/{village_id}", response_model=VillageOut,
            dependencies=[Depends(require_roles("admin", "owner"))])
def update_village(village_id: int, data: VillageCreate, db: Session = Depends(get_db)):
    obj = db.query(models.Village).filter(models.Village.id == village_id).first()
    if not obj: raise HTTPException(404, "Village not found.")
    obj.name = data.name; obj.taluka_id = data.taluka_id; obj.pincode = data.pincode
    db.commit(); db.refresh(obj); return obj

@router.delete("/villages/{village_id}",
               dependencies=[Depends(require_roles("admin", "owner"))])
def delete_village(village_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Village).filter(models.Village.id == village_id).first()
    if not obj: raise HTTPException(404, "Village not found.")
    db.delete(obj); db.commit()
    return {"message": "Village deleted."}

