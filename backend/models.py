"""
ICON APP - Agricultural Project Management System
Complete SQLAlchemy Models - All 25+ Tables
Version: 2.0
"""

from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Boolean,
    ForeignKey, Text, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# =============================================================================
# 1. REFERENCE / LOOKUP TABLES
# =============================================================================

class State(Base):
    __tablename__ = "states"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    short_name = Column(String(10), unique=True)
    name       = Column(String(100), unique=True, nullable=False)

    districts = relationship("District", back_populates="state")

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    name = Column(String(100), nullable=False)

    state = relationship("State", back_populates="districts")
    talukas = relationship("Taluka", back_populates="district")

class Taluka(Base):
    __tablename__ = "talukas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    name = Column(String(100), nullable=False)

    district = relationship("District", back_populates="talukas")
    villages = relationship("Village", back_populates="taluka")

class Village(Base):
    __tablename__ = "villages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    taluka_id = Column(Integer, ForeignKey("talukas.id"), nullable=False)
    name = Column(String(100), nullable=False)
    pincode = Column(String(10))

    taluka = relationship("Taluka", back_populates="villages")

class ProjectAreaType(Base):
    __tablename__ = "project_area_types"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    name              = Column(String(100), nullable=False, unique=True)
    description       = Column(Text)
    multiplier        = Column(Float, default=1.0, nullable=False)
    is_active         = Column(Integer, default=1)

    projects = relationship("Project", back_populates="area_type")


class Skill(Base):
    __tablename__ = "skills"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(100), nullable=False, unique=True)
    code        = Column(String(20), unique=True)
    description = Column(Text)
    created_at  = Column(DateTime, default=func.now())

    contractor_skills = relationship("ContractorSkill", back_populates="skill")
    project_contractors = relationship("ProjectContractor", back_populates="skill")


class ContractorSkill(Base):
    __tablename__ = "contractor_skills"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    contractor_id   = Column(Integer, ForeignKey("person.id"), nullable=False)
    skill_id       = Column(Integer, ForeignKey("skills.id"), nullable=False)
    certified       = Column(Integer, default=0)
    years_experience = Column(Integer, default=0)
    remarks        = Column(Text)
    created_at     = Column(DateTime, default=func.now())

    __table_args__ = (UniqueConstraint("contractor_id", "skill_id", name="uq_contractor_skill"),)

    contractor = relationship("Person", back_populates="skills")
    skill      = relationship("Skill", back_populates="contractor_skills")


class Component(Base):
    """
    Unified master data table for Structures, Crops, and Components.
    Replaces: structures, crops, structure_types, component_categories, components
    """
    __tablename__ = "components"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    component_type          = Column(String(30), nullable=False)   # Structure | Crop | Component
    name                    = Column(String(150), nullable=False)
    category                = Column(String(100))   # Structure type / Crop category / Component category
    variant_code            = Column(String(30))   # e.g. NVPH-N, FPPH, VEG-001
    unit                    = Column(String(30), nullable=False, default='SQM')  # SQM | NOS | Rolls | Pieces | Set
    eligible_cost_per_unit  = Column(Float, nullable=False, default=0.0)
    subsidy_rate_per_unit   = Column(Float, nullable=False, default=0.0)
    unit_type               = Column(String(30))   # Per Project | Per Acre | Per SQM
    min_qty                = Column(Integer)
    max_qty                = Column(Integer)
    default_qty            = Column(Integer)
    is_subsidy_eligible     = Column(Integer, default=1)
    is_active               = Column(Integer, default=1)
    description             = Column(Text)
    created_at              = Column(DateTime, default=func.now())

    @property
    def subsidy_per_sqm(self):
        return self.subsidy_rate_per_unit if self.unit in ('SQM',) else 0.0

    @property
    def eligible_project_cost_per_sqm(self):
        return self.eligible_cost_per_unit if self.unit in ('SQM',) else 0.0


class GovernmentAgency(Base):
    __tablename__ = "government_agencies"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(200), nullable=False)
    short_code  = Column(String(20), unique=True)
    description = Column(Text)
    website     = Column(String(255))
    is_active   = Column(Integer, default=1)
    created_at  = Column(DateTime, default=func.now())

    projects = relationship("Project", back_populates="subsidy_agency")


# =============================================================================
# 2. USERS & COMPANY
# =============================================================================

class Person(Base):
    __tablename__ = "person"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    first_name        = Column(String(100), nullable=False)
    last_name         = Column(String(100))
    full_name         = Column(String(200))
    role              = Column(String(50), nullable=False, index=True)
    phone_primary     = Column(String(20), nullable=False, unique=True)
    phone_secondary   = Column(String(20))
    whatsapp_number   = Column(String(20))
    email             = Column(String(150))
    address_line1     = Column(String(255))
    address_line2     = Column(String(255))
    village_id        = Column(Integer, ForeignKey("villages.id"))
    is_active         = Column(Integer, default=1)
    remarks           = Column(Text)
    hashed_password   = Column(String(255))
    created_at        = Column(DateTime, default=func.now())
    updated_at        = Column(DateTime, onupdate=func.now())

    # Relationships
    projects_as_farmer    = relationship("Project", foreign_keys="[Project.farmer_id]",      back_populates="farmer")
    projects_as_dealer    = relationship("Project", foreign_keys="[Project.dealer_id]",      back_populates="dealer")
    projects_as_manager   = relationship("Project", foreign_keys="[Project.project_manager_id]", back_populates="project_manager")
    companies_owned       = relationship("Company", back_populates="owner")
    site_visits           = relationship("SiteVisit", foreign_keys="[SiteVisit.visited_by]", back_populates="visitor")
    notifications         = relationship("Notification", back_populates="user")
    dealer_farmers        = relationship("DealerFarmerMapping", foreign_keys="[DealerFarmerMapping.dealer_id]", back_populates="dealer")
    farmer_dealers        = relationship("DealerFarmerMapping", foreign_keys="[DealerFarmerMapping.farmer_id]", back_populates="farmer")
    agronomist_consults   = relationship("AgronomistConsultation", foreign_keys="[AgronomistConsultation.agronomist_id]", back_populates="agronomist")
    skills               = relationship("ContractorSkill", back_populates="contractor")
    village              = relationship("Village")
    farmer_profile       = relationship("FarmerProfile", back_populates="person", uselist=False, cascade="all, delete-orphan")
    business_profile     = relationship("BusinessProfile", back_populates="person", uselist=False, cascade="all, delete-orphan")
    employee_profile     = relationship("EmployeeProfile", back_populates="person", uselist=False, cascade="all, delete-orphan")


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    person_id      = Column(Integer, ForeignKey("person.id", ondelete="CASCADE"), nullable=False, unique=True)
    aadhaar_number = Column(String(20), unique=True)
    pan_number     = Column(String(15), unique=True)
    land_area      = Column(Float)
    land_unit      = Column(String(10), default="SQM")
    
    person = relationship("Person", back_populates="farmer_profile")


class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    person_id      = Column(Integer, ForeignKey("person.id", ondelete="CASCADE"), nullable=False, unique=True)
    firm_name      = Column(String(200))
    gst_number     = Column(String(20))
    registration_number = Column(String(100))
    
    person = relationship("Person", back_populates="business_profile")


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    person_id      = Column(Integer, ForeignKey("person.id", ondelete="CASCADE"), nullable=False, unique=True)
    designation    = Column(String(100))
    joining_date   = Column(Date)
    
    person = relationship("Person", back_populates="employee_profile")


class Company(Base):
    __tablename__ = "companies"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    name                = Column(String(200), nullable=False)
    owner_id            = Column(Integer, ForeignKey("person.id"), nullable=False)
    registration_number = Column(String(100))
    gst_number          = Column(String(20))
    address             = Column(Text)
    phone               = Column(String(20))
    email               = Column(String(150))
    is_active           = Column(Integer, default=1)
    created_at          = Column(DateTime, default=func.now())

    owner    = relationship("Person", back_populates="companies_owned")
    regions  = relationship("CompanyRegion", back_populates="company")
    projects = relationship("Project", back_populates="company")


class CompanyRegion(Base):
    __tablename__ = "company_regions"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name       = Column(String(100), nullable=False)
    district_id= Column(Integer, ForeignKey("districts.id"))
    taluka_id  = Column(Integer, ForeignKey("talukas.id"))
    manager_id = Column(Integer, ForeignKey("person.id"))
    created_at = Column(DateTime, default=func.now())

    company = relationship("Company", back_populates="regions")
    manager = relationship("Person")
    district = relationship("District")
    taluka   = relationship("Taluka")


# =============================================================================
# 3. BANK TABLES
# =============================================================================

class Bank(Base):
    __tablename__ = "banks"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(200), nullable=False)
    short_name = Column(String(50))
    created_at = Column(DateTime, default=func.now())

    branches = relationship("BankBranch", back_populates="bank")


class BankBranch(Base):
    __tablename__ = "bank_branches"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    bank_id     = Column(Integer, ForeignKey("banks.id"), nullable=False)
    branch_name = Column(String(200))
    branch_code = Column(String(50))
    ifsc        = Column(String(20), unique=True)
    address     = Column(Text)
    village_id  = Column(Integer, ForeignKey("villages.id"))
    phone       = Column(String(20))
    email       = Column(String(150))
    created_at  = Column(DateTime, default=func.now())

    bank     = relationship("Bank", back_populates="branches")
    contacts = relationship("BankContact", back_populates="branch")
    projects = relationship("Project", back_populates="bank_branch")
    village  = relationship("Village")


class BankContact(Base):
    __tablename__ = "bank_contacts"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    branch_id   = Column(Integer, ForeignKey("bank_branches.id"), nullable=False)
    name        = Column(String(150), nullable=False)
    designation = Column(String(100))
    phone       = Column(String(20))
    email       = Column(String(150))
    created_at  = Column(DateTime, default=func.now())

    branch = relationship("BankBranch", back_populates="contacts")


# =============================================================================
# 4. FARMER ONBOARDING & MAPPING
# =============================================================================

class FarmerRegistration(Base):
    __tablename__ = "farmer_registrations"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    farmer_id           = Column(Integer, ForeignKey("person.id"), nullable=False)
    registered_by       = Column(Integer, ForeignKey("person.id"), nullable=False)
    registration_date   = Column(Date, nullable=False)
    registration_method = Column(String(20))   # dealer / company
    status              = Column(String(20), default="pending")   # pending / approved / rejected
    approved_by         = Column(Integer, ForeignKey("person.id"))
    approval_date       = Column(Date)
    remarks             = Column(Text)
    created_at          = Column(DateTime, default=func.now())

    farmer       = relationship("Person", foreign_keys=[farmer_id])
    registered  = relationship("Person", foreign_keys=[registered_by])
    approver     = relationship("Person", foreign_keys=[approved_by])


class DealerFarmerMapping(Base):
    __tablename__ = "dealer_farmer_mapping"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    dealer_id     = Column(Integer, ForeignKey("person.id"), nullable=False)
    farmer_id     = Column(Integer, ForeignKey("person.id"), nullable=False)
    assigned_date = Column(Date, nullable=False)
    is_active     = Column(Integer, default=1)
    created_at    = Column(DateTime, default=func.now())

    dealer = relationship("Person", foreign_keys=[dealer_id], back_populates="dealer_farmers")
    farmer = relationship("Person", foreign_keys=[farmer_id], back_populates="farmer_dealers")

    __table_args__ = (UniqueConstraint("dealer_id", "farmer_id", name="uq_dealer_farmer"),)


class CompanyDealerMapping(Base):
    __tablename__ = "company_dealer_mapping"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    company_id      = Column(Integer, ForeignKey("companies.id"), nullable=False)
    dealer_id       = Column(Integer, ForeignKey("person.id"), nullable=False)
    assigned_date   = Column(Date, nullable=False)
    commission_rate = Column(Float)
    is_active       = Column(Integer, default=1)
    created_at      = Column(DateTime, default=func.now())

    __table_args__ = (UniqueConstraint("company_id", "dealer_id", name="uq_company_dealer"),)


# =============================================================================
# 5. CORE PROJECT
# =============================================================================

VALID_STAGES = [
    "draft",
    "farmer_onboarding", "document_collection", "site_visit",
    "design_boq", "dpr_ready", "bank_processing", "goc_registration",
    "m1_foundation", "m2_structure_erection", "m3_covering_material",
    "m4_trellising", "m5_drip_fitting", "m6_bed_preparation",
    "m7_plantation", "subsidy_claim", "agency_inspection",
    "committee_meeting", "subsidy_released", "completed"
]


class Project(Base):
    __tablename__ = "projects"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    project_code        = Column(String(50), unique=True)
    project_name        = Column(String(200))
    company_id          = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_by          = Column(Integer, ForeignKey("person.id"), nullable=False)
    project_manager_id  = Column(Integer, ForeignKey("person.id"))
    farmer_id           = Column(Integer, ForeignKey("person.id"), nullable=False)
    dealer_id           = Column(Integer, ForeignKey("person.id"))
    bank_branch_id      = Column(Integer, ForeignKey("bank_branches.id"))
    area_type_id        = Column(Integer, ForeignKey("project_area_types.id"), nullable=False)
    subsidy_agency_id   = Column(Integer, ForeignKey("government_agencies.id"))
    crop_category       = Column(String(50))

    # Location
    village_id = Column(Integer, ForeignKey("villages.id"))
    khasra_no  = Column(String(100))
    survey_no  = Column(String(100))
    land_area  = Column(Float)
    land_unit  = Column(String(10), default="SQM")
    latitude   = Column(Float)
    longitude  = Column(Float)

    # Status
    project_stage     = Column(String(50), default="farmer_onboarding", index=True)
    priority          = Column(String(10), default="normal")
    expected_start_date = Column(Date)
    expected_end_date   = Column(Date)
    actual_start_date   = Column(Date)
    actual_end_date     = Column(Date)

    # Subsidy Financials
    total_eligible_cost    = Column(Float)
    total_subsidy_claimed  = Column(Float)
    total_subsidy_received = Column(Float)
    
    # New Computed Totals
    total_eligible_project_cost   = Column(Float, default=0.0)
    total_project_cost            = Column(Float, default=0.0)
    total_subsidy_amount_proposed = Column(Float, default=0.0)

    # Site Visit Tracking
    last_site_visit_date = Column(Date)
    last_site_visit_by   = Column(Integer, ForeignKey("person.id"))
    site_visit_count     = Column(Integer, default=0)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    company         = relationship("Company", back_populates="projects")
    creator         = relationship("Person", foreign_keys=[created_by])
    project_manager = relationship("Person", foreign_keys=[project_manager_id], back_populates="projects_as_manager")
    farmer          = relationship("Person", foreign_keys=[farmer_id], back_populates="projects_as_farmer")
    dealer          = relationship("Person", foreign_keys=[dealer_id], back_populates="projects_as_dealer")
    bank_branch     = relationship("BankBranch", back_populates="projects")
    area_type       = relationship("ProjectAreaType", back_populates="projects")
    subsidy_agency  = relationship("GovernmentAgency", back_populates="projects")
    village         = relationship("Village")

    items              = relationship("ProjectItem", back_populates="project", cascade="all, delete-orphan")
    contractors        = relationship("ProjectContractor", back_populates="project", cascade="all, delete-orphan")
    milestones         = relationship("ProjectMilestone",  back_populates="project", cascade="all, delete-orphan")
    site_visits        = relationship("SiteVisit",         back_populates="project", cascade="all, delete-orphan")
    daily_reports      = relationship("DailySiteReport",   back_populates="project", cascade="all, delete-orphan")
    documents          = relationship("ProjectDocument",   back_populates="project", cascade="all, delete-orphan")
    progress_photos    = relationship("ProjectProgressPhoto", back_populates="project", cascade="all, delete-orphan")
    agronomist_consults = relationship("AgronomistConsultation", back_populates="project", cascade="all, delete-orphan")
    pest_alerts        = relationship("PestAlert",         back_populates="project", cascade="all, delete-orphan")
    notifications_rel  = relationship("Notification",      back_populates="project")
    co_applicants      = relationship("ProjectCoApplicant", back_populates="project", cascade="all, delete-orphan")


class ProjectCoApplicant(Base):
    """Additional farmers attached to a project as co-applicants."""
    __tablename__ = "project_co_applicants"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    farmer_id  = Column(Integer, ForeignKey("person.id",   ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        UniqueConstraint("project_id", "farmer_id", name="uq_project_co_applicant"),
    )

    project = relationship("Project",  back_populates="co_applicants")
    farmer  = relationship("Person",   foreign_keys=[farmer_id])


class ProjectItem(Base):
    __tablename__ = "project_items"

    id                       = Column(Integer, primary_key=True, autoincrement=True)
    project_id               = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    line_type                = Column(String(30), nullable=False)  # Structure | Crop | Component
    item_id                  = Column(Integer, nullable=False)
    unit                     = Column(String(50))  # nos/sqm
    qty                      = Column(Float, default=0.0)
    subsidy_rate_per_unit    = Column(Float, default=0.0)
    subsidy_unit_cost        = Column(Float, default=0.0)
    subsidy_state_multiplier = Column(Float, default=1.0)
    subsidy_eligible_amount  = Column(Float, default=0.0)
    subsidy_rate             = Column(Float, default=0.0)  # percentage
    subsidy_amount           = Column(Float, default=0.0)
    actual_rate_per_unit     = Column(Float, default=0.0)
    actual_unit_cost         = Column(Float, default=0.0)
    
    created_at               = Column(DateTime, default=func.now())

    project    = relationship("Project", back_populates="items")
    stage_logs = relationship("StructureStageLog", back_populates="project_item", cascade="all, delete-orphan")


# =============================================================================
# 6. CONTRACTORS
# =============================================================================

class ProjectContractor(Base):
    __tablename__ = "project_contractors"

    id                       = Column(Integer, primary_key=True, autoincrement=True)
    project_id               = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    contractor_id            = Column(Integer, ForeignKey("person.id"), nullable=False)
    skill_id                 = Column(Integer, ForeignKey("skills.id"), nullable=False)
    assigned_date            = Column(Date)
    start_date               = Column(Date)
    expected_completion_date = Column(Date)
    actual_completion_date   = Column(Date)
    status                   = Column(String(20), default="assigned")
    payment_amount           = Column(Float)
    payment_status           = Column(String(20), default="pending")
    remarks                  = Column(Text)
    created_at               = Column(DateTime, default=func.now())

    project          = relationship("Project", back_populates="contractors")
    contractor       = relationship("Person")
    skill           = relationship("Skill", back_populates="project_contractors")


# =============================================================================
# 7. FIELD OPERATIONS
# =============================================================================

class SiteVisit(Base):
    __tablename__ = "site_visits"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    project_id        = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    visited_by        = Column(Integer, ForeignKey("person.id"), nullable=False)
    visit_date        = Column(Date, nullable=False)
    visit_type        = Column(String(20))   # scheduled / unscheduled / emergency
    visit_latitude    = Column(Float)
    visit_longitude   = Column(Float)
    location_verified = Column(Integer, default=0)
    work_status       = Column(Text)
    laborers_present  = Column(Integer)
    materials_status  = Column(Text)
    quality_issues    = Column(Text)
    photos            = Column(Text)   # JSON list of paths
    actions_taken     = Column(Text)
    follow_up_required = Column(Integer, default=0)
    follow_up_date    = Column(Date)
    remarks           = Column(Text)
    created_at        = Column(DateTime, default=func.now())

    project = relationship("Project", back_populates="site_visits")
    visitor = relationship("Person", foreign_keys=[visited_by], back_populates="site_visits")


class DailySiteReport(Base):
    __tablename__ = "daily_site_reports"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    project_id           = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project_item_id      = Column(Integer, ForeignKey("project_items.id", ondelete="SET NULL"))
    report_date          = Column(Date, nullable=False)
    supervisor_id        = Column(Integer, ForeignKey("person.id"))
    work_done            = Column(Text)
    labor_count          = Column(Integer)
    issues               = Column(Text)
    next_plan            = Column(Text)
    created_at           = Column(DateTime, default=func.now())

    project    = relationship("Project", back_populates="daily_reports")
    supervisor = relationship("Person")


class AgronomistConsultation(Base):
    __tablename__ = "agronomist_consultations"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    project_id              = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    agronomist_id           = Column(Integer, ForeignKey("person.id"), nullable=False)
    consultation_date       = Column(Date, nullable=False)
    crop_advice             = Column(Text)
    fertilizer_recommendations = Column(Text)
    pest_control_measures   = Column(Text)
    irrigation_schedule     = Column(Text)
    expected_yield          = Column(Float)
    follow_up_date          = Column(Date)
    remarks                 = Column(Text)
    created_at              = Column(DateTime, default=func.now())

    project    = relationship("Project", back_populates="agronomist_consults")
    agronomist = relationship("Person", foreign_keys=[agronomist_id], back_populates="agronomist_consults")


class PestAlert(Base):
    __tablename__ = "pest_alerts"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    project_id     = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    alert_type     = Column(String(100))
    severity       = Column(String(20))   # low / medium / high / critical
    description    = Column(Text)
    recommendation = Column(Text)
    reported_by    = Column(Integer, ForeignKey("person.id"))
    resolved_at    = Column(DateTime)
    created_at     = Column(DateTime, default=func.now())

    project    = relationship("Project", back_populates="pest_alerts")
    reporter   = relationship("Person")


# =============================================================================
# 8. AUDIT, DOCS & LOGS
# =============================================================================

class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    project_id       = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    milestone_name   = Column(String(100), nullable=False)
    status           = Column(String(50)) 
    start_date       = Column(Date)
    completion_date  = Column(Date)
    reference_number = Column(String(100))
    amount           = Column(Float)
    document_path    = Column(String(500))
    remarks          = Column(Text)
    updated_by       = Column(Integer, ForeignKey("person.id"))
    created_at       = Column(DateTime, default=func.now())

    project           = relationship("Project", back_populates="milestones")
    updated_by_person = relationship("Person")


class StructureStageLog(Base):
    __tablename__ = "structure_stage_logs"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    project_item_id      = Column(Integer, ForeignKey("project_items.id", ondelete="CASCADE"), nullable=False)
    stage_name           = Column(String(100), nullable=False)
    start_date           = Column(Date)
    end_date             = Column(Date)
    progress_percent     = Column(Float, default=0)
    status               = Column(String(20), default="pending")
    remarks              = Column(Text)
    updated_by           = Column(Integer, ForeignKey("person.id"))
    created_at           = Column(DateTime, default=func.now())

    project_item      = relationship("ProjectItem", back_populates="stage_logs")
    updated_by_person = relationship("Person")


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    project_id    = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(100), nullable=False)
    stage         = Column(String(100))
    file_name     = Column(String(255), nullable=False)
    file_path     = Column(String(500), nullable=False)
    file_size     = Column(Integer)
    mime_type     = Column(String(100))
    version       = Column(Integer, default=1)
    is_verified   = Column(Integer, default=0)
    verified_by   = Column(Integer, ForeignKey("person.id"), nullable=True)
    verified_at   = Column(DateTime, nullable=True)
    remarks       = Column(Text)
    approved_by   = Column(Integer, ForeignKey("person.id"), nullable=True)
    uploaded_by   = Column(Integer, ForeignKey("person.id"), nullable=True)
    created_at    = Column(DateTime, default=func.now())
    updated_at    = Column(DateTime, onupdate=func.now())

    project  = relationship("Project", back_populates="documents")
    uploader = relationship("Person",  foreign_keys=[uploaded_by])
    verifier = relationship("Person",  foreign_keys=[verified_by])
    approver = relationship("Person",  foreign_keys=[approved_by])


class ProjectProgressPhoto(Base):
    __tablename__ = "project_progress_photos"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    project_id           = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project_item_id      = Column(Integer, ForeignKey("project_items.id", ondelete="SET NULL"))
    stage                = Column(String(100))
    file_path            = Column(String(500), nullable=False)
    geo_location         = Column(String(100))
    uploaded_by          = Column(Integer, ForeignKey("person.id"))
    created_at           = Column(DateTime, default=func.now())

    project   = relationship("Project", back_populates="progress_photos")
    uploader  = relationship("Person")


# =============================================================================
# 9. NOTIFICATIONS
# =============================================================================

class Notification(Base):
    __tablename__ = "notifications"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    user_id             = Column(Integer, ForeignKey("person.id"), nullable=False)
    title               = Column(String(200), nullable=False)
    message             = Column(Text, nullable=False)
    type                = Column(String(50))   # stage_change / task_assigned / document_required / etc.
    is_read             = Column(Integer, default=0)
    related_entity_type = Column(String(50))   # project / farmer / document
    related_entity_id   = Column(Integer)
    project_id          = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"))
    created_at          = Column(DateTime, default=func.now())

    user    = relationship("Person", back_populates="notifications")
    project = relationship("Project", back_populates="notifications_rel")

# =============================================================================
# 10. DOCUMENT TYPE MASTER TABLE
# =============================================================================

class DocumentType(Base):
    """
    Master lookup table for all document types used across the system.
    Replaces hard-coded lists in uploads.py and frontend components.
    """
    __tablename__ = "document_types"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(150), unique=True, nullable=False)
    category      = Column(String(50), nullable=False)   # KYC | Land | Bank | Project | Agency | Completion | Other
    description   = Column(Text)
    allowed_roles = Column(String(300))   # comma-separated roles, NULL = all roles allowed
    is_required   = Column(Integer, default=0)  # 1 = required in its context
    is_active     = Column(Integer, default=1)
    sort_order    = Column(Integer, default=0)
    created_at    = Column(DateTime, default=func.now())
