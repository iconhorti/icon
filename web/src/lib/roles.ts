// ════════════════════════════════════════════════════════════════════════════
// roles.ts — single source of truth for user roles + access rules.
// Mirrors backend role strings. App.tsx, page guards, and the Sidebar should all
// import from here so a typo in a role string fails to compile rather than
// silently granting/denying access.
// ════════════════════════════════════════════════════════════════════════════

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

// ─── Reusable role sets (named by intent, not by membership) ──────────────────
export const ROLE_SETS = {
  ADMIN_ONLY: [ROLES.ADMIN],
  ADMIN_OWNER: [ROLES.ADMIN, ROLES.OWNER],
  INTERNAL_STAFF: [ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF],
  EXTENDED_STAFF: [ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF, ROLES.PROJECT_MANAGER],
  FARMER_CREATE: [ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF, ROLES.DEALER],
  FARMER_VIEW: [ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF, ROLES.PROJECT_MANAGER, ROLES.DEALER],
  PROJECT_CREATE: [ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF, ROLES.DEALER],
  PROJECT_EDIT: [ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF],
  REPORTS: [
    ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF, ROLES.PROJECT_MANAGER,
    ROLES.BANK_OFFICER, ROLES.AGENCY_OFFICER, ROLES.AGRONOMIST,
  ],
  DOCUMENTS: [
    ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF, ROLES.PROJECT_MANAGER,
    ROLES.BANK_OFFICER, ROLES.AGENCY_OFFICER, ROLES.AGRONOMIST, ROLES.FARMER,
  ],
  // Project list + detail: staff, contractors, and farmers (backend scopes farmer to own project).
  PROJECT_VIEW: [
    ROLES.ADMIN, ROLES.OWNER, ROLES.OFFICE_STAFF, ROLES.PROJECT_MANAGER,
    ROLES.BANK_OFFICER, ROLES.AGENCY_OFFICER, ROLES.AGRONOMIST, ROLES.DEALER,
    ROLES.FARMER,
    ROLES.STRUCTURE_CONTRACTOR, ROLES.DRIP_CONTRACTOR, ROLES.BED_CONTRACTOR,
    ROLES.PLANTATION_CONTRACTOR,
  ],
  /** Full AdminDashboard (financials, staff, regional). */
  DASHBOARD_ADMIN: [ROLES.ADMIN, ROLES.OWNER],
  /**
   * ManagerDashboard shell (PM / bank / agency / agro / contractors).
   * Never use bare "manager" — backend role is project_manager.
   */
  DASHBOARD_MANAGER: [
    ROLES.PROJECT_MANAGER,
    ROLES.BANK_OFFICER,
    ROLES.AGENCY_OFFICER,
    ROLES.AGRONOMIST,
    ROLES.STRUCTURE_CONTRACTOR,
    ROLES.DRIP_CONTRACTOR,
    ROLES.BED_CONTRACTOR,
    ROLES.PLANTATION_CONTRACTOR,
  ],
} as const satisfies Record<string, readonly Role[]>;

/** True when `role` is non-empty and included in `allowed`. Null-safe. */
export const hasRole = (
  role: string | null | undefined,
  allowed: readonly string[],
): boolean => !!role && allowed.includes(role);
