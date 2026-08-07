"""
ICON APP - Contractors Router
Role-based CRUD for contractor assignment and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth_dep import get_current_user, require_roles, ADMIN_ROLES, CONTRACTOR_ROLES
import models, schemas

router = APIRouter(prefix="/contractors", tags=["Contractors"])


# ─── Update schema ────────────────────────────────────────────────────────────
class ContractorAssignmentUpdate(BaseModel):
    start_date:             Optional[str] = None
    expected_completion_date: Optional[str] = None
    actual_completion_date: Optional[str] = None
    status:                 Optional[str] = None
    payment_amount:         Optional[float] = None
    payment_status:         Optional[str] = None
    remarks:                Optional[str] = None


# ─── GET SKILLS ───────────────────────────────────────────────────────────────
@router.get("/skills", response_model=List[schemas.SkillResponse])
def get_skills(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all skills. All authenticated users."""
    return db.query(models.Skill).all()


# ─── GET MY SKILLS (contractor's own skills) ──────────────────────────────────
@router.get("/my-skills")
def get_my_skills(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get skills for the current user."""
    return (
        db.query(models.ContractorSkill)
        .options(joinedload(models.ContractorSkill.skill))
        .filter(models.ContractorSkill.contractor_id == current_user.id)
        .all()
    )


# ─── GET SKILLS FOR A SPECIFIC CONTRACTOR ─────────────────────────────────────
@router.get("/skills/{contractor_id}")
def get_contractor_skills(
    contractor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get all skills for a specific contractor. Admin/staff only."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return (
        db.query(models.ContractorSkill)
        .options(joinedload(models.ContractorSkill.skill))
        .filter(models.ContractorSkill.contractor_id == contractor_id)
        .all()
    )


# ─── CREATE SKILL ──────────────────────────────────────────────────────────────
@router.post("/skills", response_model=schemas.SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(
    data: schemas.SkillCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Create a new skill. Admin/Owner only."""
    ALLOWED = ADMIN_ROLES
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")
    existing = db.query(models.Skill).filter(models.Skill.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill with this name already exists.")
    skill = models.Skill(**data.model_dump())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


# ─── UPDATE SKILL ──────────────────────────────────────────────────────────────
@router.put("/skills/{skill_id}", response_model=schemas.SkillResponse)
def update_skill(
    skill_id: int,
    data: schemas.SkillCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Update a skill. Admin/Owner only."""
    ALLOWED = ADMIN_ROLES
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")
    skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")
    for key, value in data.model_dump().items():
        if value is not None:
            setattr(skill, key, value)
    db.commit()
    db.refresh(skill)
    return skill


# ─── DELETE SKILL ──────────────────────────────────────────────────────────────
@router.delete("/skills/{skill_id}")
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Delete a skill. Admin/Owner only."""
    ALLOWED = ADMIN_ROLES
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")
    skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")
    db.delete(skill)
    db.commit()
    return {"message": f"Skill '{skill.name}' deleted."}


# ─── ASSIGN SKILL TO CONTRACTOR ────────────────────────────────────────────────
@router.post("/contractor-skills", response_model=schemas.ContractorSkillResponse, status_code=status.HTTP_201_CREATED)
def assign_skill_to_contractor(
    data: schemas.ContractorSkillCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Assign a skill to a contractor. Admin/Owner only."""
    ALLOWED = ADMIN_ROLES
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")
    skill = db.query(models.Skill).filter(models.Skill.id == data.skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")
    existing = db.query(models.ContractorSkill).filter(
        models.ContractorSkill.contractor_id == data.contractor_id,
        models.ContractorSkill.skill_id == data.skill_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill already assigned.")
    cs = models.ContractorSkill(**data.model_dump())
    db.add(cs)
    db.commit()
    db.refresh(cs)
    return cs


# ─── REMOVE SKILL FROM CONTRACTOR ─────────────────────────────────────────────
@router.delete("/contractor-skills/{cs_id}")
def remove_skill(
    cs_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Remove a skill from a contractor. Admin/Owner only."""
    ALLOWED = ADMIN_ROLES
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")
    cs = db.query(models.ContractorSkill).filter(models.ContractorSkill.id == cs_id).first()
    if not cs:
        raise HTTPException(status_code=404, detail="Not found.")
    db.delete(cs)
    db.commit()
    return {"message": "Skill removed."}


# ─── GET SKILLS FOR A SPECIFIC CONTRACTOR ─────────────────────────────────────
@router.get("/contractor-skills/{contractor_id}")
def list_contractor_skill_assignments(
    contractor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get all skills for a specific contractor. Admin/staff only."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return (
        db.query(models.ContractorSkill)
        .options(joinedload(models.ContractorSkill.skill))
        .filter(models.ContractorSkill.contractor_id == contractor_id)
        .all()
    )


# ─── GET CONTRACTOR TASKS ─────────────────────────────────────────────────────
@router.get("/tasks")
def get_contractor_tasks(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get assigned tasks for the current contractor."""
    if current_user.role not in CONTRACTOR_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    # Eager-load project (+ its farmer/village/taluka/district chain) so the
    # loop below doesn't issue 2 extra queries per assignment (was 2N queries).
    assignments = (
        db.query(models.ProjectContractor)
        .options(
            joinedload(models.ProjectContractor.skill),
            joinedload(models.ProjectContractor.project).joinedload(models.Project.farmer),
            joinedload(models.ProjectContractor.project)
                .joinedload(models.Project.village)
                .joinedload(models.Village.taluka)
                .joinedload(models.Taluka.district),
        )
        .filter(models.ProjectContractor.contractor_id == current_user.id)
        .all()
    )

    result = []
    for a in assignments:
        project = a.project
        farmer  = project.farmer if project else None
        result.append({
            "assignment_id":  a.id,
            "project_id":     a.project_id,
            "project_code":   project.project_code if project else None,
            "farmer_name":    (farmer.full_name or farmer.first_name) if farmer else None,
            "district":       (project.village.taluka.district.name
                               if project and project.village and project.village.taluka
                               and project.village.taluka.district else None),
            "state":          "Maharashtra" if getattr(project, 'village', None) else None,
            "project_stage":  project.project_stage if project else None,
            "status":        a.status,
            "payment_status": a.payment_status,
            "payment_amount": a.payment_amount,
            "start_date":     str(a.start_date) if a.start_date else None,
            "expected_end":   str(a.expected_completion_date) if a.expected_completion_date else None,
            "actual_end":     str(a.actual_completion_date) if a.actual_completion_date else None,
            "skill":          a.skill.name if a.skill else None,
            "remarks":        a.remarks,
        })

    return {
        "total":       len(result),
        "in_progress": sum(1 for r in result if r["status"] == "in_progress"),
        "completed":   sum(1 for r in result if r["status"] == "completed"),
        "pending":     sum(1 for r in result if r["status"] == "assigned"),
        "tasks":       result,
    }


# ─── GET PROJECT CONTRACTORS ──────────────────────────────────────────────────
@router.get("/project/{project_id}", response_model=List[schemas.ProjectContractorResponse])
def get_project_contractors(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Get contractors assigned to a project."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager", "dealer", "bank_officer", "agency_officer"}
    if current_user.role not in ALLOWED and current_user.role not in CONTRACTOR_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized.")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    from auth_dep import assert_project_access
    assert_project_access(project, current_user, db)

    return (
        db.query(models.ProjectContractor)
        .options(joinedload(models.ProjectContractor.contractor))
        .options(joinedload(models.ProjectContractor.skill))
        .filter(models.ProjectContractor.project_id == project_id)
        .all()
    )


# ─── ASSIGN CONTRACTOR ───────────────────────────────────────────────────────
@router.post("/assign", response_model=schemas.ProjectContractorResponse, status_code=status.HTTP_201_CREATED)
def assign_contractor(
    assignment: schemas.ProjectContractorCreate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Assign a contractor to a project. Admin, owner, project_manager."""
    ALLOWED = ADMIN_ROLES | {"project_manager", "office_staff"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized to assign contractors.")

    if not db.query(models.Project).filter(models.Project.id == assignment.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found.")
    if not db.query(models.Person).filter(models.Person.id == assignment.contractor_id).first():
        raise HTTPException(status_code=404, detail="Contractor not found.")
    skill = db.query(models.Skill).filter(models.Skill.id == assignment.skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    new_assign = models.ProjectContractor(**assignment.model_dump())
    db.add(new_assign)
    db.commit()
    db.refresh(new_assign)
    return new_assign


# ─── UPDATE ASSIGNMENT ───────────────────────────────────────────────────────
@router.put("/assign/{assignment_id}")
def update_contractor_assignment(
    assignment_id: int,
    updates: ContractorAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """Update a contractor assignment."""
    assignment = db.query(models.ProjectContractor).filter(
        models.ProjectContractor.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    MANAGER_ROLES = ADMIN_ROLES | {"project_manager", "office_staff"}

    if current_user.role in CONTRACTOR_ROLES:
        if assignment.contractor_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update your own assignments.")
        if updates.status:
            assignment.status = updates.status
        if updates.actual_completion_date:
            assignment.actual_completion_date = updates.actual_completion_date
        if updates.remarks:
            assignment.remarks = updates.remarks
    elif current_user.role in MANAGER_ROLES:
        update_data = updates.model_dump(exclude_none=True)
        for key, value in update_data.items():
            if hasattr(assignment, key):
                setattr(assignment, key, value)
    else:
        raise HTTPException(status_code=403, detail="Not authorized.")

    db.commit()
    return {"message": "Assignment updated successfully."}


# ─── REMOVE ASSIGNMENT ───────────────────────────────────────────────────────
@router.delete("/assign/{assignment_id}", dependencies=[Depends(require_roles("admin", "owner", "project_manager"))])
def remove_contractor_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """Remove a contractor assignment. Admin/Owner/Project Manager only."""
    assignment = db.query(models.ProjectContractor).filter(
        models.ProjectContractor.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    db.delete(assignment)
    db.commit()
    return {"message": f"Contractor assignment ID {assignment_id} removed."}


# ─── LIST ALL CONTRACTOR PERSONS ─────────────────────────────────────────────
@router.get("/by-skill/{skill_name}")
def get_contractors_by_skill(
    skill_name: str,
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all contractors who have a specific skill."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager", "dealer"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")

    cs_list = db.query(models.ContractorSkill).join(models.Skill).filter(
        models.Skill.name == skill_name
    ).all()

    contractor_ids = [cs.contractor_id for cs in cs_list]
    if not contractor_ids:
        return []

    return (
        db.query(models.Person)
        .filter(models.Person.id.in_(contractor_ids))
        .filter(models.Person.is_active == 1)
        .all()
    )


@router.get("/list/all")
def list_contractor_persons(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """List all contractor-role persons. Admin/staff/project_manager."""
    ALLOWED = ADMIN_ROLES | {"office_staff", "project_manager"}
    if current_user.role not in ALLOWED:
        raise HTTPException(status_code=403, detail="Not authorized.")

    return (
        db.query(models.Person)
        .filter(models.Person.role.in_(CONTRACTOR_ROLES))
        .all()
    )
