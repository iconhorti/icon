
export const WORKFLOW_STAGES = [
  { id: 'draft',                  label: '0. Draft',                   group: 'Onboarding' },
  { id: 'farmer_onboarding',      label: '1. Lead Generation',         group: 'Onboarding' },
  { id: 'document_collection',    label: '2. Document Collection',     group: 'Onboarding' },
  { id: 'site_visit',             label: '3. Site Visit',              group: 'Onboarding' },
  { id: 'design_boq',             label: '4. Design & BOQ',            group: 'Planning'   },
  { id: 'dpr_ready',              label: '5. DPR Ready',               group: 'Planning'   },
  { id: 'bank_processing',        label: '6. Bank Processing',         group: 'Financial'  },
  { id: 'goc_registration',       label: '7. GOC Registration',        group: 'Financial'  },
  { id: 'm1_foundation',          label: '8. M1 — Foundation',         group: 'Execution'  },
  { id: 'm2_structure_erection',  label: '9. M2 — Structure Erection', group: 'Execution'  },
  { id: 'm3_covering_material',   label: '10. M3 — Covering Material', group: 'Execution'  },
  { id: 'm4_trellising',          label: '11. M4 — Trellising',        group: 'Execution'  },
  { id: 'm5_drip_fitting',        label: '12. M5 — Drip Fitting',      group: 'Execution'  },
  { id: 'm6_bed_preparation',     label: '13. M6 — Bed Preparation',   group: 'Execution'  },
  { id: 'm7_plantation',          label: '14. M7 — Plantation',        group: 'Execution'  },
  { id: 'subsidy_claim',          label: '15. Subsidy Claim',          group: 'Subsidy'    },
  { id: 'agency_inspection',      label: '16. Agency Inspection',      group: 'Subsidy'    },
  { id: 'committee_meeting',      label: '17. Committee Meeting',       group: 'Subsidy'    },
  { id: 'subsidy_released',       label: '18. Subsidy Released',       group: 'Subsidy'    },
  { id: 'completed',              label: '19. Project Completed',      group: 'Completed'  },
];


export const CAN_ADVANCE = {
  admin:                 true,
  owner:                 true,
  project_manager:       true,
  office_staff:          true,
  dealer:                false, // read-only; cannot advance stages
  bank_officer:          false, // fills loan data; admin/office_staff advances
  agency_officer:        false, // fills inspection data; office_staff advances
  agronomist:            false,
  structure_contractor:  false,
  drip_contractor:       false,
  bed_contractor:        false,
  plantation_contractor: false,
  farmer:                false,
};

// Who can revert a stage (roll back to previous) — more restricted than advance
export const CAN_REVERT = {
  admin:                 true,
  owner:                 true,
  office_staff:          true,
  project_manager:       true,  // can revert their own construction stages
};


// ── Required project fields that must be filled before a stage can be advanced.
// If ANY of these fields is empty/null on the project, advance is blocked with
// a clear message telling the user what to fill in first.
export const STAGE_REQUIRED_FIELDS = {
  bank_processing:   [
    { field: 'loan_amount',         label: 'Loan Amount'          },
    { field: 'loan_sanction_date',  label: 'Loan Sanction Date'   },
    { field: 'loan_account_number', label: 'Loan Account Number'  },
  ],
  goc_registration:  [
    { field: 'goc_number', label: 'GOC Reference Number' },
    { field: 'goc_date',   label: 'GOC Issue Date'        },
  ],
  m7_plantation: [
    { field: 'plantation_date',  label: 'Plantation Date'          },
    { field: 'seedlings_count',  label: 'Number of Seedlings'      },
  ],
  subsidy_claim: [
    { field: 'subsidy_claim_reference', label: 'Claim Reference Number' },
    { field: 'subsidy_claim_date',      label: 'Claim Filed Date'        },
  ],
  agency_inspection: [
    { field: 'subsidy_inspection_date',   label: 'Inspection Date'    },
    { field: 'subsidy_inspector_name',    label: 'Inspector Name'     },
    { field: 'subsidy_inspection_passed', label: 'Inspection Outcome' },
  ],
  committee_meeting: [
    { field: 'subsidy_meeting_date',     label: 'Committee Meeting Date' },
    { field: 'subsidy_meeting_decision', label: 'Committee Decision'     },
  ],
  subsidy_released: [
    { field: 'subsidy_release_date',         label: 'Subsidy Release Date'   },
    { field: 'subsidy_release_order_number', label: 'Release Order Number'   },
    { field: 'subsidy_release_amount',       label: 'Amount Released'        },
  ],
};

// Per-stage: which roles can see and interact with the action panel.
// office_staff is included wherever they need operational visibility.
export const STAGE_ROLES = {
  draft:                 ['dealer', 'admin', 'owner', 'office_staff'],
  farmer_onboarding:     ['dealer', 'admin', 'owner', 'office_staff'],
  document_collection:   ['dealer', 'admin', 'office_staff'],
  site_visit:            ['admin', 'owner', 'project_manager', 'office_staff'],
  design_boq:            ['admin', 'owner', 'office_staff'],
  dpr_ready:             ['admin', 'owner', 'office_staff'],
  bank_processing:       ['bank_officer', 'admin', 'owner', 'office_staff'],
  goc_registration:      ['agency_officer', 'admin', 'owner', 'office_staff'],
  m1_foundation:         ['structure_contractor', 'project_manager', 'admin', 'owner'],
  m2_structure_erection: ['structure_contractor', 'project_manager', 'admin', 'owner'],
  m3_covering_material:  ['structure_contractor', 'project_manager', 'admin', 'owner'],
  m4_trellising:         ['structure_contractor', 'project_manager', 'admin', 'owner'],
  m5_drip_fitting:       ['drip_contractor', 'project_manager', 'admin', 'owner'],
  m6_bed_preparation:    ['bed_contractor', 'project_manager', 'admin', 'owner'],
  m7_plantation:         ['plantation_contractor', 'agronomist', 'project_manager', 'admin', 'owner'],
  subsidy_claim:         ['office_staff', 'admin', 'owner'],
  agency_inspection:     ['agency_officer', 'office_staff', 'admin', 'owner'],
  committee_meeting:     ['agency_officer', 'office_staff', 'admin', 'owner'],
  subsidy_released:      ['agency_officer', 'office_staff', 'admin', 'owner'],
  completed:             ['admin', 'owner'],
};

