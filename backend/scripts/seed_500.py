import sys, os, random
from datetime import date, timedelta, datetime

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal, engine, Base
import models

random.seed(42)

TODAY = datetime(2026, 4, 16, 10, 0, 0)
TODAY_DATE = TODAY.date()
TWELVE_MONTHS_AGO = TODAY - timedelta(days=365)

# =============================================================================
# LOCATION DATA — 5 States
# =============================================================================

LOCATION_DATA = {
    "Gujarat": {
        "short": "GJ",
        "districts": {
            "Anand":        ["Anand", "Petlad", "Borsad", "Khambhat", "Sojitra"],
            "Vadodara":     ["Vadodara", "Karjan", "Padra", "Dabhoi", "Waghodia"],
            "Sabarkantha":  ["Himmatnagar", "Idar", "Modasa", "Bayad", "Khedbrahma"],
            "Banaskantha":  ["Palanpur", "Deesa", "Dhanera", "Vav", "Danta"],
            "Gandhinagar":  ["Gandhinagar", "Mansa", "Dehgam", "Kalol"],
        }
    },
    "Madhya Pradesh": {
        "short": "MP",
        "districts": {
            "Indore":       ["Indore", "Sanwer", "Depalpur", "Hatod", "Mhow"],
            "Bhopal":       ["Bhopal", "Berasia", "Phanda", "Huzur"],
            "Jabalpur":     ["Jabalpur", "Sihora", "Patan", "Bargi", "Panagar"],
            "Sagar":        ["Sagar", "Khurai", "Banda", "Rahatgarh", "Rehli"],
            "Rewa":         ["Rewa", "Mauganj", "Huzur", "Naigarhi", "Gurh"],
            "Ujjain":       ["Ujjain", "Nagda", "Khacharod", "Tarana", "Mahidpur"],
        }
    },
    "Rajasthan": {
        "short": "RJ",
        "districts": {
            "Jaipur":       ["Jaipur", "Amer", "Sanganer", "Phulera", "Jobner"],
            "Jodhpur":      ["Jodhpur", "Phalodi", "Bilara", "Osian", "Luni"],
            "Kota":         ["Kota", "Sangod", "Itawa", "Pipalda", "Digod"],
            "Ajmer":        ["Ajmer", "Beawar", "Nasirabad", "Pushkar", "Kishangarh"],
            "Udaipur":      ["Udaipur", "Mavli", "Vallabhnagar", "Kherwara", "Salumbar"],
            "Sikar":        ["Sikar", "Fatehpur", "Laxmangarh", "Danta", "Neem Ka Thana"],
        }
    },
    "Uttar Pradesh": {
        "short": "UP",
        "districts": {
            "Lucknow":      ["Lucknow", "Malihabad", "Bakshi Ka Talab", "Mohanlalganj"],
            "Agra":         ["Agra", "Fatehabad", "Kheragarh", "Bah", "Etmadpur"],
            "Varanasi":     ["Varanasi", "Pindra", "Kashi Vidyapeeth", "Arajiline"],
            "Gorakhpur":    ["Gorakhpur", "Sadar", "Bansgaon", "Gola", "Sahjanwa"],
            "Meerut":       ["Meerut", "Hapur", "Modinagar", "Kithore", "Garh"],
            "Mathura":      ["Mathura", "Baldeo", "Vrindavan", "Govardhan", "Mant"],
        }
    },
    "Chhattisgarh": {
        "short": "CG",
        "districts": {
            "Raipur":       ["Raipur", "Abhanpur", "Arang", "Tilda", "Dharsiwa"],
            "Durg":         ["Durg", "Bhilai", "Patan", "Bemetara", "Nawagarh"],
            "Bilaspur":     ["Bilaspur", "Masturi", "Kotba", "Takhatpur", "Mungeli"],
            "Rajnandgaon":  ["Rajnandgaon", "Dongargarh", "Khairagarh", "Chhura"],
            "Korba":        ["Korba", "Katghora", "Pali", "Kartala"],
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
    "Harish", "Girish", "Mukesh", "Naresh", "Kamlesh", "Rakesh", "Bhupesh", "Lokesh",
    "Savita", "Mamta", "Geeta", "Sita", "Rita", "Shanta", "Nirmala", "Pushpa",
]

# State-specific last names
LAST_NAMES_BY_STATE = {
    "Gujarat":        ["Patel", "Shah", "Desai", "Joshi", "Mehta", "Parikh", "Trivedi", "Chaudhary", "Rana", "Solanki"],
    "Madhya Pradesh": ["Sharma", "Yadav", "Tiwari", "Mishra", "Dubey", "Pandey", "Gupta", "Soni", "Verma", "Kushwaha"],
    "Rajasthan":      ["Jat", "Meena", "Gurjar", "Sharma", "Choudhary", "Rajput", "Mali", "Saini", "Suthar", "Kumhar"],
    "Uttar Pradesh":  ["Singh", "Yadav", "Mishra", "Chauhan", "Bharti", "Maurya", "Prajapati", "Kushwaha", "Rajbhar", "Bind"],
    "Chhattisgarh":   ["Sahu", "Yadav", "Dhruw", "Netam", "Thakur", "Gond", "Baghel", "Chandrakar", "Dewangan", "Patel"],
}

STAGES_ORDER = [
    "farmer_onboarding", "document_collection", "site_visit", "design_boq",
    "dpr_ready", "bank_processing", "goc_registration", "m1_foundation",
    "m2_structure_erection", "m3_covering_material", "m4_trellising",
    "m5_drip_fitting", "m6_bed_preparation", "m7_plantation", "subsidy_claim",
    "agency_inspection", "committee_meeting", "subsidy_released", "completed"
]


def phone(seed):
    return f"9{str(seed).zfill(9)}"


def rand_dt_between(d1, d2):
    if d1 >= d2:
        return d1
    delta = d2 - d1
    int_delta = (delta.days * 24 * 60 * 60) + delta.seconds
    if int_delta == 0:
        return d1
    return d1 + timedelta(seconds=random.randrange(int_delta))


def fresh_seed():
    print("=" * 70)
    print("  ICON FRESH SEED — 5 States | 500 Farmers | 12 Months")
    print("=" * 70)

    print("\n[DB] Removing existing database and recreating schema...")
    engine.dispose()
    db_path = os.path.join(os.path.dirname(__file__), "icon_app.db")
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
            print("  -> Deleted icon_app.db")
    except Exception as e:
        print(f"  -> Could not delete file ({e}), dropping all tables instead.")
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # =========================================================================
    # [1] LOCATIONS — States → Districts → Talukas → Villages
    # =========================================================================
    print("\n[1] Seeding location data (States, Districts, Talukas, Villages)...")

    all_villages = []
    state_obj_map = {}      # state_name -> State ORM object
    district_obj_map = {}   # district_name -> District ORM object
    state_villages = {}     # state_name -> [Village ORM objects]

    for state_name, state_info in LOCATION_DATA.items():
        st = models.State(name=state_name, short_name=state_info["short"])
        db.add(st)
        db.flush()
        state_obj_map[state_name] = st
        state_villages[state_name] = []

        for dist_name, taluka_list in state_info["districts"].items():
            d = models.District(name=dist_name, state_id=st.id)
            db.add(d)
            db.flush()
            district_obj_map[dist_name] = d

            for tal_name in taluka_list:
                t = models.Taluka(name=tal_name, district_id=d.id)
                db.add(t)
                db.flush()

                # 2–3 villages per taluka
                for v_name in random.sample(VILLAGES_POOL, k=random.randint(2, 3)):
                    v = models.Village(
                        name=f"{v_name} ({tal_name})",
                        taluka_id=t.id,
                        pincode=f"{random.randint(10, 99)}{random.randint(1000, 9999)}"
                    )
                    db.add(v)
                    db.flush()
                    all_villages.append(v)
                    state_villages[state_name].append(v)

    db.commit()
    print(f"  -> {len(all_villages)} villages created across {len(LOCATION_DATA)} states.")

    # =========================================================================
    # [2] REFERENCE DATA — Components, Agencies, Banks, Skills
    # =========================================================================
    print("\n[2] Seeding reference / master data...")

    company_dt = TODAY - timedelta(days=400)

    area_types = [
        models.ProjectAreaType(name="Normal Area",   description="Regular areas",                  multiplier=1.00),
        models.ProjectAreaType(name="Special Area",  description="NE States, Himalayan, Hill etc", multiplier=1.15),
    ]
    db.add_all(area_types)
    db.flush()
    at_id = {a.name: a.id for a in area_types}

    components = [
        models.Component(component_type="Structure", name="NVPH (Normal)",     category="NVPH", variant_code="NVPH-N",
                         unit="SQM", eligible_cost_per_unit=710,  subsidy_rate_per_unit=355,  min_qty=250, max_qty=4000, default_qty=250),
        models.Component(component_type="Structure", name="Shade Net House",   category="SNH",  variant_code="SNH",
                         unit="SQM", eligible_cost_per_unit=350,  subsidy_rate_per_unit=175,  min_qty=250, max_qty=4000, default_qty=250),
        models.Component(component_type="Structure", name="Fan & Pad System",  category="FPS",  variant_code="FPS",
                         unit="SQM", eligible_cost_per_unit=935,  subsidy_rate_per_unit=467,  min_qty=250, max_qty=2000, default_qty=500),
        models.Component(component_type="Crop",      name="Tomato",            category="Vegetable",
                         unit="SQM", eligible_cost_per_unit=150,  subsidy_rate_per_unit=75),
        models.Component(component_type="Crop",      name="Capsicum",          category="Vegetable",
                         unit="SQM", eligible_cost_per_unit=160,  subsidy_rate_per_unit=80),
        models.Component(component_type="Crop",      name="Cucumber",          category="Vegetable",
                         unit="SQM", eligible_cost_per_unit=140,  subsidy_rate_per_unit=70),
    ]
    db.add_all(components)
    db.flush()
    structures = [c for c in components if c.component_type == "Structure"]
    crops      = [c for c in components if c.component_type == "Crop"]

    # Banks — one per state region
    banks_data = [
        ("State Bank of India",          "SBI"),
        ("Bank of Baroda",               "BOB"),
        ("Central Bank of India",        "CBI"),
        ("Punjab National Bank",         "PNB"),
        ("Canara Bank",                  "CNB"),
    ]
    branches = []
    for bname, short in banks_data:
        b = models.Bank(name=bname, short_name=short)
        db.add(b)
        db.flush()
        for _ in range(3):
            v = random.choice(all_villages)
            br = models.BankBranch(
                bank_id=b.id,
                branch_name=f"{bname} — {v.name}",
                ifsc=f"{short}{random.randint(100000, 999999)}",
                village_id=v.id,
                created_at=company_dt,
            )
            db.add(br)
            db.flush()
            branches.append(br)

    agencies = [
        models.GovernmentAgency(name="Directorate of Horticulture",    short_code="DOH"),
        models.GovernmentAgency(name="National Horticulture Board",    short_code="NHB"),
        models.GovernmentAgency(name="State Agriculture Department",   short_code="SAD"),
    ]
    db.add_all(agencies)
    db.flush()

    skills_data = [("Structure Erection", "STRUCT"), ("Drip Installation", "DRIP")]
    skills = []
    for name, code in skills_data:
        s = models.Skill(name=name, code=code)
        db.add(s)
        db.flush()
        skills.append(s)

    db.commit()

    # =========================================================================
    # [3] COMPANY & ADMIN
    # =========================================================================
    print("\n[3] Creating company and admin user...")

    owner = models.Person(
        first_name="System", last_name="Owner", role="owner",
        phone_primary="9000000000",
        village_id=all_villages[0].id,
        created_at=company_dt,
    )
    db.add(owner)
    db.flush()

    company = models.Company(name="ICON Horticulture ERP", owner_id=owner.id, created_at=company_dt)
    db.add(company)
    db.flush()
    cid = company.id

    admin = models.Person(
        first_name="Admin", last_name="User", role="admin",
        phone_primary="9888888888",
        village_id=all_villages[0].id,
        created_at=company_dt,
    )
    db.add(admin)
    db.flush()
    db.commit()

    # =========================================================================
    # [4] STAFF (Project Managers & Dealers) — spread across states
    # =========================================================================
    print("\n[4] Creating staff (project managers & dealers)...")

    staff_dt = TODAY - timedelta(days=390)
    pms = []
    for i in range(15):
        state_name = list(LOCATION_DATA.keys())[i % 5]
        last_names = LAST_NAMES_BY_STATE[state_name]
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(last_names)
        v  = random.choice(state_villages[state_name])
        p  = models.Person(
            first_name=fn, last_name=ln, role="project_manager",
            phone_primary=phone(3001 + i),
            village_id=v.id,
            created_at=staff_dt,
        )
        db.add(p)
        db.flush()
        db.add(models.EmployeeProfile(person_id=p.id, designation="Project Manager", joining_date=company_dt.date()))
        pms.append(p)

    normal_dealers = []
    for i in range(20):
        state_name = list(LOCATION_DATA.keys())[i % 5]
        last_names = LAST_NAMES_BY_STATE[state_name]
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(last_names)
        v  = random.choice(state_villages[state_name])
        d  = models.Person(
            first_name=fn, last_name=ln, role="dealer",
            phone_primary=phone(6001 + i),
            village_id=v.id,
            created_at=staff_dt,
        )
        db.add(d)
        db.flush()
        db.add(models.BusinessProfile(
            person_id=d.id,
            firm_name=f"{fn} {ln} Agri Dealers",
            gst_number=f"GST{random.randint(10000, 99999)}",
        ))
        normal_dealers.append((d, state_name))

    db.commit()

    # =========================================================================
    # [5] FARMERS — 500 across 5 states, spread over last 12 months
    # =========================================================================
    print("\n[5] Creating 500 farmers spread over last 12 months & 5 states...")

    # Distribute 500 farmers roughly equally across 5 states (100 each)
    state_names = list(LOCATION_DATA.keys())
    farmers_per_state = 100  # 100 × 5 = 500

    # Month-based registration spread (equal distribution)
    # 500 farmers / 12 months ≈ 41–42 per month
    months_ago_range = 12

    farmers = []             # list of (Person ORM, state_name)
    farmer_phone_offset = 10001

    for state_idx, state_name in enumerate(state_names):
        last_names = LAST_NAMES_BY_STATE[state_name]
        svil = state_villages[state_name]

        for j in range(farmers_per_state):
            # Spread registration dates evenly across the 12-month window
            global_farmer_idx = state_idx * farmers_per_state + j
            # assign a month bucket (0 = oldest, 11 = most recent)
            month_bucket = global_farmer_idx % months_ago_range
            # Calculate window for this bucket
            bucket_end_days   = (months_ago_range - month_bucket) * 30
            bucket_start_days = bucket_end_days + 30
            dt_start = TODAY - timedelta(days=bucket_start_days)
            dt_end   = TODAY - timedelta(days=bucket_end_days)
            reg_dt   = rand_dt_between(dt_start, dt_end)

            fn = random.choice(FIRST_NAMES)
            ln = random.choice(last_names)
            v  = random.choice(svil)

            f = models.Person(
                first_name=fn, last_name=ln, role="farmer",
                phone_primary=phone(farmer_phone_offset),
                village_id=v.id,
                created_at=reg_dt,
            )
            db.add(f)
            db.flush()
            db.add(models.FarmerProfile(
                person_id=f.id,
                land_area=random.randint(1000, 6000),
                land_unit="SQM",
                aadhaar_number=f"ADH{farmer_phone_offset}",
            ))

            # Assign dealer from same state
            state_dealers = [d for d, s in normal_dealers if s == state_name]
            dealer = random.choice(state_dealers) if state_dealers else normal_dealers[0][0]
            db.add(models.DealerFarmerMapping(
                dealer_id=dealer.id,
                farmer_id=f.id,
                assigned_date=reg_dt.date(),
                created_at=reg_dt,
            ))

            farmers.append((f, state_name))
            farmer_phone_offset += 1

    db.commit()
    print(f"  -> {len(farmers)} farmers created.")

    # =========================================================================
    # [6] PROJECTS — funnel distribution across farmers
    # =========================================================================
    print("\n[6] Creating projects with lifecycle funnel distribution...")

    # Funnel:  count, stage_idx, bank?, goc?, work?, complete?, subsidy_rel?
    # stage indexes map to STAGES_ORDER list
    BUCKETS = [
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
    ]

    total_projects = sum(b[0] for b in BUCKETS)
    print(f"  -> Planning {total_projects} projects across {len(BUCKETS)} funnel stages.")

    p_idx = 0
    dealer_list = [d for d, s in normal_dealers]

    for bucket in BUCKETS:
        count, stage_string, bank_done, goc_done, work_done, completed, sub_rel = bucket

        for _ in range(count):
            farmer, f_state = farmers[p_idx % len(farmers)]
            proj_created_dt = farmer.created_at

            p_code = f"PRJ-{10000 + p_idx}"
            struct = random.choice(structures)
            crop   = random.choice(crops)
            area   = random.choice([2000, 2500, 3000, 4000])

            total_eligible = area * (struct.eligible_cost_per_unit + crop.eligible_cost_per_unit)
            total_subsidy  = area * (struct.subsidy_rate_per_unit  + crop.subsidy_rate_per_unit)

            state_vil = state_villages.get(f_state, all_villages)
            proj_village = random.choice(state_vil) if state_vil else random.choice(all_villages)

            proj = models.Project(
                company_id=cid,
                created_by=admin.id,
                project_code=p_code,
                project_name=f"Project {p_code} — {farmer.first_name} {farmer.last_name}",
                farmer_id=farmer.id,
                dealer_id=random.choice(dealer_list).id,
                project_manager_id=random.choice(pms).id,
                village_id=proj_village.id,
                land_area=area,
                land_unit="SQM",
                area_type_id=at_id["Normal Area"],
                bank_branch_id=random.choice(branches).id,
                subsidy_agency_id=random.choice(agencies).id,
                project_stage=stage_string,
                created_at=proj_created_dt,
                total_eligible_project_cost=total_eligible,
                total_project_cost=total_eligible,
                total_subsidy_amount_proposed=total_subsidy,
            )
            db.add(proj)
            db.flush()

            milestones = []
            if bank_done:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="bank_processing",
                    status="completed", amount=total_eligible * 0.6,
                ))
            if goc_done:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="goc_registration",
                    status="completed",
                ))
            if work_done:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="m2_structure_erection",
                    status="completed",
                ))
            if completed:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="m7_plantation",
                    status="completed",
                ))
            if sub_rel:
                milestones.append(models.ProjectMilestone(
                    project_id=proj.id, milestone_name="subsidy_released",
                    status="completed", amount=total_subsidy,
                ))

            db.add_all(milestones)
            p_idx += 1

        db.commit()
        print(f"     Stage '{stage_string}': {count} projects [OK]")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print("  SEED COMPLETE — Summary")
    print("=" * 70)
    print(f"  States    : {len(LOCATION_DATA)}")
    print(f"  Villages  : {len(all_villages)}")
    print(f"  Farmers   : {len(farmers)}")
    print(f"  Projects  : {p_idx}")
    print(f"  Dealers   : {len(normal_dealers)}")
    print(f"  PMs       : {len(pms)}")
    print(f"  Banks     : {len(banks_data)} ({len(branches)} branches)")
    print(f"  Date Range: {TWELVE_MONTHS_AGO.date()} to {TODAY_DATE}")
    print("=" * 70)


if __name__ == "__main__":
    fresh_seed()
