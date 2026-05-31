import sqlite3

def migrate_db():
    conn = sqlite3.connect('icon_app.db')
    cursor = conn.cursor()

    try:
        # Create project_items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS project_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                line_type VARCHAR(50) NOT NULL,
                item_id INTEGER NOT NULL,
                unit VARCHAR(50),
                qty FLOAT DEFAULT 0.0,
                subsidy_rate_per_unit FLOAT DEFAULT 0.0,
                subsidy_unit_cost FLOAT DEFAULT 0.0,
                subsidy_state_multiplier FLOAT DEFAULT 1.0,
                subsidy_eligible_amount FLOAT DEFAULT 0.0,
                subsidy_rate FLOAT DEFAULT 0.0,
                subsidy_amount FLOAT DEFAULT 0.0,
                actual_rate_per_unit FLOAT DEFAULT 0.0,
                actual_unit_cost FLOAT DEFAULT 0.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        ''')
        
        # Add new columns to projects table
        try:
            cursor.execute("ALTER TABLE projects ADD COLUMN total_eligible_project_cost FLOAT DEFAULT 0.0;")
        except sqlite3.OperationalError as e:
            pass # column already exists
            
        try:
            cursor.execute("ALTER TABLE projects ADD COLUMN total_project_cost FLOAT DEFAULT 0.0;")
        except sqlite3.OperationalError as e:
            pass # column already exists
            
        try:
            cursor.execute("ALTER TABLE projects ADD COLUMN total_subsidy_amount_proposed FLOAT DEFAULT 0.0;")
        except sqlite3.OperationalError as e:
            pass # column already exists

        # Rename foreign keys in other tables
        try:
            cursor.execute("ALTER TABLE daily_site_reports RENAME COLUMN project_structure_id TO project_item_id;")
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute("ALTER TABLE structure_stage_logs RENAME COLUMN project_structure_id TO project_item_id;")
        except sqlite3.OperationalError:
            pass

        try:
            cursor.execute("ALTER TABLE project_progress_photos RENAME COLUMN project_structure_id TO project_item_id;")
        except sqlite3.OperationalError:
            pass

        # Drop old tables
        cursor.execute("DROP TABLE IF EXISTS project_structures;")
        cursor.execute("DROP TABLE IF EXISTS project_components;")

        # Create project_co_applicants table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS project_co_applicants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                farmer_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY(farmer_id)  REFERENCES person(id)   ON DELETE CASCADE,
                UNIQUE(project_id, farmer_id)
            )
        ''')

        # Create document_types master table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS document_types (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          VARCHAR(150) UNIQUE NOT NULL,
                category      VARCHAR(50)  NOT NULL,
                description   TEXT,
                allowed_roles VARCHAR(300),
                is_required   INTEGER DEFAULT 0,
                is_active     INTEGER DEFAULT 1,
                sort_order    INTEGER DEFAULT 0,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Seed document types (only if table is empty)
        cursor.execute("SELECT COUNT(*) FROM document_types")
        if cursor.fetchone()[0] == 0:
            seed_docs = [
                # (name, category, description, allowed_roles, is_required, sort_order)
                # ── KYC Identity ──────────────────────────────────────────────
                ("Aadhaar Card (Front)", "KYC", "Front side showing name, DOB, photo", "admin,owner,office_staff,dealer", 1, 10),
                ("Aadhaar Card (Back)",  "KYC", "Back side showing address",            "admin,owner,office_staff,dealer", 1, 11),
                ("PAN Card",             "KYC", "Permanent Account Number card",        "admin,owner,office_staff,dealer", 1, 12),
                ("Farmer Photograph",    "KYC", "Recent passport-size photo",           "admin,owner,office_staff,dealer", 0, 13),
                ("Bank Passbook",        "KYC", "Bank account passbook first page",     "admin,owner,office_staff,dealer", 0, 14),
                ("Caste Certificate",    "KYC", "Caste / category certificate",         "admin,owner,office_staff,dealer", 0, 15),
                # ── Land Records ──────────────────────────────────────────────
                ("7/12 Extract (Land Record)", "Land", "Satbara / Khasara land ownership record", "admin,owner,office_staff,dealer", 1, 20),
                ("8A Certificate",            "Land", "Khatauni / Land bank certificate",          "admin,owner,office_staff,dealer", 1, 21),
                ("Land Map",                  "Land", "Survey / cadastral map of the plot",        "admin,owner,office_staff,dealer", 0, 22),
                # ── Project Documents ──────────────────────────────────────────
                ("DPR Document",          "Project", "Detailed Project Report",               "admin,owner,office_staff,project_manager", 0, 30),
                ("BOQ Sheet",             "Project", "Bill of Quantities",                    "admin,owner,office_staff,project_manager", 0, 31),
                ("Contractor Quotation",  "Project", "Contractor price quotation",            "admin,owner,office_staff,dealer,project_manager", 0, 32),
                ("Site Photograph",       "Project", "Site / field photograph",               "admin,owner,office_staff,project_manager,agronomist,structure_contractor,drip_contractor,bed_contractor,plantation_contractor", 0, 33),
                # ── Milestone Photos ───────────────────────────────────────────
                ("M1 Foundation Photo",        "Project", "Foundation stage photo",        "admin,owner,office_staff,project_manager,structure_contractor", 0, 40),
                ("M2 Structure Erection Photo","Project", "Structure erection stage photo","admin,owner,office_staff,project_manager,structure_contractor", 0, 41),
                ("M3 Covering Material Photo", "Project", "Covering material stage photo", "admin,owner,office_staff,project_manager,structure_contractor", 0, 42),
                ("M4 Trellising Photo",        "Project", "Trellising stage photo",        "admin,owner,office_staff,project_manager,structure_contractor", 0, 43),
                ("M5 Drip Fitting Photo",      "Project", "Drip irrigation fitting photo", "admin,owner,office_staff,project_manager,drip_contractor",      0, 44),
                ("M6 Bed Preparation Photo",   "Project", "Bed preparation stage photo",   "admin,owner,office_staff,project_manager,bed_contractor",       0, 45),
                ("M7 Plantation Photo",        "Project", "Plantation stage photo",        "admin,owner,office_staff,project_manager,plantation_contractor",0, 46),
                # ── Bank Documents ────────────────────────────────────────────
                ("Bank Sanction Letter",      "Bank", "Bank loan sanction letter",     "admin,owner,office_staff,bank_officer", 1, 50),
                ("Bank Appraisal Report",     "Bank", "Bank project appraisal report", "admin,owner,office_staff,bank_officer", 1, 51),
                ("Bank Legal Search Report",  "Bank", "Bank legal / title search",     "admin,owner,office_staff,bank_officer", 1, 52),
                ("KCC Letter",                "Bank", "Kisan Credit Card letter",      "admin,owner,office_staff,bank_officer", 0, 53),
                ("Bank Correspondence",       "Bank", "Letters / queries to-from bank","admin,owner,office_staff,bank_officer", 0, 54),
                # ── Agency / Subsidy ──────────────────────────────────────────
                ("GOC Letter",                 "Agency", "Government order / communication",  "admin,owner,office_staff,agency_officer", 0, 60),
                ("Inspection Report",          "Agency", "Field inspection report",           "admin,owner,office_staff,agency_officer", 0, 61),
                ("Subsidy Claim Form",         "Agency", "Subsidy application / claim form",  "admin,owner,office_staff,agency_officer", 0, 62),
                ("Committee Approval Letter",  "Agency", "Approval letter from committee",    "admin,owner,office_staff,agency_officer", 0, 63),
                ("Subsidy Release Order",      "Agency", "Subsidy disbursement order",        "admin,owner,office_staff,agency_officer", 0, 64),
                # ── Completion ────────────────────────────────────────────────
                ("Completion Certificate",    "Completion", "Project completion certificate", "admin,owner,office_staff", 0, 70),
                # ── Other ─────────────────────────────────────────────────────
                ("Other",                     "Other", "Any other supporting document", None, 0, 99),
            ]
            cursor.executemany(
                "INSERT INTO document_types (name, category, description, allowed_roles, is_required, sort_order) VALUES (?,?,?,?,?,?)",
                seed_docs
            )

        conn.commit()
        print("Database migration completed successfully!")
    except Exception as e:
        print(f"Error migrating database: {e}")
        conn.rollback()
    finally:
        conn.close()
    

if __name__ == "__main__":
    migrate_db()
