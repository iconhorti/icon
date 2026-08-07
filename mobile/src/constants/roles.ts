/**
 * Mobile role constants — mirror backend Person.role strings.
 * TabNavigator must use these (never bare "manager").
 */
export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  OFFICE_STAFF: 'office_staff',
  PROJECT_MANAGER: 'project_manager',
  BANK_OFFICER: 'bank_officer',
  AGENCY_OFFICER: 'agency_officer',
  AGRONOMIST: 'agronomist',
  DEALER: 'dealer',
  FARMER: 'farmer',
  STRUCTURE_CONTRACTOR: 'structure_contractor',
  DRIP_CONTRACTOR: 'drip_contractor',
  BED_CONTRACTOR: 'bed_contractor',
  PLANTATION_CONTRACTOR: 'plantation_contractor',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles that receive /dashboard/role-kpis pack. */
export const ROLE_KPI_ROLES = new Set<string>([
  ROLES.PROJECT_MANAGER,
  ROLES.BANK_OFFICER,
  ROLES.AGENCY_OFFICER,
  ROLES.AGRONOMIST,
  ROLES.OFFICE_STAFF,
  ROLES.STRUCTURE_CONTRACTOR,
  ROLES.DRIP_CONTRACTOR,
  ROLES.BED_CONTRACTOR,
  ROLES.PLANTATION_CONTRACTOR,
]);

export const isAdminRole = (role?: string | null) =>
  role === ROLES.ADMIN || role === ROLES.OWNER;

const CONTRACTOR_ROLES: readonly string[] = [
  ROLES.STRUCTURE_CONTRACTOR,
  ROLES.DRIP_CONTRACTOR,
  ROLES.BED_CONTRACTOR,
  ROLES.PLANTATION_CONTRACTOR,
];

export const isContractorRole = (role?: string | null) =>
  !!role && CONTRACTOR_ROLES.includes(role);

export const isErectionRole = (role?: string | null) =>
  role === ROLES.PROJECT_MANAGER || isContractorRole(role);
