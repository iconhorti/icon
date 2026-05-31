"""
ICON APP - Role-Aware Dashboard Stats
Returns filtered KPIs based on the caller's role.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from auth_dep import get_current_user
import models

# ── Single source of truth for stage vocabulary ────────────────────────────
# All stage comparisons use slug-based keys from constants/stages.py.
# The old typo-laden string constants (e.g. "Famremer Onbaord Peinding") have
# been removed. If you need to add a new stage, add it to constants/stages.py.
from constants.stages import (
    ONBOARDING, DESIGN, BANK, GOC, CONSTRUCTION, SUBSIDY, TERMINAL,
    ACTIVE, ALL_STAGES,
)

# Local aliases kept for backward-compatibility with query expressions below
ONBOARDING_STAGES  = list(ONBOARDING)
BANK_STAGES        = list(BANK)
GOC_STAGES         = list(GOC)
ACTIVE_STAGES      = list(CONSTRUCTION)   # construction milestones = "active sites"
SUBSIDY_STAGES     = list(SUBSIDY)
COMPLETED_STAGES   = list(TERMINAL)
ALL_ACTIVE_AND_COMPLETED = list(CONSTRUCTION | TERMINAL)
VALID_PIPELINE     = list(ALL_STAGES)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# ─── Role-Specific KPI endpoint ──────────────────────────────────────────────

@router.get("/role-kpis")
def get_role_kpis(
    for_role: Optional[str] = Query(None, alias="role"),
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Returns comprehensive KPIs for a given role.

    - By default returns KPIs for the authenticated user's own role.
    - admin / owner / office_staff may pass ?role=<target_role> to view
      aggregate KPIs for any supervised role (useful on the Office Staff page
      when drilling into Project Manager, Bank Officer, or Agency Officer stats).
    - Role scoping (e.g. a PM only sees their own projects) is ONLY applied
      when the requesting user IS that role; supervisors always get aggregates.
    """
    caller_role = current_user.role
    SUPERVISOR_ROLES = {"admin", "owner", "office_staff"}

    # Resolve which role's KPIs to return
    if for_role and caller_role in SUPERVISOR_ROLES and for_role != caller_role:
        # Supervisor requesting another role's aggregate KPIs
        role = for_role
        scoped_user_id = None   # aggregate — not scoped to one person
    else:
        role = caller_role
        scoped_user_id = current_user.id

    if role == "project_manager":
        return _pm_kpis(db, scoped_user_id)
    elif role == "bank_officer":
        return _bank_officer_kpis(db)
    elif role == "agency_officer":
        return _agency_officer_kpis(db)
    elif role == "agronomist":
        return _agronomist_kpis(db)
    elif role == "office_staff":
        return _office_staff_kpis(db, scoped_user_id)
    elif role in {"structure_contractor", "drip_contractor", "bed_contractor", "plantation_contractor"}:
        return _contractor_kpis(db, scoped_user_id)
    return {}


def _office_staff_kpis(db: Session, user_id: Optional[int] = None):
    """Office Staff KPIs — project pipeline ownership & farmer onboarding.

    Args:
        user_id: The requesting user's id — used to scope staff_created to
                 this individual's own productivity number.
    """
    from datetime import datetime, timedelta
    from collections import defaultdict

    total_projects  = db.query(models.Project).count()
    total_farmers   = db.query(models.Person).filter(models.Person.role == "farmer").count()
    active_farmers  = db.query(models.Person).filter(models.Person.role == "farmer", models.Person.is_active == 1).count()
    farmers_with_project = db.query(models.Project.farmer_id).distinct().count()

    # KYC completeness
    with_aadhaar = db.query(models.Person).join(models.FarmerProfile).filter(
        models.Person.role == "farmer", models.FarmerProfile.aadhaar_number.isnot(None)
    ).count()
    with_pan = db.query(models.Person).join(models.FarmerProfile).filter(
        models.Person.role == "farmer", models.FarmerProfile.pan_number.isnot(None)
    ).count()

    # Early-stage pipeline (office staff handles these)
    early_pipeline = db.query(models.Project).filter(
        models.Project.project_stage.in_(ONBOARDING_STAGES)
    ).count()

    # DPR-ready: projects that have completed design stages (dpr_ready stage)
    # Previously duplicated early_pipeline — now uses the correct DESIGN stages.
    dpr_ready = db.query(models.Project).filter(
        models.Project.project_stage == "dpr_ready"
    ).count()

    # Projects created by this specific user this month (their own productivity)
    if user_id:
        staff_created = db.query(models.Project).filter(
            models.Project.created_by == user_id
        ).count()
    else:
        # Fallback: all projects created by any office_staff (global count)
        staff_created = db.query(models.Project).join(
            models.Person, models.Project.created_by == models.Person.id
        ).filter(models.Person.role == "office_staff").count()

    # Stage-wise breakdown for early pipeline
    stage_rows = db.query(
        models.Project.project_stage,
        func.count(models.Project.id)
    ).filter(models.Project.project_stage.in_(ONBOARDING_STAGES))\
     .group_by(models.Project.project_stage).all()
    stage_breakdown = {r[0]: r[1] for r in stage_rows}

    # Monthly farmer onboarding — last 6 months
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly_farmers = defaultdict(int)
    for f in db.query(models.Person).filter(
        models.Person.role == "farmer",
        models.Person.created_at >= six_months_ago
    ).all():
        key = f.created_at.strftime("%b %Y")
        monthly_farmers[key] += 1

    now = datetime.now()
    monthly_trend = []
    for i in range(5, -1, -1):
        dt = now - timedelta(days=30 * i)
        key = dt.strftime("%b %Y")
        monthly_trend.append({"month": dt.strftime("%b"), "count": monthly_farmers.get(key, 0)})

    # District coverage
    districts = db.query(models.District.id)\
        .join(models.Taluka, models.Taluka.district_id == models.District.id)\
        .join(models.Village, models.Village.taluka_id == models.Taluka.id)\
        .join(models.Project, models.Project.village_id == models.Village.id)\
        .distinct().count()

    return {
        "role": "office_staff",
        "total_projects":      total_projects,
        "total_farmers":       total_farmers,
        "active_farmers":      active_farmers,
        "farmers_with_project": farmers_with_project,
        "with_aadhaar":        with_aadhaar,
        "with_pan":            with_pan,
        "early_pipeline":      early_pipeline,
        "dpr_ready":           dpr_ready,
        "staff_created":       staff_created,
        "districts_covered":   districts,
        "stage_breakdown":     stage_breakdown,
        "monthly_trend":       monthly_trend,
    }


def _contractor_kpis(db: Session, user_id: Optional[int] = None):
    """Contractor KPIs — workforce strength and project assignment analytics.

    When user_id is provided (individual contractor calling), returns personal
    assignment counts and a stage_breakdown scoped to their own projects.
    When user_id is None (supervisor view), returns aggregate workforce stats.
    """
    CTYPES = [
        "structure_contractor", "drip_contractor",
        "bed_contractor", "plantation_contractor"
    ]

    # Count per type
    type_counts = {}
    for ct in CTYPES:
        type_counts[ct] = db.query(models.Person).filter(
            models.Person.role == ct, models.Person.is_active == 1
        ).count()

    total_active   = sum(type_counts.values())
    total_inactive = db.query(models.Person).filter(
        models.Person.role.in_(CTYPES), models.Person.is_active == 0
    ).count()
    total          = total_active + total_inactive

    # Skill assignment coverage
    contractors_with_skill = db.query(models.ContractorSkill.contractor_id).distinct().count()
    total_skill_assignments = db.query(models.ContractorSkill).count()

    # Project assignment stats
    total_assignments = db.query(models.ProjectContractor).count()
    active_assignments = db.query(models.ProjectContractor).filter(
        models.ProjectContractor.status.in_(["assigned", "in_progress"])
    ).count()
    completed_assignments = db.query(models.ProjectContractor).filter(
        models.ProjectContractor.status == "completed"
    ).count()

    # Per-type breakdown with project counts
    type_breakdown = []
    for ct in CTYPES:
        cnt = db.query(models.Person).filter(
            models.Person.role == ct, models.Person.is_active == 1
        ).count()
        proj_cnt = db.query(models.ProjectContractor).join(
            models.Person, models.ProjectContractor.contractor_id == models.Person.id
        ).filter(models.Person.role == ct).count()
        type_breakdown.append({
            "type": ct.replace("_contractor", "").replace("_", " ").title(),
            "contractors": cnt,
            "assignments": proj_cnt,
        })

    # Top skills in use
    skill_rows = db.query(
        models.Skill.name,
        func.count(models.ContractorSkill.id).label("cnt")
    ).join(models.ContractorSkill, models.ContractorSkill.skill_id == models.Skill.id)\
     .group_by(models.Skill.id).order_by(func.count(models.ContractorSkill.id).desc()).limit(8).all()

    # Personal stats scoped to the individual contractor
    personal_stage_breakdown: dict = {}
    my_total = my_active = my_completed = 0
    if user_id is not None:
        my_qs = db.query(models.ProjectContractor).filter(
            models.ProjectContractor.contractor_id == user_id
        )
        my_total = my_qs.count()
        my_active = my_qs.filter(
            models.ProjectContractor.status.in_(["assigned", "in_progress"])
        ).count()
        my_completed = my_qs.filter(
            models.ProjectContractor.status == "completed"
        ).count()
        my_project_ids = [a.project_id for a in my_qs.with_entities(models.ProjectContractor.project_id).all()]
        if my_project_ids:
            stage_rows_personal = db.query(
                models.Project.project_stage,
                func.count(models.Project.id)
            ).filter(models.Project.id.in_(my_project_ids))\
             .group_by(models.Project.project_stage).all()
            personal_stage_breakdown = {r[0]: r[1] for r in stage_rows_personal}

    return {
        "role": "contractor",
        "total_contractors":    total,
        "active_contractors":   total_active,
        "inactive_contractors": total_inactive,
        "contractors_with_skill": contractors_with_skill,
        "total_skill_assignments": total_skill_assignments,
        "total_assignments":    total_assignments,
        "active_assignments":   active_assignments,
        "completed_assignments": completed_assignments,
        "type_counts":          type_counts,
        "type_breakdown":       type_breakdown,
        "skill_breakdown":      [{"skill": r.name, "count": r.cnt} for r in skill_rows],
        # Personal fields (only populated when user_id is provided)
        "my_total":             my_total,
        "my_active":            my_active,
        "my_completed":         my_completed,
        "stage_breakdown":      personal_stage_breakdown,
    }



def _pm_kpis(db: Session, user_id: Optional[int] = None):
    """Project Manager KPIs.

    When user_id is provided (the calling user IS a PM), stats are scoped to
    that PM's own assigned projects.  When user_id is None (called by a
    supervisor such as admin/office_staff), aggregate stats across ALL PMs
    are returned instead.
    """
    # ── Base queryset ────────────────────────────────────────────────────────
    if user_id is not None:
        my_projects = db.query(models.Project).filter(
            models.Project.project_manager_id == user_id
        )
    else:
        # Supervisor view: all projects that have a PM assigned
        my_projects = db.query(models.Project).filter(
            models.Project.project_manager_id.isnot(None)
        )

    total_assigned      = my_projects.count()
    active_construction = my_projects.filter(
        models.Project.project_stage.in_(ACTIVE_STAGES)
    ).count()
    completed           = my_projects.filter(
        models.Project.project_stage.in_(COMPLETED_STAGES)
    ).count()
    in_bank             = my_projects.filter(
        models.Project.project_stage.in_(BANK_STAGES)
    ).count()
    in_subsidy          = my_projects.filter(
        models.Project.project_stage.in_(SUBSIDY_STAGES)
    ).count()

    # ── Site visits ──────────────────────────────────────────────────────────
    if user_id is not None:
        my_project_ids = [p.id for p in my_projects.with_entities(models.Project.id).all()]
        total_site_visits = db.query(models.SiteVisit)\
            .filter(models.SiteVisit.project_id.in_(my_project_ids)).count() \
            if my_project_ids else 0
        follow_up_pending = db.query(models.SiteVisit)\
            .filter(
                models.SiteVisit.project_id.in_(my_project_ids),
                models.SiteVisit.follow_up_required == 1
            ).count() if my_project_ids else 0
    else:
        total_site_visits = db.query(models.SiteVisit).count()
        follow_up_pending = db.query(models.SiteVisit)\
            .filter(models.SiteVisit.follow_up_required == 1).count()

    # ── Stage distribution ───────────────────────────────────────────────────
    stage_filter = (models.Project.project_manager_id == user_id) \
        if user_id is not None \
        else models.Project.project_manager_id.isnot(None)

    stage_rows = db.query(
        models.Project.project_stage,
        func.count(models.Project.id)
    ).filter(stage_filter)\
     .group_by(models.Project.project_stage).all()
    stage_breakdown = {r[0]: r[1] for r in stage_rows}

    # ── Districts covered ────────────────────────────────────────────────────
    districts = db.query(models.District.id)\
        .join(models.Taluka,  models.Taluka.district_id  == models.District.id)\
        .join(models.Village, models.Village.taluka_id   == models.Taluka.id)\
        .join(models.Project, models.Project.village_id  == models.Village.id)\
        .filter(stage_filter)\
        .distinct().count()

    # ── PM breakdown: all PMs with project & completed counts ────────────────
    pm_rows = db.query(
        models.Person.id,
        models.Person.first_name,
        models.Person.last_name,
        func.count(models.Project.id).label("projects"),
        func.sum(case(
            (models.Project.project_stage.in_(COMPLETED_STAGES), 1),
            else_=0
        )).label("completed_count"),
    ).outerjoin(models.Project, models.Project.project_manager_id == models.Person.id)\
     .filter(models.Person.role == "project_manager")\
     .group_by(models.Person.id)\
     .order_by(func.count(models.Project.id).desc()).all()

    pm_breakdown = [
        {
            "name":      f"{r.first_name} {r.last_name or ''}".strip(),
            "projects":  r.projects,
            "completed": r.completed_count or 0,
            "is_me":     r.id == user_id,
        }
        for r in pm_rows
    ]

    # ── Action queue ─────────────────────────────────────────────────────────
    queue_filter_extra = (models.Project.project_manager_id == user_id) \
        if user_id is not None \
        else models.Project.project_manager_id.isnot(None)

    queue_projs = db.query(
        models.Project.id,
        models.Project.project_name,
        models.Project.project_stage,
        models.Person.first_name,
        models.Person.last_name,
        models.District.name.label("district_name"),
    ).join(models.Person, models.Project.farmer_id == models.Person.id)\
     .outerjoin(models.Village, models.Project.village_id == models.Village.id)\
     .outerjoin(models.Taluka, models.Village.taluka_id == models.Taluka.id)\
     .outerjoin(models.District, models.Taluka.district_id == models.District.id)\
     .filter(
         queue_filter_extra,
         models.Project.project_stage.in_(ACTIVE_STAGES + SUBSIDY_STAGES + BANK_STAGES),
     ).order_by(models.Project.id.asc()).limit(8).all()

    queue = [
        {
            "id":        f"PRJ-{r.id}",
            "projectId": r.id,
            "farmer":    f"{r.first_name} {r.last_name or ''}".strip(),
            "district":  r.district_name or "—",
            "stage":     r.project_stage,
            "urgency":   "High" if r.project_stage in SUBSIDY_STAGES else "Medium",
        }
        for r in queue_projs
    ]

    return {
        "role":                    "project_manager",
        "total_assigned_projects": total_assigned,
        "active_construction":     active_construction,
        "completed_projects":      completed,
        "in_bank":                 in_bank,
        "in_subsidy":              in_subsidy,
        "total_site_visits":       total_site_visits,
        "follow_up_pending":       follow_up_pending,
        "districts_covered":       districts,
        "stage_breakdown":         stage_breakdown,
        "pm_breakdown":            pm_breakdown,
        "queue":                   queue,
    }


def _bank_officer_kpis(db: Session):
    """Bank Officer KPIs — loan processing analytics."""
    pending_sanction = db.query(models.Project)\
        .filter(models.Project.project_stage.in_(BANK_STAGES)).count()

    bank_approved = db.query(models.ProjectMilestone)\
        .filter(models.ProjectMilestone.milestone_name == "bank_processing", models.ProjectMilestone.status == "completed").count()

    total_loan_sanctioned = db.query(func.sum(models.ProjectMilestone.amount))\
        .filter(models.ProjectMilestone.milestone_name == "bank_processing", models.ProjectMilestone.status == "completed").scalar() or 0

    avg_loan = db.query(func.avg(models.ProjectMilestone.amount))\
        .filter(models.ProjectMilestone.milestone_name == "bank_processing", models.ProjectMilestone.status == "completed", models.ProjectMilestone.amount.isnot(None)).scalar() or 0

    total_eligible_cost = db.query(func.sum(models.Project.total_project_cost))\
        .join(models.ProjectMilestone, models.Project.id == models.ProjectMilestone.project_id)\
        .filter(models.ProjectMilestone.milestone_name == "bank_processing", models.ProjectMilestone.status == "completed").scalar() or 0

    # Approval rate
    total_processed = db.query(models.Project)\
        .filter(models.Project.project_stage.notin_(ONBOARDING_STAGES)).count()
    approval_rate = round((bank_approved / total_processed * 100), 1) if total_processed else 0

    # Projects still at bank_processing that have been there (no sanction date)
    awaiting_sanction = db.query(models.Project)\
        .filter(models.Project.project_stage.in_(BANK_STAGES))\
        .outerjoin(models.ProjectMilestone, (models.Project.id == models.ProjectMilestone.project_id) & (models.ProjectMilestone.milestone_name == "bank_processing") & (models.ProjectMilestone.status == "completed"))\
        .filter(models.ProjectMilestone.id.is_(None)).count()

    # Action queue: projects at bank_processing stage waiting for sanction
    bank_queue_rows = db.query(
        models.Project.id,
        models.Project.project_name,
        models.Project.project_stage,
        models.Project.total_project_cost,
        models.Person.first_name,
        models.Person.last_name,
        models.District.name.label("district_name"),
    ).join(models.Person, models.Project.farmer_id == models.Person.id)\
     .outerjoin(models.Village, models.Project.village_id == models.Village.id)\
     .outerjoin(models.Taluka, models.Village.taluka_id == models.Taluka.id)\
     .outerjoin(models.District, models.Taluka.district_id == models.District.id)\
     .filter(models.Project.project_stage.in_(BANK_STAGES))\
     .outerjoin(models.ProjectMilestone,
                (models.Project.id == models.ProjectMilestone.project_id) &
                (models.ProjectMilestone.milestone_name == "bank_processing") &
                (models.ProjectMilestone.status == "completed"))\
     .filter(models.ProjectMilestone.id.is_(None))\
     .order_by(models.Project.id.asc()).limit(8).all()

    bank_queue = [
        {
            "id":        f"PRJ-{r.id}",
            "projectId": r.id,
            "farmer":    f"{r.first_name} {r.last_name or ''}".strip(),
            "district":  r.district_name or "—",
            "stage":     r.project_stage,
            "amount":    r.total_project_cost or 0,
            "urgency":   "High",
        }
        for r in bank_queue_rows
    ]

    return {
        "role": "bank_officer",
        "pending_sanction":      pending_sanction,
        "awaiting_sanction":     awaiting_sanction,
        "bank_approved":         bank_approved,
        "total_loan_sanctioned": round(total_loan_sanctioned, 2),
        "avg_loan_amount":       round(avg_loan, 2),
        "total_eligible_cost":   round(total_eligible_cost, 2),
        "approval_rate_pct":     approval_rate,
        "total_processed":       total_processed,
        "queue":                 bank_queue,
    }


def _agency_officer_kpis(db: Session):
    """Agency Officer KPIs — subsidy inspection & committee analytics."""
    pending_inspection = db.query(models.Project)\
        .filter(models.Project.project_stage.in_(SUBSIDY_STAGES)).count()

    inspections_done = db.query(models.ProjectMilestone)\
        .filter(models.ProjectMilestone.milestone_name == "agency_inspection", models.ProjectMilestone.status.in_(["completed", "passed", "failed"])).count()

    inspections_passed = db.query(models.ProjectMilestone)\
        .filter(models.ProjectMilestone.milestone_name == "agency_inspection", models.ProjectMilestone.status.in_(["completed", "passed"])).count()

    pass_rate = round((inspections_passed / inspections_done * 100), 1) if inspections_done else 0

    committee_meetings_done = db.query(models.ProjectMilestone)\
        .filter(models.ProjectMilestone.milestone_name == "committee_meeting",
                models.ProjectMilestone.status.in_(["completed", "passed", "approved", "rejected"])).count()

    committee_pending = db.query(models.Project)\
        .filter(models.Project.project_stage.in_(SUBSIDY_STAGES)).count()

    approved = db.query(models.ProjectMilestone)\
        .filter(models.ProjectMilestone.milestone_name == "committee_meeting",
                models.ProjectMilestone.status.in_(["completed", "passed", "approved"])).count()
    rejected = db.query(models.ProjectMilestone)\
        .filter(models.ProjectMilestone.milestone_name == "committee_meeting",
                models.ProjectMilestone.status == "rejected").count()

    total_subsidy_approved = db.query(func.sum(models.ProjectMilestone.amount))\
        .filter(models.ProjectMilestone.milestone_name == "committee_meeting", models.ProjectMilestone.status.in_(["completed", "approved"])).scalar() or 0

    subsidy_released_count = db.query(models.ProjectMilestone)\
        .filter(models.ProjectMilestone.milestone_name == "subsidy_released", models.ProjectMilestone.status == "completed").count()

    total_released = db.query(func.sum(models.Project.total_subsidy_received))\
        .filter(models.Project.total_subsidy_received.isnot(None)).scalar() or 0

    # Action queue: projects awaiting inspection or committee decision
    agency_queue_rows = db.query(
        models.Project.id,
        models.Project.project_stage,
        models.Person.first_name,
        models.Person.last_name,
        models.District.name.label("district_name"),
    ).join(models.Person, models.Project.farmer_id == models.Person.id)\
     .outerjoin(models.Village, models.Project.village_id == models.Village.id)\
     .outerjoin(models.Taluka, models.Village.taluka_id == models.Taluka.id)\
     .outerjoin(models.District, models.Taluka.district_id == models.District.id)\
     .filter(models.Project.project_stage.in_(SUBSIDY_STAGES))\
     .order_by(models.Project.id.asc()).limit(8).all()

    agency_queue = [
        {
            "id":        f"PRJ-{r.id}",
            "projectId": r.id,
            "farmer":    f"{r.first_name} {r.last_name or ''}".strip(),
            "district":  r.district_name or "—",
            "stage":     r.project_stage,
            "urgency":   "High" if r.project_stage == "committee_meeting" else "Medium",
        }
        for r in agency_queue_rows
    ]

    return {
        "role":                   "agency_officer",
        "pending_inspection":     pending_inspection,
        "inspections_done":       inspections_done,
        "inspections_passed":     inspections_passed,
        "pass_rate_pct":          pass_rate,
        "committee_meetings_done": committee_meetings_done,
        "committee_pending":      committee_pending,
        "committee_approved":     approved,
        "committee_rejected":     rejected,
        "total_subsidy_approved": round(total_subsidy_approved, 2),
        "subsidy_released_count": subsidy_released_count,
        "total_released":         round(total_released, 2),
        "queue":                  agency_queue,
    }


def _agronomist_kpis(db: Session):
    """Agronomist KPIs — crop advisory & field visit analytics."""
    total_consultations = db.query(models.AgronomistConsultation).count()

    # Unique projects served
    active_farms = db.query(models.AgronomistConsultation.project_id)\
        .distinct().count()

    # Follow-ups pending (follow_up_date is set)
    follow_ups_pending = db.query(models.AgronomistConsultation)\
        .filter(models.AgronomistConsultation.follow_up_date.isnot(None)).count()

    # Pest alerts
    total_pest_alerts = db.query(models.PestAlert).count()
    critical_alerts = db.query(models.PestAlert)\
        .filter(models.PestAlert.severity == "critical",
                models.PestAlert.resolved_at.is_(None)).count()
    high_alerts = db.query(models.PestAlert)\
        .filter(models.PestAlert.severity == "high",
                models.PestAlert.resolved_at.is_(None)).count()
    resolved_alerts = db.query(models.PestAlert)\
        .filter(models.PestAlert.resolved_at.isnot(None)).count()

    # Projects currently at plantation/completed stage (active agronomist scope)
    plantation_projects = db.query(models.Project)\
        .filter(models.Project.project_stage.in_(ALL_ACTIVE_AND_COMPLETED)).count()

    # Per-agronomist consultation breakdown
    agro_rows = db.query(
        models.Person.first_name,
        models.Person.last_name,
        func.count(models.AgronomistConsultation.id).label("consult_count"),
    ).join(models.AgronomistConsultation,
           models.AgronomistConsultation.agronomist_id == models.Person.id)\
     .filter(models.Person.role == "agronomist")\
     .group_by(models.Person.id).all()

    agro_breakdown = [
        {
            "name": f"{r.first_name} {r.last_name or ''}".strip(),
            "consultations": r.consult_count,
        }
        for r in agro_rows
    ]

    # Action queue: projects with unresolved high/critical pest alerts
    agro_queue_rows = db.query(
        models.Project.id,
        models.Project.project_stage,
        models.PestAlert.severity,
        models.Person.first_name,
        models.Person.last_name,
        models.District.name.label("district_name"),
    ).join(models.PestAlert, models.PestAlert.project_id == models.Project.id)\
     .join(models.Person, models.Project.farmer_id == models.Person.id)\
     .outerjoin(models.Village, models.Project.village_id == models.Village.id)\
     .outerjoin(models.Taluka, models.Village.taluka_id == models.Taluka.id)\
     .outerjoin(models.District, models.Taluka.district_id == models.District.id)\
     .filter(
         models.PestAlert.severity.in_(["critical", "high"]),
         models.PestAlert.resolved_at.is_(None),
     ).order_by(models.PestAlert.severity.desc()).limit(8).all()

    agro_queue = [
        {
            "id":        f"PRJ-{r.id}",
            "projectId": r.id,
            "farmer":    f"{r.first_name} {r.last_name or ''}".strip(),
            "district":  r.district_name or "—",
            "urgency":   "High" if r.severity == "critical" else "Medium",
        }
        for r in agro_queue_rows
    ]

    return {
        "role":                "agronomist",
        "total_consultations": total_consultations,
        "active_farms":        active_farms,
        "follow_ups_pending":  follow_ups_pending,
        "total_pest_alerts":   total_pest_alerts,
        "critical_alerts":     critical_alerts,
        "high_alerts":         high_alerts,
        "resolved_alerts":     resolved_alerts,
        "plantation_projects": plantation_projects,
        "agro_breakdown":      agro_breakdown,
        "queue":               agro_queue,
    }


def _project_qs(db, role: Optional[str], user_id: Optional[int]):
    """Return a Project queryset scoped to the caller's role."""
    qs = db.query(models.Project)
    if role == "dealer" and user_id:
        qs = qs.filter(models.Project.dealer_id == user_id)
    elif role == "farmer" and user_id:
        qs = qs.filter(models.Project.farmer_id == user_id)
    elif role in {"structure_contractor","drip_contractor","bed_contractor","plantation_contractor"} and user_id:
        # Contractor sees only projects they are assigned to
        assigned_ids = db.query(models.ProjectContractor.project_id)\
                         .filter(models.ProjectContractor.contractor_id == user_id)\
                         .subquery()
        qs = qs.filter(models.Project.id.in_(assigned_ids))
    # admin / owner / office_staff / project_manager / bank_officer / agency_officer / agronomist → all
    return qs


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.Person = Depends(get_current_user),
):
    """
    Role-aware dashboard stats.
    Role and user_id are derived from the JWT token — never from query params.
    """
    role    = current_user.role
    user_id = current_user.id
    qs = _project_qs(db, role, user_id)

    total_projects  = qs.count()
    active_sites    = qs.filter(models.Project.project_stage.in_(ACTIVE_STAGES)).count()
    pending_subsidy = qs.filter(models.Project.project_stage.in_(SUBSIDY_STAGES)).count()
    completed       = qs.filter(models.Project.project_stage.in_(COMPLETED_STAGES)).count()

    # Financial totals
    eligible_total          = qs.with_entities(func.sum(models.Project.total_project_cost)).scalar() or 0
    subsidy_proposed_total  = qs.with_entities(func.sum(models.Project.total_subsidy_amount_proposed)).scalar() or 0
    subsidy_received_total  = qs.with_entities(func.sum(models.Project.total_subsidy_received)).scalar() or 0

    # Stage breakdown
    stage_counts = {
        row[0]: row[1]
        for row in qs.with_entities(
            models.Project.project_stage,
            func.count(models.Project.id)
        ).group_by(models.Project.project_stage).all()
    }

    # Farmer counts (role-aware)
    if role == "dealer" and user_id:
        from sqlalchemy.orm import aliased
        total_farmers = db.query(models.DealerFarmerMapping)\
                          .filter(models.DealerFarmerMapping.dealer_id == user_id,
                                  models.DealerFarmerMapping.is_active == 1)\
                          .count()
    elif role == "farmer":
        total_farmers = 1
    else:
        total_farmers = db.query(models.Person).filter(models.Person.role == "farmer").count()

    total_staff = db.query(models.Person).filter(models.Person.role.notin_(["farmer"])).count()

    # Role-specific staff counts — only computed for admin/owner/office_staff
    # (saves 10 DB queries for every other role's dashboard load)
    ADMIN_ROLES = {"admin", "owner", "office_staff"}
    if role in ADMIN_ROLES or role is None:
        role_counts = {}
        for r in ["project_manager", "bank_officer", "agency_officer", "agronomist",
                  "office_staff", "dealer", "structure_contractor", "drip_contractor",
                  "bed_contractor", "plantation_contractor"]:
            role_counts[r] = db.query(models.Person).filter(
                models.Person.role == r,
                models.Person.is_active == 1
            ).count()
    else:
        role_counts = {}

    # Per-farmer: my project (for Farmer role)
    my_project = None
    if role == "farmer" and user_id:
        proj = db.query(models.Project)\
                 .filter(models.Project.farmer_id == user_id)\
                 .order_by(models.Project.id.asc()).first()
        if proj:
            # Safe village/location helpers
            _village  = getattr(proj, 'village', None)
            _taluka   = getattr(_village, 'taluka', None) if _village else None
            _district = getattr(_taluka,  'district', None) if _taluka else None
            # Safe area-type helper
            _area_type = getattr(proj, 'area_type', None)

            my_project = {
                "id":                         proj.id,
                "project_code":               proj.project_code,
                "project_name":               proj.project_name,
                "project_stage":              proj.project_stage,
                "crop_category":              proj.crop_category,
                # Cost / subsidy
                "estimated_project_cost":     proj.total_project_cost or 0,
                "total_subsidy_proposed":     proj.total_subsidy_amount_proposed or 0,
                "total_eligible_cost":        proj.total_eligible_cost or 0,
                # Land
                "land_area":                  proj.land_area,
                "land_unit":                  proj.land_unit or "SQM",
                "area_type":                  _area_type.name if _area_type else None,
                # Location
                "village":                    _village.name  if _village  else None,
                "taluka":                     _taluka.name   if _taluka   else None,
                "district":                   _district.name if _district else None,
                # Dates
                "created_at":                 proj.created_at.isoformat()  if proj.created_at         else None,
                "expected_start_date":        proj.expected_start_date.isoformat() if proj.expected_start_date else None,
                "expected_end_date":          proj.expected_end_date.isoformat()   if proj.expected_end_date   else None,
                "actual_start_date":          proj.actual_start_date.isoformat()   if proj.actual_start_date   else None,
            }

    # --- Advanced Analytics Data (Admin & Dealer Phase 2) ---
    from datetime import datetime, timedelta
    now = datetime.now()
    
    admin_metrics = {}
    if role in ADMIN_ROLES or role is None:
        # REGION_DATA
        region_rows = qs.join(models.Village, models.Project.village_id == models.Village.id)\
                        .join(models.Taluka, models.Village.taluka_id == models.Taluka.id)\
                        .join(models.District, models.Taluka.district_id == models.District.id)\
                        .with_entities(models.District.name, func.count(models.Project.id))\
                        .group_by(models.District.name).all()
        admin_metrics["region_data"] = [{"name": r[0], "count": r[1]} for r in region_rows]
        
        # trend_data removed — previous implementation used heuristic arithmetic
        # (total_projects minus an offset) rather than real date-based counts.
        # A correct implementation would query Project.created_at grouped by
        # week/month, which can be added when time-series analytics is built out.
        
        # velocity_data removed — the previous implementation used project *counts*
        # as the "days" value which was incorrect and misleading. Real avg-days-per-stage
        # requires tracking stage_entered_at timestamps which are not yet stored.
        # Removed from frontend charts too.

        # PHASE 3: Bank, GOC, and Erection KPIs
        admin_metrics["kpis"] = {
            "bank_wip": qs.filter(models.Project.project_stage.in_(BANK_STAGES)).outerjoin(models.ProjectMilestone, (models.Project.id == models.ProjectMilestone.project_id) & (models.ProjectMilestone.milestone_name == "bank_processing") & (models.ProjectMilestone.status == "completed")).filter(models.ProjectMilestone.id.is_(None)).count(),
            "bank_sanctioned": qs.join(models.ProjectMilestone, models.Project.id == models.ProjectMilestone.project_id).filter(models.ProjectMilestone.milestone_name == "bank_processing", models.ProjectMilestone.status == "completed").count(),
            "goc_applied": qs.filter(models.Project.project_stage.in_(GOC_STAGES)).outerjoin(models.ProjectMilestone, (models.Project.id == models.ProjectMilestone.project_id) & (models.ProjectMilestone.milestone_name == "goc_registration") & (models.ProjectMilestone.status == "completed")).filter(models.ProjectMilestone.id.is_(None)).count(),
            "goc_approved": qs.join(models.ProjectMilestone, models.Project.id == models.ProjectMilestone.project_id).filter(models.ProjectMilestone.milestone_name == "goc_registration", models.ProjectMilestone.status == "completed").count(),
            "erection_wip": qs.filter(models.Project.project_stage.in_(ACTIVE_STAGES)).count(),
            "erection_completed": qs.filter(models.Project.project_stage.in_(COMPLETED_STAGES)).count()
        }

        # PIPELINE STACK CHART (Last 6 Months)
        # Fix: DPR now correctly uses DESIGN stages (site_visit, design_boq, dpr_ready)
        # instead of ONBOARDING_STAGES which was a copy-paste bug.
        from constants.stages import DESIGN
        DESIGN_STAGES = list(DESIGN)
        stack = []
        for i in reversed(range(6)):
            target_month = now - timedelta(days=i*30)
            month_name = target_month.strftime("%b")
            month_qs = qs.filter(
                func.extract('month', models.Project.created_at) == target_month.month,
                func.extract('year',  models.Project.created_at) == target_month.year,
            )
            stack.append({
                "month":     month_name,
                "Sourcing":  month_qs.filter(models.Project.project_stage.in_(ONBOARDING_STAGES)).count(),
                "DPR":       month_qs.filter(models.Project.project_stage.in_(DESIGN_STAGES)).count(),
                "Banking":   month_qs.filter(models.Project.project_stage.in_(BANK_STAGES)).count(),
                "GOC":       month_qs.filter(models.Project.project_stage.in_(GOC_STAGES)).count(),
                "Erection":  month_qs.filter(models.Project.project_stage.in_(ACTIVE_STAGES)).count(),
                "Subsidy":   month_qs.filter(models.Project.project_stage.in_(SUBSIDY_STAGES)).count(),
                "Completed": month_qs.filter(models.Project.project_stage.in_(COMPLETED_STAGES)).count(),
            })
        admin_metrics["pipeline_stack"] = stack

        # AREA_DATA CHART
        area_rows = qs.with_entities(models.ProjectAreaType.name, func.count(models.Project.id))\
                      .join(models.ProjectAreaType, models.Project.area_type_id == models.ProjectAreaType.id)\
                      .group_by(models.ProjectAreaType.name).all()
        admin_metrics["area_data"] = [{"name": r[0], "count": r[1]} for r in area_rows]

    dealer_metrics = {}
    if role == "dealer" and user_id:
        leads = total_farmers
        registered = qs.filter(models.Project.project_stage.notin_(ONBOARDING_STAGES)).count()
        started = active_sites
        done = completed
        dealer_metrics["funnel_data"] = [
            {"value": leads, "name": "Leads", "fill": "#6366f1"},
            {"value": registered, "name": "Registered", "fill": "#0ea5e9"},
            {"value": started, "name": "Projects Started", "fill": "#f59e0b"},
            {"value": done, "name": "Completed", "fill": "#22c55e"}
        ]
        
        dist_rows = qs.join(models.Village, models.Project.village_id == models.Village.id)\
                      .join(models.Taluka, models.Village.taluka_id == models.Taluka.id)\
                      .join(models.District, models.Taluka.district_id == models.District.id)\
                      .with_entities(models.District.name, func.count(models.Project.id))\
                      .group_by(models.District.name).all()
        dealer_metrics["district_data"] = [{"name": r[0], "count": r[1]} for r in dist_rows]

        # Commission estimates (2% of eligible project cost per industry standard)
        COMMISSION_RATE = 0.02
        earned_cost = qs.filter(models.Project.project_stage.in_(COMPLETED_STAGES))\
                        .with_entities(func.sum(models.Project.total_project_cost)).scalar() or 0
        pending_cost = qs.filter(models.Project.project_stage.in_(list(CONSTRUCTION | SUBSIDY)))\
                        .with_entities(func.sum(models.Project.total_project_cost)).scalar() or 0
        dealer_metrics["commission"] = {
            "earned":       round(earned_cost  * COMMISSION_RATE, 2),
            "pending":      round(pending_cost * COMMISSION_RATE, 2),
            "rate_pct":     round(COMMISSION_RATE * 100, 1),
        }

        # Dealer leaderboard — single aggregated query instead of N+1
        leaderboard_rows = (
            db.query(
                models.Person,
                func.count(models.Project.id).label("project_count"),
            )
            .outerjoin(models.Project, models.Project.dealer_id == models.Person.id)
            .filter(models.Person.role == "dealer")
            .group_by(models.Person.id)
            .order_by(func.count(models.Project.id).desc())
            .limit(5)
            .all()
        )
        board = []
        for dealer, cnt in leaderboard_rows:
            try:
                location = dealer.village.taluka.district.name
            except AttributeError:
                location = "Unknown"
            board.append({
                "name":     "You" if dealer.id == user_id else f"{dealer.first_name} {dealer.last_name or ''}".strip(),
                "location": location,
                "projects": cnt,
                "isMe":     dealer.id == user_id,
            })
        dealer_metrics["leaderboard"] = board

    return {
        "total_projects":         total_projects,
        "total_farmers":          total_farmers,
        "total_staff":            total_staff,
        "active_sites":           active_sites,
        "pending_subsidy":        pending_subsidy,
        "completed":              completed,
        "total_eligible_cost":      eligible_total,
        "total_subsidy_proposed":   round(subsidy_proposed_total, 2),
        "total_subsidy_received":   round(subsidy_received_total, 2),
        "total_subsidy_potential":  eligible_total * 0.5,
        "stage_breakdown":        stage_counts,
        "my_project":             my_project,
        "role_counts":            role_counts,
        "admin_metrics":          admin_metrics,
        "dealer_metrics":         dealer_metrics,
    }
