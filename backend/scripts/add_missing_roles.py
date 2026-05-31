"""
Run this ONCE from the backend folder to add the missing role accounts.
These roles were not created by fresh_seed.py.

    cd backend
    python add_missing_roles.py
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
import models
from datetime import datetime

MISSING_ROLES = [
    # (role,                    first_name,  last_name,    phone)
    ("office_staff",           "Office",    "Staff",      "9100000001"),
    ("bank_officer",           "Bank",      "Officer",    "9100000002"),
    ("agency_officer",         "Agency",    "Officer",    "9100000003"),
    ("agronomist",             "Agro",      "Nomist",     "9100000004"),
    ("structure_contractor",   "Structure", "Contractor", "9100000005"),
    ("drip_contractor",        "Drip",      "Contractor", "9100000006"),
]

def run():
    db = SessionLocal()
    try:
        # Grab any village id for the required FK
        village = db.query(models.Village).first()
        if not village:
            print("ERROR: No villages found. Run fresh_seed.py first.")
            return

        created = []
        for role, fname, lname, phone in MISSING_ROLES:
            existing = db.query(models.Person).filter(
                models.Person.phone_primary == phone
            ).first()
            if existing:
                print(f"  SKIP (exists): {role} — {phone}")
                continue

            person = models.Person(
                first_name=fname,
                last_name=lname,
                role=role,
                phone_primary=phone,
                village_id=village.id,
                is_active=True,
                created_at=datetime.now(),
            )
            db.add(person)
            db.flush()
            created.append((role, phone))
            print(f"  CREATED: {role:<25} phone={phone}  pw=icon123")

        db.commit()
        print(f"\nDone. {len(created)} user(s) added.")
        print("\nAll login credentials:")
        print(f"{'Role':<25} {'Phone':<15} {'Password'}")
        print("-" * 50)
        all_creds = [
            ("admin",               "9888888888 or 'admin'"),
            ("owner",               "9000000000"),
            ("project_manager",     "9000003001"),
            ("dealer",              "9000006001"),
            ("farmer",              "9000010001"),
            ("office_staff",        "9100000001"),
            ("bank_officer",        "9100000002"),
            ("agency_officer",      "9100000003"),
            ("agronomist",          "9100000004"),
            ("structure_contractor","9100000005"),
            ("drip_contractor",     "9100000006"),
        ]
        for role, phone in all_creds:
            print(f"  {role:<25} {phone:<20} icon123")

    finally:
        db.close()

if __name__ == "__main__":
    run()
