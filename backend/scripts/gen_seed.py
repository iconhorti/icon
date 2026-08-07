import os
import re

path = "e:/Google Drive/01-Pankaj/199 ICON_Accounts/95 Software Design/ICON/backend/"

with open(os.path.join(path, "fresh_seed.py"), "r", encoding="utf-8") as f:
    code = f.read()

buckets_str = """    BUCKETS = [
        (50,  "farmer_onboarding",     False, False, False, False, False),
        (50,  "document_collection",   False, False, False, False, False),
        (100, "bank_processing",       False, False, False, False, False),
        (50,  "goc_registration",      True,  False, False, False, False),
        (100, "goc_registration",      True,  True,  False, False, False),
        (50,  "goc_registration",      True,  True,  False, False, False),
        (20,  "m2_structure_erection", True,  True,  False, False, False),
        (50,  "m4_trellising",         True,  True,  True,  False, False),
        (10,  "subsidy_claim",         True,  True,  True,  True,  False),
        (5,   "agency_inspection",     True,  True,  True,  True,  False),
        (2,   "agency_inspection",     True,  True,  True,  True,  False),
        (3,   "committee_meeting",     True,  True,  True,  True,  False),
        (2,   "committee_meeting",     True,  True,  True,  True,  False),
        (8,   "subsidy_released",      True,  True,  True,  True,  True),
    ]"""

# Substitute the BUCKETS variable
code = re.sub(r'    BUCKETS = \[\n.*?    \]', buckets_str, code, flags=re.DOTALL)

# Replace the loop variables
code = code.replace(
    'count, stage_idx, bank_done, goc_done, work_done, completed, sub_rel = bucket',
    'count, stage_string, bank_done, goc_done, work_done, completed, sub_rel = bucket'
)

# Insert the right variable in Project model initialization
code = code.replace(
    'project_stage=STAGES_ORDER[stage_idx],', 
    'project_stage=stage_string,'
)

# And fix the print log
code = code.replace(
    'print(f"     Stage \'{STAGES_ORDER[stage_idx]}\': {count} projects [OK]")',
    'print(f"     Stage \'{stage_string}\': {count} projects [OK]")'
)

with open(os.path.join(path, "seed_500.py"), "w", encoding="utf-8") as f:
    f.write(code)

print("Generated seed_500.py successfully!")
