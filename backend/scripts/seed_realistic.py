"""
ICON APP - Realistic 500-Project Seed
500 farmers, each at their current pipeline stage (20 leaf stages).

The original table describes a pipeline FUNNEL of 500 unique projects:
  • 500 farmers enrolled → 50 stuck at onboarding, 450 moved to office
  • Of 450 at office   → 45 pending, 405 DPR prepared + forwarded to bank
  • Of 405 at bank     → 101 + 30 + 274 split...   and so on.
Each project is counted exactly ONCE at the stage where it is currently waiting.
Sum of all 20 leaf stages = 500.

Run from the backend folder:
    cd backend
    python seed_realistic.py

Stages are written as slugs from constants/stages.py — no migrate_stages.py pass needed.
"""
import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal, engine, Base
import models

random.seed(500)

TODAY           = datetime(2026, 4, 16, 10, 0, 0)
TODAY_DATE      = TODAY.date()
COMPANY_FOUNDED = TODAY - timedelta(days=400)

# ─── Location Data ────────────────────────────────────────────────────────────
LOCATION_DATA = {
    "Gujarat": {
        "short": "GJ",
        "districts": {
            "Anand":       ["Anand", "Petlad", "Borsad", "Khambhat", "Sojitra"],
            "Vadodara":    ["Vadodara", "Karjan", "Padra", "Dabhoi", "Waghodia"],
            "Sabarkantha": ["Himmatnagar", "Idar", "Modasa", "Bayad", "Khedbrahma"],
            "Banaskantha": ["Palanpur", "Deesa", "Dhanera", "Vav", "Danta"],
            "Gandhinagar": ["Gandhinagar", "Mansa", "Dehgam", "Kalol"],
        }
    },
    "Madhya Pradesh": {
        "short": "MP",
        "districts": {
            "Indore":   ["Indore", "Sanwer", "Depalpur", "Hatod", "Mhow"],
            "Bhopal":   ["Bhopal", "Berasia", "Phanda", "Huzur"],
            "Jabalpur": ["Jabalpur", "Sihora", "Patan", "Bargi", "Panagar"],
            "Sagar":    ["Sagar", "Khurai", "Banda", "Rahatgarh", "Rehli"],
            "Rewa":     ["Rewa", "Mauganj", "Huzur", "Naigarhi", "Gurh"],
        }
    },
    "Rajasthan": {
        "short": "RJ",
        "districts": {
            "Jaipur":  ["Jaipur", "Amer", "Sanganer", "Phulera", "Jobner"],
            "Jodhpur": ["Jodhpur", "Phalodi", "Bilara", "Osian", "Luni"],
            "Kota":    ["Kota", "Sangod", "Itawa", "Pipalda", "Digod"],
            "Ajmer":   ["Ajmer", "Beawar", "Nasirabad", "Pushkar", "Kishangarh"],
            "Udaipur": ["Udaipur", "Mavli", "Vallabhnagar", "Kherwara", "Salumbar"],
        }
    },
    "Uttar Pradesh": {
        "short": "UP",
        "districts": {
            "Lucknow":   ["Lucknow", "Malihabad", "Bakshi Ka Talab", "Mohanlalganj"],
            "Agra":      ["Agra", "Fatehabad", "Kheragarh", "Bah", "Etmadpur"],
            "Varanasi":  ["Varanasi", "Pindra", "Kashi Vidyapeeth", "Arajiline"],
            "Gorakhpur": ["Gorakhpur", "Sadar", "Bansgaon", "Gola", "Sahjanwa"],
            "Meerut":    ["Meerut", "Hapur", "Modinagar", "Kithore", "Garh"],
        }
    },
    "Chhattisgarh": {
        "short": "CG",
        "districts": {
            "Raipur":      ["Raipur", "Abhanpur", "Arang", "Tilda", "Dharsiwa"],
            "Durg":        ["Durg", "Bhilai", "Patan", "Bemetara", "Nawagarh"],
            "Bilaspur":    ["Bilaspur", "Masturi", "Kotba", "Takhatpur", "Mungeli"],
            "Rajnandgaon": ["Rajnandgaon", "Dongargarh", "Khairagarh", "Chhura"],
        }
    },
}

VILLAGES_POOL = [
    "Rampur", "Shivpur", "Krishnapur", "Govindpur", "Nandpur",
    "Jagatpur", "Hanumantpur", "Durgapur", "Ambikanagar", "Lakshmipur",
    "Saraswatinagar", "Balrampur", "Keshavpur", "Vishwapur", "Arjunpur",
    "Bhimpur", "Draupadi Nagar", "Yudhishtirpur", "Nakupur", "Sahadevanagar",
]

FIRST_NAMES = [
    "Ramesh", "Suresh", "Mohan", "Dinesh", "Ganesh", "Mahesh", "Rajesh", "Prakash",
    "Anil", "Sunil", "Vijay", "Ajay", "Sanjay", "Nilesh", "Sandip", "Sachin",
    "Prashant", "Amol", "Yogesh", "Umesh", "Manoj", "Deepak", "Nitin", "Rohit",
    "Anita", "Sunita", "Kavitha", "Laxmi", "Priya", "Meena", "Rekha", "Seema",
    "Harish", "Girish", "Mukesh", "Naresh", "Kamlesh", "Rakesh", "Bhupesh",
    "Savita", "Mamta", "Geeta", "Sita", "Rita", "Shanta", "Nirmala", "Pushpa",
]

LAST_NAMES_BY_STATE = {
    "Gujarat":        ["Patel", "Shah", "Desai", "Joshi", "Mehta", "Parikh", "Trivedi", "Chaudhary", "Rana", "Solanki"],
    "Madhya Pradesh": ["Sharma", "Yadav", "Tiwari", "Mishra", "Dubey", "Pandey", "Gupta", "Soni", "Verma", "Kushwaha"],
    "Rajasthan":      ["Jat", "Meena", "Gurjar", "Sharma", "Choudhary", "Rajput", "Mali", "Saini", "Suthar", "Kumhar"],
    "Uttar Pradesh":  ["Singh", "Yadav", "Mishra", "Chauhan", "Bharti", "Maurya", "Prajapati", "Kushwaha", "Rajbhar", "Bind"],
    "Chhattisgarh":   ["Sahu", "Yadav", "Dhruw", "Netam", "Thakur", "Gond", "Baghel", "Chandrakar", "Dewangan", "Patel"],
}

# ─── Stage Buckets ───────────────────────────────────────────────────────────
# 20 leaf stages where projects are CURRENTLY WAITING — total = 500 projects.
#
# Pipeline funnel logic (each pair/group sums to its parent):
#   500 farmers  →  50 stuck at onboarding  |  450 progressed
#   450 at office →  45 pending             |  405 DPR prepared
#   405 at bank   →  101 sub pending + 30 proc + 274 sanction
#   274 at GOC    →  55 pending + 219 done
#   219 at GOC    →  55 approval pending + 164 approved
#   164 approved  →  33 not issued + 131 issued to PM
#   131 with PM   →  33 site visit pending + 98 completed
#   98 completed  →  20 design pending + 78 design done
#   78 design done → 12 contractor pending + 66 assigned
#   66 assigned   →  22 erection pending + 17 in progress + 27 done
#   27 erection done → 5 inspection pending + 22 inspection done
#   22 insp. done →  4 report pending + 18 report submitted
#   18 submitted  →  3 subsidy app pending + 15 subsidy app done
#   15 app done   →  3 subsidy visit pending + 12 visit done
#   12 visit done →  5 report not submitted + 7 report submitted
#   7 submitted   →  2 meeting pending + 5 meeting done
#   5 meeting done → 1 subsidy not released + 4 subsidy released
#
# Columns: count | exact stage string | months_min | months_max
#          | bank_milestone_done | goc_milestone_done
#          | construction_milestone_done | subsidy_released_done
# Stage strings MUST be slugs from constants/stages.py (never human labels/typos).
# Counts preserve the original funnel shape; sub-states collapsed onto their slug.
STAGE_BUCKETS = [
    # ── ONBOARDING (50) ───────────────────────────────────────────────────────
    ( 50, "farmer_onboarding",    1,  3, False, False, False, False),

    # ── OFFICE / DPR (45) ─────────────────────────────────────────────────────
    ( 45, "document_collection",  3,  5, False, False, False, False),

    # ── BANK (101 + 30) ───────────────────────────────────────────────────────
    (101, "bank_processing",      4,  7, False, False, False, False),
    ( 30, "bank_processing",      5,  7, False, False, False, False),

    # ── GOC (55 + 55 + 33) ───────────────────────────────────────────────────
    ( 55, "goc_registration",     5,  8, True,  False, False, False),
    ( 55, "goc_registration",     5,  9, True,  False, False, False),
    ( 33, "goc_registration",     6,  9, True,  False, False, False),

    # ── SITE VISIT & DESIGN (33 + 20) ─────────────────────────────────────────
    ( 33, "site_visit",           7, 10, True,  True,  False, False),
    ( 20, "design_boq",           7, 10, True,  True,  False, False),

    # ── CONTRACTOR ASSIGNMENT (12) ────────────────────────────────────────────
    ( 12, "m1_foundation",        7, 10, True,  True,  False, False),

    # ── ERECTION (22 + 17) ────────────────────────────────────────────────────
    ( 22, "m2_structure_erection", 8, 11, True,  True,  False, False),
    ( 17, "m2_structure_erection", 9, 11, True,  True,  False, False),

    # ── INSPECTION (5 + 4) ────────────────────────────────────────────────────
    (  5, "m5_drip_fitting",      9, 12, True,  True,  True,  False),
    (  4, "m5_drip_fitting",     10, 12, True,  True,  True,  False),

    # ── SUBSIDY APPLICATION (3) ───────────────────────────────────────────────
    (  3, "subsidy_claim",       10, 12, True,  True,  True,  False),

    # ── SUBSIDY VISIT (3 + 5) ─────────────────────────────────────────────────
    (  3, "agency_inspection",   10, 12, True,  True,  True,  False),
    (  5, "agency_inspection",   10, 12, True,  True,  True,  False),

    # ── COMMITTEE MEETING (2 + 1 awaiting release) ────────────────────────────
    (  2, "committee_meeting",   11, 12, True,  True,  True,  False),
    (  1, "committee_meeting",   11, 12, True,  True,  True,  False),

    # ── TERMINAL (4) ──────────────────────────────────────────────────────────
    (  4, "subsidy_released",    11, 12, True,  True,  True,  True ),
]

# Sanity check
_TOTAL = sum(b[0] for b in STAGE_BUCKETS)
assert _TOTAL == 500, f"Expected 500 projects, got {_TOTAL}"

# Guard: every bucket must use a known slug (prevents reintroducing typo stages)
_backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)
from constants.stages import ALL_STAGES  # noqa: E402
_bad_slugs = sorted({stage for _, stage, *_ in STAGE_BUCKETS if stage not in ALL_STAGES})
assert not _bad_slugs, f"Unknown stage slug(s) in STAGE_BUCKETS: {_bad_slugs}"


def phone(seed: int) -> str:
    return f"9{str(seed).zfill(9)}"


def rand_dt(months_min: int, months_max: int) -> datetime:
    """Random datetime between months_min and months_max ago."""
    days_ago = random.randint(months_min * 30, months_max * 30)
    secs_ago = random.randint(0, 86399)
    return TODAY - timedelta(days=days_ago, seconds=secs_ago)


# ─── Main ────────────────────────────────────────────────────────────────────

def run():
    print("=" * 70)
    print("  ICON REALISTIC SEED — 500 Projects | 5 States | 12 Months")
    print("=" * 70)

    # ── Drop & recreate DB ────────────────────────────────────────────────────
    print("\n[DB] Dropping existing database and recreating schema…")
    engine.dispose()
    db_path = os.path.join(os.path.dirname(__file__), "icon_app.db")
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
            print("  -> Deleted icon_app.db")
    except Exception as exc:
        print(f"  -> Could not delete file ({exc}), dropping all tables instead.")
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # =========================================================================
    # [1] LOCATIONS
    # =========================================================================
    print("\n[1] Seeding location data…")
    all_villages   = []
    state_villages = {}

    for state_name, state_info in LOCATION_DATA.items():
        st = models.State(name=state_name, short_name=state_info["short"])
        db.add(st); db.flush()
        state_villages[state_name] = []

        for dist_name, taluka_list in state_info["districts"].items():
            d = models.District(name=dist_name, state_id=st.id)
            db.add(d); db.flush()

            for tal_name in taluka_list:
                t = models.Taluka(name=tal_name, district_id=d.id)
                db.add(t); db.flush()

                for v_name in random.sample(VILLAGES_POOL, k=random.randint(2, 3)):
                    v = models.Village(
                        name=f"{v_name} ({tal_name})",
                        taluka_id=t.id,
                        pincode=f"{random.randint(10, 99)}{random.randint(1000, 9999)}",
                    )
                    db.add(v); db.flush()
                    all_villages.append(v)
                    state_villages[state_name].append(v)

    db.commit()
    print(f"  -> {len(all_villages)} villages across {len(LOCATION_DATA)} states.")

    # =========================================================================
    # [2] REFERENCE DATA
    # =========================================================================
    print("\n[2] Seeding reference / master data…")

    area_types = [
        models.ProjectAreaType(name="Normal Area",  description="Regular areas",                  multiplier=1.00),
        models.ProjectAreaType(name="Special Area", description="NE States, Himalayan, Hill etc", multiplier=1.15),
    ]
    db.add_all(area_types); db.flush()
    at_normal = area_types[0].id

    components = [
        models.Component(component_type="Structure", name="NVPH (Normal)",    category="NVPH", variant_code="NVPH-N",
                         unit="SQM", eligible_cost_per_unit=710, subsidy_rate_per_unit=355, min_qty=250, max_qty=4000, default_qty=250),
        models.Component(component_type="Structure", name="Shade Net House",  category="SNH",  variant_code="SNH",
                         unit="SQM", eligible_cost_per_unit=350, subsidy_rate_per_unit=175, min_qty=250, max_qty=4000, default_qty=250),
        models.Component(component_type="Structure", name="Fan & Pad System", category="FPS",  variant_code="FPS",
                         unit="SQM", eligible_cost_per_unit=935, subsidy_rate_per_unit=467, min_qty=250, max_qty=2000, default_qty=500),
        models.Component(component_type="Crop",      name="Tomato",           category="Vegetable",
                         unit="SQM", eligible_cost_per_unit=150, subsidy_rate_per_unit=75),
        models.Component(component_type="Crop",      name="Capsicum",         category="Vegetable",
                         unit="SQM", eligible_cost_per_unit=160, subsidy_rate_per_unit=80),
        models.Component(component_type="Crop",      name="Cucumber",         category="Vegetable",
                         unit="SQM", eligible_cost_per_unit=140, subsidy_rate_per_unit=70),
    ]
    db.add_all(components); db.flush()
    structures = [c for c in components if c.component_type == "Structure"]
    crops      = [c for c in components if c.component_type == "Crop"]

    banks_data = [
        ("State Bank of India",   "SBI"),
        ("Bank of Baroda",        "BOB"),
        ("Central Bank of India", "CBI"),
        ("Punjab National Bank",  "PNB"),
        ("Canara Bank",           "CNB"),
    ]
    branches = []
    for bname, short in banks_data:
        b = models.Bank(name=bname, short_name=short)
        db.add(b); db.flush()
        for _ in range(3):
            v  = random.choice(all_villages)
            br = models.BankBranch(
                bank_id=b.id,
                branch_name=f"{bname} — {v.name}",
                ifsc=f"{short}{random.randint(100000, 999999)}",
                village_id=v.id,
                created_at=COMPANY_FOUNDED,
            )
            db.add(br); db.flush()
            branches.append(br)

    agencies = [
        models.GovernmentAgency(name="Directorate of Horticulture", short_code="DOH"),
        models.GovernmentAgency(name="National Horticulture Board", short_code="NHB"),
        models.GovernmentAgency(name="State Agriculture Department", short_code="SAD"),
    ]
    db.add_all(agencies); db.flush()

    skills_data = [
        ("Structure Erection", "STRUCT"),
        ("Drip Installation",  "DRIP"),
        ("Bed Preparation",    "BED"),
        ("Plantation",         "PLANT"),
    ]
    skills = []
    for sname, scode in skills_data:
        s = models.Skill(name=sname, code=scode)
        db.add(s); db.flush()
        skills.append(s)
    skill_map = {s.code: s for s in skills}

    db.commit()

    # =========================================================================
    # [3] COMPANY & ADMIN
    # =========================================================================
    print("\n[3] Company and admin…")
    owner = models.Person(
        first_name="System", last_name="Owner", role="owner",
        phone_primary="9000000000", village_id=all_villages[0].id,
        created_at=COMPANY_FOUNDED,
    )
    db.add(owner); db.flush()

    company = models.Company(name="ICON Horticulture ERP", owner_id=owner.id, created_at=COMPANY_FOUNDED)
    db.add(company); db.flush()
    cid = company.id

    admin = models.Person(
        first_name="Admin", last_name="User", role="admin",
        phone_primary="9888888888", village_id=all_villages[0].id,
        created_at=COMPANY_FOUNDED,
    )
    db.add(admin); db.flush()
    db.commit()

    # =========================================================================
    # [4] STAFF
    # =========================================================================
    print("\n[4] Creating staff…")
    staff_dt   = COMPANY_FOUNDED + timedelta(days=5)
    state_names = list(LOCATION_DATA.keys())

    def make_person(role, phone_num, state_name):
        sn = state_name
        v  = random.choice(state_villages[sn])
        p  = models.Person(
            first_name=random.choice(FIRST_NAMES),
            last_name=random.choice(LAST_NAMES_BY_STATE[sn]),
            role=role, phone_primary=phone_num,
            village_id=v.id, created_at=staff_dt, is_active=1,
        )
        db.add(p); db.flush()
        return p, sn

    # Project Managers — 15
    pms = []
    for i in range(15):
        p, sn = make_person("project_manager", phone(3001 + i), state_names[i % 5])
        db.add(models.EmployeeProfile(person_id=p.id, designation="Project Manager", joining_date=staff_dt.date()))
        pms.append((p, sn))

    # Dealers — 20
    dealers = []
    for i in range(20):
        d, sn = make_person("dealer", phone(6001 + i), state_names[i % 5])
        db.add(models.BusinessProfile(
            person_id=d.id,
            firm_name=f"{d.first_name} {d.last_name} Agri Dealers",
            gst_number=f"GST{random.randint(10000, 99999)}",
        ))
        dealers.append((d, sn))

    # Office Staff — 5 (phones 9100000001–9100000005)
    office_staff = []
    for i in range(5):
        p, _ = make_person("office_staff", phone(100000001 + i), state_names[i % 5])
        office_staff.append(p)

    # Bank Officers — 5 (phones 9200000001–9200000005)
    for i in range(5):
        make_person("bank_officer", phone(200000001 + i), state_names[i % 5])

    # Agency Officers — 5 (phones 9300000001–9300000005)
    for i in range(5):
        make_person("agency_officer", phone(300000001 + i), state_names[i % 5])

    # Contractors — 15 (phones 9400000001–9400000015)
    contractor_roles = (
        [("structure_contractor", "STRUCT")] * 5 +
        [("drip_contractor",      "DRIP")]   * 5 +
        [("bed_contractor",       "BED")]    * 3 +
        [("plantation_contractor","PLANT")]  * 2
    )
    for i, (role, skill_code) in enumerate(contractor_roles):
        p, _ = make_person(role, phone(400000001 + i), state_names[i % 5])
        sk = skill_map.get(skill_code)
        if sk:
            db.add(models.ContractorSkill(
                contractor_id=p.id, skill_id=sk.id,
                certified=1, years_experience=random.randint(1, 8),
            ))

    # Agronomists — 5 (phones 9500000001–9500000005)
    for i in range(5):
        make_person("agronomist", phone(500000001 + i), state_names[i % 5])

    db.commit()
    print("  -> 15 PMs | 20 Dealers | 5 Office | 5 Bank | 5 Agency | 15 Contractors | 5 Agronomists")

    # =========================================================================
    # [5] FARMERS + PROJECTS — 500 total
    # =========================================================================
    print("\n[5] Creating 500 farmers and projects…")

    farmer_seed   = 10001
    project_idx   = 0
    total_created = 0

    for bucket_idx, (count, stage, mo_min, mo_max, bank_done, goc_done, con_done, sub_done) in enumerate(STAGE_BUCKETS):
        for _ in range(count):
            sn         = state_names[project_idx % 5]
            svil       = state_villages[sn]
            last_names = LAST_NAMES_BY_STATE[sn]

            proj_dt   = rand_dt(mo_min, mo_max)
            farmer_dt = proj_dt - timedelta(days=random.randint(1, 14))

            # ── Farmer ───────────────────────────────────────────────────────
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(last_names)
            v  = random.choice(svil)

            farmer = models.Person(
                first_name=fn, last_name=ln, role="farmer",
                phone_primary=phone(farmer_seed),
                village_id=v.id, created_at=farmer_dt, is_active=1,
            )
            db.add(farmer); db.flush()

            db.add(models.FarmerProfile(
                person_id=farmer.id,
                land_area=random.choice([1000, 2000, 2500, 3000, 4000]),
                land_unit="SQM",
                aadhaar_number=f"ADH{farmer_seed}",
            ))

            # Assign a dealer from same state
            state_dealers = [d for d, dsn in dealers if dsn == sn]
            dealer_obj    = random.choice(state_dealers) if state_dealers else dealers[0][0]
            db.add(models.DealerFarmerMapping(
                dealer_id=dealer_obj.id, farmer_id=farmer.id,
                assigned_date=farmer_dt.date(), created_at=farmer_dt,
            ))

            # ── Project ───────────────────────────────────────────────────────
            area           = random.choice([2000, 2500, 3000, 4000])
            struct         = random.choice(structures)
            crop           = random.choice(crops)
            total_eligible = area * (struct.eligible_cost_per_unit + crop.eligible_cost_per_unit)
            total_subsidy  = area * (struct.subsidy_rate_per_unit  + crop.subsidy_rate_per_unit)

            state_pms  = [p for p, psn in pms if psn == sn]
            pm_obj     = random.choice(state_pms) if state_pms else pms[0][0]
            proj_vil   = random.choice(svil)

            p_code = f"PRJ-{10000 + project_idx:05d}"
            proj   = models.Project(
                company_id=cid,
                created_by=admin.id,
                project_code=p_code,
                project_name=f"Project {p_code} — {fn} {ln}",
                farmer_id=farmer.id,
                dealer_id=dealer_obj.id,
                project_manager_id=pm_obj.id,
                village_id=proj_vil.id,
                land_area=area,
                land_unit="SQM",
                area_type_id=at_normal,
                bank_branch_id=random.choice(branches).id,
                subsidy_agency_id=random.choice(agencies).id,
                project_stage=stage,
                created_at=proj_dt,
                total_eligible_project_cost=total_eligible,
                total_project_cost=total_eligible,
                total_subsidy_amount_proposed=total_subsidy,
            )
            db.add(proj); db.flush()

            # ── Milestones ────────────────────────────────────────────────────
            milestones = []
            if bank_done:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="bank_processing",
                    status="completed", amount=round(total_eligible * 0.6, 2),
                ))
            if goc_done:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="goc_registration",
                    status="completed",
                ))
            if con_done:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="m2_structure_erection",
                    status="completed",
                ))
            if sub_done:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="subsidy_released",
                    status="completed", amount=round(total_subsidy, 2),
                ))
                proj.total_subsidy_received = round(total_subsidy, 2)
            if milestones:
                db.add_all(milestones)

            farmer_seed   += 1
            project_idx   += 1
            total_created += 1

        db.commit()
        print(f"  [{bucket_idx+1:>2}/20]  {count:>3} projects  →  {stage[:72]}")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print("  SEED COMPLETE")
    print("=" * 70)
    print(f"  Total Projects    : {total_created}")
    print(f"  Total Farmers     : {total_created}")
    print()

    # Stage snapshot
    from sqlalchemy import func
    rows = (
        db.query(models.Project.project_stage, func.count(models.Project.id))
        .group_by(models.Project.project_stage)
        .order_by(func.count(models.Project.id).desc())
        .all()
    )
    print("  Stage Distribution:")
    for stage_name, cnt in rows:
        bar = "█" * (cnt // 3)
        print(f"    {cnt:>4}  {stage_name[:55]:<55} {bar}")

    print()
    print("  Login credentials (all passwords: icon123)")
    print(f"  {'Role':<25} {'Phone'}")
    print("  " + "-" * 45)
    creds = [
        ("admin",                "9888888888"),
        ("owner",                "9000000000"),
        ("project_manager",      "9000003001 – 9000003015"),
        ("dealer",               "9000006001 – 9000006020"),
        ("office_staff",         "9100000001 – 9100000005"),
        ("bank_officer",         "9200000001 – 9200000005"),
        ("agency_officer",       "9300000001 – 9300000005"),
        ("structure_contractor", "9400000001 – 9400000005"),
        ("drip_contractor",      "9400000006 – 9400000010"),
        ("bed_contractor",       "9400000011 – 9400000013"),
        ("plantation_contractor","9400000014 – 9400000015"),
        ("agronomist",           "9500000001 – 9500000005"),
        ("farmer (sample)",      "9000010001 – 9000010500"),
    ]
    for role, ph in creds:
        print(f"  {role:<25} {ph}")

    print()
    print("  NEXT STEP:")
    print("    python migrate_stages.py   → converts stage strings to slugs")
    print("                                  (fixes all KPI dashboard counts)")
    print("=" * 70)
    db.close()


if __name__ == "__main__":
    run()
