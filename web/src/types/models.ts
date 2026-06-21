// Friendly aliases over the generated OpenAPI schema types.
// Regenerate src/types/api.ts with `npm run gen:api-types` (backend must be running).
import type { components } from './api';

export type Schemas = components['schemas'];

export type Person = Schemas['PersonResponse'];
export type PersonCreate = Schemas['PersonCreate'];
export type PersonUpdate = Schemas['PersonUpdate'];

export type FarmerProfile = Schemas['FarmerProfileResponse'];
export type FarmerRegistration = Schemas['FarmerRegistrationResponse'];
export type FarmerUpdate = Schemas['FarmerUpdate'];

export type Project = Schemas['ProjectResponse'];
export type ProjectDetail = Schemas['ProjectDetailResponse'];
export type ProjectListItem = Schemas['ProjectListResponse'];
export type ProjectCreate = Schemas['ProjectCreate'];
export type ProjectFieldUpdate = Schemas['ProjectFieldUpdate'];

export type ProjectItem = Schemas['ProjectItemResponse'];
export type ProjectItemCreate = Schemas['ProjectItemCreate'];

export type ProjectContractor = Schemas['ProjectContractorResponse'];
export type ProjectContractorCreate = Schemas['ProjectContractorCreate'];

export type SiteVisit = Schemas['SiteVisitResponse'];
export type SiteVisitCreate = Schemas['SiteVisitCreate'];
export type SiteVisitUpdate = Schemas['SiteVisitUpdate'];

export type DailySiteReport = Schemas['DailySiteReportResponse'];

export type Notification = Schemas['NotificationResponse'];
export type Bank = Schemas['BankResponse'];
export type BankBranch = Schemas['BankBranchResponse'];
export type GovernmentAgency = Schemas['GovernmentAgencyResponse'];
export type Skill = Schemas['SkillResponse'];
export type Component = Schemas['ComponentResponse'];
export type AreaType = Schemas['ProjectAreaTypeResponse'];

export type State = Schemas['StateOut'];
export type District = Schemas['DistrictOut'];
export type Taluka = Schemas['TalukaOut'];
export type Village = Schemas['VillageResponse'];

export type LoginRequest = Schemas['LoginRequest'];
export type ChangePasswordRequest = Schemas['ChangePasswordRequest'];
