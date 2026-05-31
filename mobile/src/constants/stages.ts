export const STAGE_LABELS: Record<string, string> = {
  draft:                  'Draft',
  farmer_onboarding:      'Farmer Onboarding',
  document_collection:    'Document Collection',
  site_visit:             'Site Visit',
  design_boq:             'Design & BOQ',
  dpr_ready:              'DPR Ready',
  bank_processing:        'Bank Processing',
  goc_registration:       'GOC Registration',
  m1_foundation:          'M1 – Foundation',
  m2_structure_erection:  'M2 – Structure Erection',
  m3_covering_material:   'M3 – Covering Material',
  m4_trellising:          'M4 – Trellising',
  m5_drip_fitting:        'M5 – Drip Fitting',
  m6_bed_preparation:     'M6 – Bed Preparation',
  m7_plantation:          'M7 – Plantation',
  subsidy_claim:          'Subsidy Claim Filed',
  agency_inspection:      'Agency Inspection',
  committee_meeting:      'Committee Meeting',
  subsidy_released:       'Subsidy Released',
  completed:              'Project Completed',
};

export const STAGE_ORDER = Object.keys(STAGE_LABELS);

export const stageLabel = (slug: string): string =>
  STAGE_LABELS[slug] ?? slug.replace(/_/g, ' ');

export const stageProgress = (slug: string): number => {
  const idx = STAGE_ORDER.indexOf(slug);
  return idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
};
