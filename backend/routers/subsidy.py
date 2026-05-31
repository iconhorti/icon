from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_dep import get_current_user
import models, schemas
from typing import List

router = APIRouter(prefix="/subsidy", tags=["Subsidy Calculation"])


@router.get("/agencies", response_model=List[schemas.GovernmentAgencyResponse])
def get_agencies(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    return db.query(models.GovernmentAgency).all()


@router.get("/rates")
def get_rates(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Return all current component rates from the unified table."""
    components = db.query(models.Component).filter(models.Component.is_active == 1).all()
    area_types = db.query(models.ProjectAreaType).filter(models.ProjectAreaType.is_active == 1).all()

    return {
        "structures": [
            {
                "id":             c.id,
                "name":           c.name,
                "category":       c.category,
                "code":           c.variant_code,
                "unit":           c.unit,
                "cost_per_sqm":   c.eligible_cost_per_unit,
                "subsidy_rate":   c.subsidy_rate_per_unit,
                "is_eligible":    c.is_subsidy_eligible == 1,
            }
            for c in components if c.component_type == "Structure"
        ],
        "crops": [
            {
                "id":             c.id,
                "name":           c.name,
                "category":       c.category,
                "unit":           c.unit,
                "cost_per_sqm":   c.eligible_cost_per_unit,
                "subsidy_rate":   c.subsidy_rate_per_unit,
                "structure_type": c.category,
            }
            for c in components if c.component_type == "Crop"
        ],
        "components": [
            {
                "id":             c.id,
                "name":           c.name,
                "category":       c.category,
                "unit":           c.unit,
                "unit_type":      c.unit_type,
                "cost":           c.eligible_cost_per_unit,
                "subsidy":        c.subsidy_rate_per_unit,
                "max_quantity":   c.max_quantity,
            }
            for c in components if c.component_type == "Component"
        ],
        "area_types": [
            {
                "id":         a.id,
                "name":       a.name,
                "multiplier": a.multiplier,
            }
            for a in area_types
        ],
    }


@router.get("/calculate/{project_id}")
def calculate_subsidy(project_id: int, db: Session = Depends(get_db)):
    """
    Full Spec v2.0 subsidy calculation using ProjectItem records.
    Iterates project.items (line_type: Structure | Crop | Component)
    and looks up the reference table for each to compute eligible costs.

    Total Eligible = SUM(Structure Area × Rate × Multiplier)
                   + SUM(Component Qty × Rate × Multiplier)
                   + Crop Area × Crop Rate × Multiplier  (if set on project)
    Total Subsidy  = Total Eligible × 50%
    """
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    area_multiplier = project.area_type.multiplier if project.area_type else 1.0

    # ── 1. Structure Lines ────────────────────────────
    structures_eligible = 0.0
    structure_detail    = []
    for item in project.items:
        if item.line_type != "Structure":
            continue
        ref = db.query(models.Component).filter(
            models.Component.id == item.item_id,
            models.Component.component_type == "Structure"
        ).first()
        if not ref or ref.eligible_cost_per_unit <= 0 or ref.is_subsidy_eligible != 1:
            continue
        qty           = item.qty or 0.0
        eligible_cost = qty * ref.eligible_cost_per_unit * area_multiplier
        subsidy       = eligible_cost * 0.50
        structures_eligible += eligible_cost
        structure_detail.append({
            "item_id":       item.id,
            "name":          ref.name,
            "area_sqm":      qty,
            "rate":          ref.eligible_cost_per_unit,
            "multiplier":    area_multiplier,
            "eligible_cost": round(eligible_cost, 2),
            "subsidy":       round(subsidy, 2),
        })

    # ── 2. Component Lines ────────────────────────────
    components_eligible = 0.0
    component_detail    = []
    for item in project.items:
        if item.line_type != "Component":
            continue
        ref = db.query(models.Component).filter(
            models.Component.id == item.item_id,
            models.Component.component_type == "Component"
        ).first()
        if not ref or ref.eligible_cost_per_unit <= 0:
            continue
        qty           = item.qty or 0.0
        eligible_cost = ref.eligible_cost_per_unit * qty * area_multiplier
        subsidy       = eligible_cost * 0.50
        components_eligible += eligible_cost
        component_detail.append({
            "item_id":       item.id,
            "name":          ref.name,
            "quantity":      qty,
            "unit":          item.unit or ref.unit,
            "rate":          ref.eligible_cost_per_unit,
            "multiplier":    area_multiplier,
            "eligible_cost": round(eligible_cost, 2),
            "subsidy":       round(subsidy, 2),
        })

    # ── 3. Crop Lines ─────────────────────────────────
    crop_eligible = 0.0
    crop_detail_list = []
    for item in project.items:
        if item.line_type != "Crop":
            continue
        ref = db.query(models.Component).filter(
            models.Component.id == item.item_id,
            models.Component.component_type == "Crop"
        ).first()
        if not ref or ref.eligible_cost_per_unit <= 0:
            continue
        qty           = item.qty or 0.0
        crop_cost     = ref.eligible_cost_per_unit * qty * area_multiplier
        crop_subsidy  = crop_cost * 0.50
        crop_eligible += crop_cost
        crop_detail_list.append({
            "item_id":       item.id,
            "name":          ref.name,
            "area_sqm":      qty,
            "rate":          ref.eligible_cost_per_unit,
            "multiplier":    area_multiplier,
            "eligible_cost": round(crop_cost, 2),
            "subsidy":       round(crop_subsidy, 2),
        })

    # ── 4. Totals ─────────────────────────────────────
    total_eligible = structures_eligible + components_eligible + crop_eligible
    total_subsidy  = total_eligible * 0.50

    # ── 5. Installment Schedule ───────────────────────
    m3_installment         = total_subsidy * 0.60  # 60% at M3
    completion_installment = total_subsidy * 0.40  # 40% at completion

    return {
        "project_id":            project_id,
        "project_code":          project.project_code,
        "area_type":             project.area_type.name if project.area_type else "Normal",
        "area_multiplier":       area_multiplier,

        "structures":            structure_detail,
        "components":            component_detail,
        "crops":                 crop_detail_list,

        "structures_eligible":   round(structures_eligible, 2),
        "components_eligible":   round(components_eligible, 2),
        "crop_eligible":         round(crop_eligible, 2),

        "total_eligible_cost":   round(total_eligible, 2),
        "total_subsidy":         round(total_subsidy, 2),
        "farmer_contribution":   round(total_eligible - total_subsidy, 2),

        "m3_installment":        round(m3_installment, 2),
        "completion_installment":round(completion_installment, 2),
    }
