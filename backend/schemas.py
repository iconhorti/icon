"""
ICON APP - Agricultural Project Management System
Complete Pydantic Schemas - All 25+ Tables
Version: 2.0
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import date, datetime


# =============================================================================
# 1. REFERENCE / LOOKUP SCHEMAS
# =============================================================================

class ProjectAreaTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    multiplier: float = 1.0
    is_active: int = 1

class ProjectAreaTypeCreate(ProjectAreaTypeBase):
    pass

class ProjectAreaTypeResponse(ProjectAreaTypeBase):
    id: int
    class Config:
        from_attributes = True

class SkillBase(BaseModel):
    name:        Optional[str] = None
    code:        Optional[str] = None
    description: Optional[str] = None

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: int
    class Config:
        from_attributes = True

class ComponentBase(BaseModel):
    component_type: str
    name: str
    category: Optional[str] = None
    variant_code: Optional[str] = None
    unit: str = 'SQM'
    eligible_cost_per_unit: float
    subsidy_rate_per_unit: float
    unit_type: Optional[str] = None
    min_qty: Optional[int] = None
    max_qty: Optional[int] = None
    default_qty: Optional[int] = None
    is_subsidy_eligible: int = 1
    is_active: int = 1
    description: Optional[str] = None

class ComponentCreate(ComponentBase):
    pass

class ComponentResponse(ComponentBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class GovernmentAgencyBase(BaseModel):
    name: str
    short_code: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    is_active: int = 1

class GovernmentAgencyCreate(GovernmentAgencyBase):
    pass

class GovernmentAgencyResponse(GovernmentAgencyBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================================================
# 1.5 LOCATION SCHEMAS
# =============================================================================

class StateResponse(BaseModel):
    id: int
    name: str
    class Config: from_attributes = True

class DistrictResponse(BaseModel):
    id: int
    state_id: int
    name: str
    class Config: from_attributes = True

class TalukaResponse(BaseModel):
    id: int
    district_id: int
    name: str
    class Config: from_attributes = True

class VillageResponse(BaseModel):
    id: int
    taluka_id: int
    name: str
    pincode: Optional[str] = None
    class Config: from_attributes = True

# =============================================================================
# 2. USERS & COMPANY SCHEMAS
# =============================================================================

class PersonBase(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    phone_primary: str
    phone_secondary: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    village_id: Optional[int] = None
    is_active: int = 1
    remarks: Optional[str] = None

class PersonCreate(PersonBase):
    password: Optional[str] = None

class FarmerProfileBase(BaseModel):
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    land_area: Optional[float] = None
    land_unit: str = "SQM"

class FarmerProfileResponse(FarmerProfileBase):
    id: int
    person_id: int
    class Config: from_attributes = True

class BusinessProfileBase(BaseModel):
    firm_name: Optional[str] = None
    gst_number: Optional[str] = None
    registration_number: Optional[str] = None

class BusinessProfileResponse(BusinessProfileBase):
    id: int
    person_id: int
    class Config: from_attributes = True

class EmployeeProfileBase(BaseModel):
    designation: Optional[str] = None
    joining_date: Optional[date] = None

class EmployeeProfileResponse(EmployeeProfileBase):
    id: int
    person_id: int
    class Config: from_attributes = True

class PersonResponse(PersonBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    farmer_profile: Optional[FarmerProfileResponse] = None
    business_profile: Optional[BusinessProfileResponse] = None
    employee_profile: Optional[EmployeeProfileResponse] = None
    village: Optional[VillageResponse] = None
    class Config:
        from_attributes = True

class CompanyBase(BaseModel):
    name: str
    owner_id: int
    registration_number: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: int = 1

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class CompanyRegionBase(BaseModel):
    company_id: int
    name: str
    district_id: Optional[int] = None
    taluka_id: Optional[int] = None
    manager_id: Optional[int] = None

class CompanyRegionCreate(CompanyRegionBase):
    pass

class CompanyRegionResponse(CompanyRegionBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================================================
# 3. BANK TABLES SCHEMAS
# =============================================================================

class BankBase(BaseModel):
    name: str
    short_name: Optional[str] = None

class BankCreate(BankBase):
    pass

class BankResponse(BankBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class BankBranchBase(BaseModel):
    bank_id: int
    branch_name: Optional[str] = None
    branch_code: Optional[str] = None
    ifsc: Optional[str] = None
    address: Optional[str] = None
    village_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class BankBranchCreate(BankBranchBase):
    pass

class BankBranchResponse(BankBranchBase):
    id: int
    created_at: Optional[datetime] = None
    bank: Optional[BankResponse] = None
    class Config:
        from_attributes = True

class BankContactBase(BaseModel):
    branch_id: int
    name: str
    designation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class BankContactCreate(BankContactBase):
    pass

class BankContactResponse(BankContactBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================================================
# 4. FARMER ONBOARDING & MAPPING SCHEMAS
# =============================================================================

class FarmerRegistrationBase(BaseModel):
    farmer_id: int
    registered_by: int
    registration_date: date
    registration_method: Optional[str] = None
    status: str = "pending"
    approved_by: Optional[int] = None
    approval_date: Optional[date] = None
    remarks: Optional[str] = None

class FarmerRegistrationCreate(FarmerRegistrationBase):
    pass

class FarmerRegistrationResponse(FarmerRegistrationBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class DealerFarmerMappingBase(BaseModel):
    dealer_id: int
    farmer_id: int
    assigned_date: date
    is_active: int = 1

class DealerFarmerMappingCreate(DealerFarmerMappingBase):
    pass

class DealerFarmerMappingResponse(DealerFarmerMappingBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class CompanyDealerMappingBase(BaseModel):
    company_id: int
    dealer_id: int
    assigned_date: date
    commission_rate: Optional[float] = None
    is_active: int = 1

class CompanyDealerMappingCreate(CompanyDealerMappingBase):
    pass

class CompanyDealerMappingResponse(CompanyDealerMappingBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================================================
# 5. CORE PROJECT SCHEMAS
# =============================================================================

class ProjectBase(BaseModel):
    project_code: Optional[str] = None
    project_name: Optional[str] = None
    company_id: int
    created_by: int
    project_manager_id: Optional[int] = None
    farmer_id: int
    dealer_id: Optional[int] = None
    bank_branch_id: Optional[int] = None
    area_type_id: int
    subsidy_agency_id: Optional[int] = None
    crop_category: Optional[str] = None
    
    village_id: Optional[int] = None
    khasra_no: Optional[str] = None
    survey_no: Optional[str] = None
    land_area: Optional[float] = None
    land_unit: str = "SQM"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    project_stage: str = "farmer_onboarding"
    priority: str = "normal"
    expected_start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None

class ProjectCreate(ProjectBase):
    # Optimistic-concurrency token echoed back by the client on update (ignored on create).
    version: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: int
    version: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    total_eligible_cost: Optional[float] = None
    total_subsidy_claimed: Optional[float] = None
    total_subsidy_received: Optional[float] = None
    total_eligible_project_cost: Optional[float] = 0.0
    total_project_cost: Optional[float] = 0.0
    total_subsidy_amount_proposed: Optional[float] = 0.0
    
    class Config:
        from_attributes = True

class ProjectListResponse(ProjectResponse):
    farmer: Optional[PersonResponse] = None
    dealer: Optional[PersonResponse] = None
    bank_branch: Optional[BankBranchResponse] = None
    area_type: Optional[ProjectAreaTypeResponse] = None
    
    class Config:
        from_attributes = True

class ProjectPageResponse(BaseModel):
    items: List[ProjectListResponse]
    total: int

class ProjectDetailResponse(ProjectResponse):
    farmer: Optional[PersonResponse] = None
    dealer: Optional[PersonResponse] = None
    bank_branch: Optional[BankBranchResponse] = None
    area_type: Optional[ProjectAreaTypeResponse] = None
    items: List["ProjectItemResponse"] = []
    
    class Config:
        from_attributes = True

class ProjectItemBase(BaseModel):
    project_id: int
    line_type: str
    item_id: int
    unit: Optional[str] = None
    qty: float = 0.0
    subsidy_rate_per_unit: float = 0.0
    subsidy_unit_cost: float = 0.0
    subsidy_state_multiplier: float = 1.0
    subsidy_eligible_amount: float = 0.0
    subsidy_rate: float = 0.0
    subsidy_amount: float = 0.0
    actual_rate_per_unit: float = 0.0
    actual_unit_cost: float = 0.0

class ProjectItemCreate(ProjectItemBase):
    pass

class ProjectItemResponse(ProjectItemBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================================================
# 6. CONTRACTORS SCHEMAS
# =============================================================================

class ProjectContractorBase(BaseModel):
    project_id: int
    contractor_id: int
    skill_id: int
    assigned_date: Optional[date] = None
    start_date: Optional[date] = None
    expected_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    status: str = "assigned"
    payment_amount: Optional[float] = None
    payment_status: str = "pending"
    remarks: Optional[str] = None

class ProjectContractorCreate(ProjectContractorBase):
    pass

class ProjectContractorResponse(ProjectContractorBase):
    id: int
    created_at: Optional[datetime] = None
    contractor: Optional[PersonResponse] = None
    skill: Optional[SkillResponse] = None
    class Config:
        from_attributes = True


class ContractorSkillBase(BaseModel):
    contractor_id: int
    skill_id: int
    certified: Optional[int] = 0
    years_experience: Optional[int] = 0
    remarks: Optional[str] = None

class ContractorSkillCreate(ContractorSkillBase):
    pass

class ContractorSkillResponse(ContractorSkillBase):
    id: int
    skill: Optional[SkillResponse] = None
    class Config:
        from_attributes = True


# =============================================================================
# 7. FIELD OPERATIONS SCHEMAS
# =============================================================================

class SiteVisitBase(BaseModel):
    project_id: int
    visited_by: int
    visit_date: date
    visit_type: Optional[str] = None
    visit_latitude: Optional[float] = None
    visit_longitude: Optional[float] = None
    location_verified: int = 0
    work_status: Optional[str] = None
    laborers_present: Optional[int] = None
    materials_status: Optional[str] = None
    quality_issues: Optional[str] = None
    photos: Optional[str] = None
    actions_taken: Optional[str] = None
    follow_up_required: int = 0
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None

class SiteVisitCreate(SiteVisitBase):
    pass

class SiteVisitResponse(SiteVisitBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class DailySiteReportBase(BaseModel):
    project_id: int
    project_item_id: Optional[int] = None
    report_date: date
    supervisor_id: Optional[int] = None
    work_done: Optional[str] = None
    labor_count: Optional[int] = None
    issues: Optional[str] = None
    next_plan: Optional[str] = None

class DailySiteReportCreate(DailySiteReportBase):
    pass

class DailySiteReportResponse(DailySiteReportBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class AgronomistConsultationBase(BaseModel):
    project_id: int
    agronomist_id: int
    consultation_date: date
    crop_advice: Optional[str] = None
    fertilizer_recommendations: Optional[str] = None
    pest_control_measures: Optional[str] = None
    irrigation_schedule: Optional[str] = None
    expected_yield: Optional[float] = None
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None

class AgronomistConsultationCreate(AgronomistConsultationBase):
    pass

class AgronomistConsultationResponse(AgronomistConsultationBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class PestAlertBase(BaseModel):
    project_id: int
    alert_type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    recommendation: Optional[str] = None
    reported_by: Optional[int] = None
    resolved_at: Optional[datetime] = None

class PestAlertCreate(PestAlertBase):
    pass

class PestAlertResponse(PestAlertBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================================================
# 8. AUDIT, DOCS & LOGS SCHEMAS
# =============================================================================

class ProjectMilestoneBase(BaseModel):
    project_id: int
    milestone_name: str
    status: Optional[str] = None
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    reference_number: Optional[str] = None
    amount: Optional[float] = None
    document_path: Optional[str] = None
    remarks: Optional[str] = None
    updated_by: Optional[int] = None

class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass

class ProjectMilestoneResponse(ProjectMilestoneBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class StructureStageLogBase(BaseModel):
    project_item_id: int
    stage_name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    progress_percent: float = 0
    status: str = "pending"
    remarks: Optional[str] = None
    updated_by: Optional[int] = None

class StructureStageLogCreate(StructureStageLogBase):
    pass

class StructureStageLogResponse(StructureStageLogBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ProjectDocumentBase(BaseModel):
    project_id: int
    document_type: str
    file_path: str
    file_name: Optional[str] = None
    version: int = 1
    status: str = "uploaded"
    approved_by: Optional[int] = None
    uploaded_by: Optional[int] = None

class ProjectDocumentCreate(ProjectDocumentBase):
    pass

class ProjectDocumentResponse(ProjectDocumentBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ProjectProgressPhotoBase(BaseModel):
    project_id: int
    project_item_id: Optional[int] = None
    stage: Optional[str] = None
    file_path: str
    geo_location: Optional[str] = None
    uploaded_by: Optional[int] = None

class ProjectProgressPhotoCreate(ProjectProgressPhotoBase):
    pass

class ProjectProgressPhotoResponse(ProjectProgressPhotoBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# =============================================================================
# 9. NOTIFICATIONS SCHEMAS
# =============================================================================

class NotificationBase(BaseModel):
    user_id: int
    title: str
    message: str
    type: Optional[str] = None
    is_read: int = 0
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    project_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ─── Project Co-Applicants ─────────────────────────────────────────────────────
class ProjectCoApplicantCreate(BaseModel):
    farmer_id: int

class ProjectCoApplicantResponse(BaseModel):
    id: int
    project_id: int
    farmer_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
