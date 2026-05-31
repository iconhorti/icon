import os
import re

path = "e:/Google Drive/01-Pankaj/199 ICON_Accounts/95 Software Design/ICON/backend/"

with open(os.path.join(path, "fresh_seed.py"), "r", encoding="utf-8") as f:
    code = f.read()

buckets_str = """    BUCKETS = [
        (50,  "Famremer Onbaord  Peinding at Delear Level", False, False, False, False, False),
        (50,  "Peding At Office Level",                     False, False, False, False, False),
        (100, "Bank Processing",                            False, False, False, False, False),
        (50,  "GOC Application Pending",                    True,  False, False, False, False),
        (100, "GOC Application Peindg",                     True,  True,  False, False, False),
        (50,  "GOC- Approved But Not Issued",               True,  True,  False, False, False),
        (20,  "Erection Start_peindig",                     True,  True,  False, False, False),
        (50,  "Work Started and IN Progress",               True,  True,  True,  False, False),
        (10,  "Subsidy Application Penidng",                True,  True,  True,  True,  False),
        (5,   "Subsidy_ Visit Penindg",                     True,  True,  True,  True,  False),
        (2,   "Subsdidy Visitr Report Not Sumtted",         True,  True,  True,  True,  False),
        (3,   "Subsid Meeting Peding",                      True,  True,  True,  True,  False),
        (2,   "Subsiy Not Released",                        True,  True,  True,  True,  False),
        (8,   "Subsidy Released",                           True,  True,  True,  True,  True),
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
