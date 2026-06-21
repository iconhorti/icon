"""
ICON APP - Single Source of Truth for Project Stage Vocabulary
=================================================================
All stage comparisons throughout the codebase must import from here.
Never use raw string literals for stage names in query filters.

Each constant is a frozenset of slug-based stage keys that match
the VALID_STAGES list in models.py.
"""

# Farmer & document onboarding (includes draft — stage 0, dealer-submitted)
ONBOARDING = frozenset({
    "draft",
    "farmer_onboarding",
    "document_collection",
})

# Site survey & technical design
DESIGN = frozenset({
    "site_visit",
    "design_boq",
    "dpr_ready",
})

# Bank loan processing
BANK = frozenset({
    "bank_processing",
})

# Government Order Certificate
GOC = frozenset({
    "goc_registration",
})

# Physical construction milestones
CONSTRUCTION = frozenset({
    "m1_foundation",
    "m2_structure_erection",
    "m3_covering_material",
    "m4_trellising",
    "m5_drip_fitting",
    "m6_bed_preparation",
    "m7_plantation",
})

# Subsidy claim & inspection
SUBSIDY = frozenset({
    "subsidy_claim",
    "agency_inspection",
    "committee_meeting",
})

# Fully closed projects
TERMINAL = frozenset({
    "subsidy_released",
    "completed",
})

# ── Convenience groupings ──────────────────────────────────────────────────────

# All stages where the project is "alive" (not yet terminal)
ACTIVE = ONBOARDING | DESIGN | BANK | GOC | CONSTRUCTION | SUBSIDY

# Every recognised stage
ALL_STAGES = ACTIVE | TERMINAL

# Human-readable labels for the UI (keep labels here, not in query logic)
STAGE_LABELS = {
    "draft":                "Draft (Dealer Submitted)",
    "farmer_onboarding":    "Farmer Onboarding",
    "document_collection":  "Document Collection",
    "site_visit":           "Site Visit",
    "design_boq":           "Design & BOQ",
    "dpr_ready":            "DPR Ready",
    "bank_processing":      "Bank Processing",
    "goc_registration":     "GOC Registration",
    "m1_foundation":        "M1 – Foundation",
    "m2_structure_erection":"M2 – Structure Erection",
    "m3_covering_material": "M3 – Covering Material",
    "m4_trellising":        "M4 – Trellising",
    "m5_drip_fitting":      "M5 – Drip Fitting",
    "m6_bed_preparation":   "M6 – Bed Preparation",
    "m7_plantation":        "M7 – Plantation",
    "subsidy_claim":        "Subsidy Claim",
    "agency_inspection":    "Agency Inspection",
    "committee_meeting":    "Committee Meeting",
    "subsidy_released":     "Subsidy Released",
    "completed":            "Completed",
}


# Documents that must be present before a project can leave a given stage.
# Keyed by stage id → list of DocumentType.name. Consumed by GET /uploads/types
# (?stage=&required=true) and the web RequiredDocsChecklist.
STAGE_REQUIRED_DOCS = {
    "document_collection": [
        "Aadhaar Card (Front)", "Aadhaar Card (Back)", "PAN Card",
        "7/12 Extract (Land Record)", "8A Certificate",
    ],
    "design_boq":   ["DPR Document", "BOQ Sheet"],
    "dpr_ready":    ["DPR Document", "BOQ Sheet"],
    "bank_processing": [
        "Bank Sanction Letter", "Bank Appraisal Report", "Bank Legal Search Report",
    ],
    "goc_registration": ["GOC Letter"],
    "subsidy_claim":    ["Subsidy Claim Form"],
    "completed":        ["Completion Certificate"],
}
