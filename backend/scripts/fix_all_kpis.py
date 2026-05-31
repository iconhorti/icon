"""
fix_all_kpis.py
--------------
Fixes all missing/incorrect data that causes KPI dashboards to show 0:
1. Agency Officer: Add agency_inspection + committee_meeting milestone records
2. Agronomist: Seed agronomist_consultations + pest_alerts tables
3. Contractor: Seed project_contractors table
"""
import sqlite3
from datetime import date, timedelta
import random

DB = 'icon_app.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("=" * 60)
print("ICON KPI Data Fix Script")
print("=" * 60)

# ─────────────────────────────────────────────────────────────
# 1. AGENCY OFFICER: milestone records
# ─────────────────────────────────────────────────────────────
print("\n[1] Fixing Agency Officer milestone data...")

# Get projects at agency_inspection and committee_meeting stages
c.execute("SELECT id, project_stage FROM projects WHERE project_stage IN ('agency_inspection','committee_meeting') ORDER BY project_stage, id")
stage_projects = c.fetchall()
agency_proj_ids = [r['id'] for r in stage_projects if r['project_stage'] == 'agency_inspection']
committee_proj_ids = [r['id'] for r in stage_projects if r['project_stage'] == 'committee_meeting']

print(f"  Projects at agency_inspection: {len(agency_proj_ids)} -> {agency_proj_ids}")
print(f"  Projects at committee_meeting: {len(committee_proj_ids)} -> {committee_proj_ids}")

# Check existing milestones
c.execute("SELECT COUNT(*) FROM project_milestones WHERE milestone_name IN ('agency_inspection','committee_meeting')")
existing = c.fetchone()[0]
print(f"  Existing agency/committee milestones: {existing}")

if existing == 0:
    base_date = date(2025, 8, 1)
    milestone_rows = []

    # Projects already past agency_inspection (at committee_meeting) → agency_inspection = 'passed'
    for i, pid in enumerate(committee_proj_ids):
        milestone_rows.append((
            pid, 'agency_inspection', 'passed',
            str(base_date + timedelta(days=i*7)),
            str(base_date + timedelta(days=i*7 + 4)),
            f'AI-REF-{pid}', None, None, 'Inspection passed - advanced to committee', None
        ))

    # agency_inspection stage projects: 3 passed, rest in_progress
    passed_count = min(3, len(agency_proj_ids))
    for i, pid in enumerate(agency_proj_ids):
        if i < passed_count:
            status = 'passed'
            comp_date = str(base_date + timedelta(days=30 + i*5))
        else:
            status = 'in_progress'
            comp_date = None
        milestone_rows.append((
            pid, 'agency_inspection', status,
            str(base_date + timedelta(days=20 + i*4)),
            comp_date,
            f'AI-REF-{pid}', None, None, 'Agency field inspection visit', None
        ))

    # committee_meeting milestones: 1 passed, rest in_progress
    for i, pid in enumerate(committee_proj_ids):
        status = 'passed' if i == 0 else 'in_progress'
        comp_date = str(base_date + timedelta(days=60 + i*3)) if i == 0 else None
        milestone_rows.append((
            pid, 'committee_meeting', status,
            str(base_date + timedelta(days=50 + i*7)),
            comp_date,
            f'CM-REF-{pid}', None, None, 'Subsidy committee review session', None
        ))

    c.executemany('''INSERT INTO project_milestones
        (project_id, milestone_name, status, start_date, completion_date,
         reference_number, amount, document_path, remarks, updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)''', milestone_rows)
    conn.commit()
    print(f"  ✅ Inserted {len(milestone_rows)} agency/committee milestone rows")
else:
    print(f"  ⚠️  Milestones already exist, skipping")

# Verify
c.execute("SELECT milestone_name, status, COUNT(*) as cnt FROM project_milestones WHERE milestone_name IN ('agency_inspection','committee_meeting') GROUP BY milestone_name, status")
for r in c.fetchall():
    print(f"  {r['milestone_name']} | {r['status']} | count={r['cnt']}")

# ─────────────────────────────────────────────────────────────
# 2. AGRONOMIST: consultations + pest alerts
# ─────────────────────────────────────────────────────────────
print("\n[2] Seeding Agronomist data...")

# Check schema
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agronomist_consultations','pest_alerts')")
tables = [r['name'] for r in c.fetchall()]
print(f"  Found tables: {tables}")

# Get agronomist user IDs
c.execute("SELECT id FROM users WHERE role='agronomist' LIMIT 5")
agronomists = [r['id'] for r in c.fetchall()]
print(f"  Agronomist user IDs: {agronomists}")

# Get construction-stage projects for consultations
c.execute("""SELECT id FROM projects
    WHERE project_stage IN ('site_visit','design_boq','m1_foundation','m2_structure_erection',
                            'm3_covering_material','m4_trellising','m5_drip_fitting',
                            'm6_bed_preparation','m7_plantation','subsidy_claim',
                            'agency_inspection','committee_meeting','subsidy_released')
    LIMIT 150""")
active_proj_ids = [r['id'] for r in c.fetchall()]
print(f"  Active projects for consultations: {len(active_proj_ids)}")

if 'agronomist_consultations' in tables:
    c.execute("SELECT COUNT(*) FROM agronomist_consultations")
    existing_consults = c.fetchone()[0]
    print(f"  Existing consultations: {existing_consults}")

    if existing_consults == 0 and agronomists:
        consult_rows = []
        crop_types = ['Tomato', 'Cucumber', 'Capsicum', 'Leafy Greens', 'Strawberry']
        consult_types = ['Site Visit', 'Phone Consultation', 'Video Call', 'Training Session']

        base_date = date(2025, 4, 1)
        for i, proj_id in enumerate(active_proj_ids):
            agro_id = agronomists[i % len(agronomists)]
            consult_date = base_date + timedelta(days=random.randint(0, 300))
            num_consults = random.randint(1, 4)
            for j in range(num_consults):
                consult_rows.append((
                    proj_id,
                    agro_id,
                    str(consult_date + timedelta(days=j*20)),
                    random.choice(consult_types),
                    random.choice(crop_types),
                    random.randint(1, 5),  # rating
                    f'Follow-up required: {"Yes" if random.random() > 0.5 else "No"}',
                    'completed'
                ))

        # Try inserting - check exact columns first
        c.execute("PRAGMA table_info(agronomist_consultations)")
        cols = [col[1] for col in c.fetchall()]
        print(f"  agronomist_consultations columns: {cols}")

        # Build insert based on available columns
        if 'project_id' in cols and 'agronomist_id' in cols:
            insert_cols = []
            insert_vals = []
            col_map = {
                'project_id': 0, 'agronomist_id': 1, 'consultation_date': 2,
                'consultation_type': 3, 'crop_type': 4, 'rating': 5, 'notes': 6, 'status': 7
            }
            for col in ['project_id','agronomist_id','consultation_date','consultation_type','crop_type','rating','notes','status']:
                if col in cols:
                    insert_cols.append(col)
                    insert_vals.append(col_map[col])

            trimmed_rows = [[row[i] for i in insert_vals] for row in consult_rows]
            sql = f"INSERT INTO agronomist_consultations ({','.join(insert_cols)}) VALUES ({','.join(['?']*len(insert_cols))})"
            c.executemany(sql, trimmed_rows)
            conn.commit()
            print(f"  ✅ Inserted {len(consult_rows)} consultation records")
        else:
            print(f"  ⚠️  Unknown columns, skipping consultations")
    else:
        print(f"  ⚠️  Consultations already exist or no agronomists found, skipping")
else:
    print("  ⚠️  agronomist_consultations table not found")

if 'pest_alerts' in tables:
    c.execute("SELECT COUNT(*) FROM pest_alerts")
    existing_alerts = c.fetchone()[0]
    print(f"  Existing pest_alerts: {existing_alerts}")

    if existing_alerts == 0 and agronomists:
        c.execute("PRAGMA table_info(pest_alerts)")
        cols = [col[1] for col in c.fetchall()]
        print(f"  pest_alerts columns: {cols}")

        pest_rows = []
        pest_types = ['Whitefly', 'Aphids', 'Red Spider Mite', 'Thrips', 'Botrytis', 'Powdery Mildew']
        severity_levels = ['low', 'medium', 'high', 'critical']
        base_date = date(2025, 5, 1)

        for i in range(min(80, len(active_proj_ids))):
            proj_id = active_proj_ids[i]
            agro_id = agronomists[i % len(agronomists)]
            alert_date = base_date + timedelta(days=random.randint(0, 250))
            pest_rows.append((
                proj_id,
                agro_id,
                random.choice(pest_types),
                random.choice(severity_levels),
                str(alert_date),
                'Chemical + IPM treatment recommended',
                random.choice(['open', 'resolved', 'monitoring'])
            ))

        col_map = {
            'project_id': 0, 'agronomist_id': 1, 'pest_type': 2,
            'severity': 3, 'alert_date': 4, 'recommendation': 5, 'status': 6
        }
        insert_cols = [col for col in ['project_id','agronomist_id','pest_type','severity','alert_date','recommendation','status'] if col in cols]
        trimmed_rows = [[row[col_map[col]] for col in insert_cols] for row in pest_rows]

        if insert_cols:
            sql = f"INSERT INTO pest_alerts ({','.join(insert_cols)}) VALUES ({','.join(['?']*len(insert_cols))})"
            c.executemany(sql, trimmed_rows)
            conn.commit()
            print(f"  ✅ Inserted {len(pest_rows)} pest alert records")
        else:
            print(f"  ⚠️  Column mismatch, skipping pest_alerts")
    else:
        print(f"  ⚠️  pest_alerts already exist or no agronomists, skipping")
else:
    print("  ⚠️  pest_alerts table not found")

# ─────────────────────────────────────────────────────────────
# 3. CONTRACTOR: project_contractors assignments
# ─────────────────────────────────────────────────────────────
print("\n[3] Seeding Contractor assignments...")

c.execute("PRAGMA table_info(project_contractors)")
contractor_cols = [col[1] for col in c.fetchall()]
print(f"  project_contractors columns: {contractor_cols}")

c.execute("SELECT COUNT(*) FROM project_contractors")
existing_assignments = c.fetchone()[0]
print(f"  Existing assignments: {existing_assignments}")

if existing_assignments == 0:
    # Get contractors by type
    contractor_roles = ['civil_contractor', 'electrical_contractor', 'plumbing_contractor', 'drip_contractor']
    role_contractors = {}
    for role in contractor_roles:
        c.execute("SELECT id FROM users WHERE role=? LIMIT 10", (role,))
        role_contractors[role] = [r['id'] for r in c.fetchall()]
        print(f"  {role}: {role_contractors[role]}")

    # Get construction stage projects
    c.execute("""SELECT id FROM projects
        WHERE project_stage IN ('m1_foundation','m2_structure_erection','m3_covering_material',
                                'm4_trellising','m5_drip_fitting','m6_bed_preparation',
                                'm7_plantation','subsidy_claim','agency_inspection',
                                'committee_meeting','subsidy_released','completed')
        LIMIT 100""")
    const_proj_ids = [r['id'] for r in c.fetchall()]
    print(f"  Construction projects: {len(const_proj_ids)}")

    assignment_rows = []
    base_date = date(2025, 3, 1)

    for i, proj_id in enumerate(const_proj_ids):
        for role in contractor_roles:
            contractors_list = role_contractors.get(role, [])
            if contractors_list:
                contractor_id = contractors_list[i % len(contractors_list)]
                start_d = base_date + timedelta(days=i * 2)
                end_d = start_d + timedelta(days=random.randint(30, 90))
                status = 'completed' if random.random() > 0.4 else 'in_progress'

                # Build row based on available columns
                row_data = {
                    'project_id': proj_id,
                    'contractor_id': contractor_id,
                    'contractor_type': role,
                    'status': status,
                    'start_date': str(start_d),
                    'end_date': str(end_d) if status == 'completed' else None,
                    'contract_value': round(random.uniform(200000, 800000), 2),
                    'notes': f'{role.replace("_"," ").title()} assignment'
                }
                row = [row_data.get(col) for col in contractor_cols if col != 'id']
                assignment_rows.append(row)

    if assignment_rows:
        insert_cols = [col for col in contractor_cols if col != 'id']
        sql = f"INSERT INTO project_contractors ({','.join(insert_cols)}) VALUES ({','.join(['?']*len(insert_cols))})"
        c.executemany(sql, assignment_rows)
        conn.commit()
        print(f"  ✅ Inserted {len(assignment_rows)} contractor assignment rows")
    else:
        print("  ⚠️  No contractor users found or no columns matched")
else:
    print("  ⚠️  Contractor assignments already exist, skipping")

# ─────────────────────────────────────────────────────────────
# Final verification
# ─────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("VERIFICATION SUMMARY")
print("=" * 60)

c.execute("SELECT milestone_name, status, COUNT(*) FROM project_milestones WHERE milestone_name IN ('agency_inspection','committee_meeting') GROUP BY milestone_name, status")
print("\nAgency/Committee milestones:")
for r in c.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]}")

if 'agronomist_consultations' in tables:
    c.execute("SELECT COUNT(*) FROM agronomist_consultations")
    print(f"\nAgronomist consultations: {c.fetchone()[0]}")

if 'pest_alerts' in tables:
    c.execute("SELECT COUNT(*) FROM pest_alerts")
    print(f"Pest alerts: {c.fetchone()[0]}")

c.execute("SELECT COUNT(*) FROM project_contractors")
print(f"Contractor assignments: {c.fetchone()[0]}")

conn.close()
print("\n✅ Done!")
