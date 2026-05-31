import os, re

path = "e:/Google Drive/01-Pankaj/199 ICON_Accounts/95 Software Design/ICON/backend/routers/dashboard.py"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

constants = """
ONBOARDING_STAGES = [
    "Famremer Onbaord  Peinding at Delear Level",
    "Peding At Office Level"
]
BANK_STAGES = ["Bank Processing"]
GOC_STAGES = [
    "GOC Application Pending",
    "GOC Application Peindg",
    "GOC- Approved But Not Issued"
]
ACTIVE_STAGES = [
    "Erection Start_peindig",
    "Work Started and IN Progress"
]
SUBSIDY_STAGES = [
    "Subsidy Application Penidng",
    "Subsidy_ Visit Penindg",
    "Subsdidy Visitr Report Not Sumtted",
    "Subsid Meeting Peding",
    "Subsiy Not Released"
]
COMPLETED_STAGES = ["Subsidy Released"]
"""

# Remove old ACTIVE_STAGES and SUBSIDY_STAGES
code = re.sub(r'ACTIVE_STAGES\s*=\s*\[.*?\]', '', code, flags=re.DOTALL)
code = re.sub(r'SUBSIDY_STAGES\s*=\s*\[.*?\]', '', code, flags=re.DOTALL)

# Insert at top
code = code.replace("import models\n", "import models\n" + constants)

# Helper replacements
code = re.sub(r'onboarding_stages = \[[^\]]+\]', 'onboarding_stages = ONBOARDING_STAGES', code)
code = code.replace('project_stage == "dpr_ready"', 'project_stage.in_(ONBOARDING_STAGES)')
code = code.replace('project_stage == "completed"', 'project_stage.in_(COMPLETED_STAGES)')
code = code.replace('project_stage == "bank_processing"', 'project_stage.in_(BANK_STAGES)')
code = code.replace('project_stage == "agency_inspection"', 'project_stage.in_(SUBSIDY_STAGES)')
code = code.replace('project_stage == "committee_meeting"', 'project_stage.in_(SUBSIDY_STAGES)')
code = code.replace('project_stage == "goc_registration"', 'project_stage.in_(GOC_STAGES)')

# Lists
code = code.replace('project_stage.in_(["m7_plantation","completed"])', 'project_stage.in_(ACTIVE_STAGES + COMPLETED_STAGES)')
code = code.replace('project_stage.in_(["m7_plantation", "completed"])', 'project_stage.in_(COMPLETED_STAGES)')
code = code.replace('project_stage.in_(["m1_foundation", "m2_structure_erection", "m3_covering_material", "m4_trellising", "m5_drip_fitting", "m6_bed_preparation"])', 'project_stage.in_(ACTIVE_STAGES)')
code = code.replace('project_stage.in_(["m1_foundation", "m2_structure_erection", "m3_covering_material", "m4_trellising", "m5_drip_fitting", "m6_bed_preparation", "m7_plantation"])', 'project_stage.in_(ACTIVE_STAGES)')

code = code.replace('project_stage.in_(["farmer_onboarding", "document_collection", "site_visit"])', 'project_stage.in_(ONBOARDING_STAGES)')
code = code.replace('project_stage.in_(["design_boq", "dpr_ready"])', 'project_stage.in_(ONBOARDING_STAGES)')
code = code.replace('project_stage.in_(["subsidy_claim", "agency_inspection", "committee_meeting", "subsidy_released"])', 'project_stage.in_(SUBSIDY_STAGES)')

# Equality in strings
code = code.replace('project_stage=="farmer_onboarding"', 'project_stage.in_(ONBOARDING_STAGES)')
code = code.replace('project_stage=="dpr_ready"', 'project_stage.in_(ONBOARDING_STAGES)')
code = code.replace('project_stage=="bank_processing"', 'project_stage.in_(BANK_STAGES)')
code = code.replace('project_stage=="m1_foundation"', 'project_stage.in_(ACTIVE_STAGES)')
code = code.replace('project_stage=="m7_plantation"', 'project_stage.in_(ACTIVE_STAGES)')

# Long filtered array in _bank_officer_kpis (lines 285-290)
code = re.sub(r'\.filter\(models\.Project\.project_stage\.in_\([\s\S]*?completed"\]\s*\)\)', '.filter(models.Project.project_stage.notin_(ONBOARDING_STAGES))', code)

code = code.replace("project_stage != \'farmer_onboarding\'", "project_stage.notin_(ONBOARDING_STAGES)")

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("dashboard.py patched successfully.")
