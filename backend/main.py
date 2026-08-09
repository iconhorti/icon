from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from database import engine, Base, SessionLocal
from routers import (
    auth, users, farmers, banks, projects, structures, dealers,
    contractors, site_visits, subsidy, reports, notifications, uploads,
    dashboard
)
import models

logger = logging.getLogger("icon.startup")


def _run_migrations():
    """
    Lightweight idempotent column migrations. create_all() creates NEW tables
    but never ALTERs existing ones, so columns added to pre-existing tables are
    applied here (safe to run on every startup).
    """
    from sqlalchemy import inspect, text
    inspector = inspect(engine)

    def add_column_if_missing(table: str, column: str, ddl_type: str, default_sql: str = ""):
        try:
            existing = {c["name"] for c in inspector.get_columns(table)}
            if column in existing:
                return
            default_clause = f" DEFAULT {default_sql}" if default_sql else ""
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}{default_clause}"))
        except Exception:
            logger.exception("Failed to add column %s.%s", table, column)

    def add_index_if_missing(table: str, column: str):
        try:
            existing_idx_cols = set()
            for idx in inspector.get_indexes(table):
                existing_idx_cols.update(idx.get("column_names", []))
            if column in existing_idx_cols:
                return
            index_name = f"ix_{table}_{column}"
            with engine.begin() as conn:
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table} ({column})"))
        except Exception:
            pass

    # Optimistic-concurrency tokens
    add_column_if_missing("projects", "version", "INTEGER", "1")
    add_column_if_missing("project_milestones", "version", "INTEGER", "1")
    add_column_if_missing("project_milestones", "updated_at", "DATETIME")

    # Stage-workflow fields — back web StageActionPanel forms (bank → completed)
    for col, ddl in (
        ("project_stage_entered_at", "DATETIME"),
        ("loan_amount", "FLOAT"),
        ("loan_sanction_date", "DATE"),
        ("loan_account_number", "VARCHAR(100)"),
        ("goc_number", "VARCHAR(100)"),
        ("goc_date", "DATE"),
        ("plantation_date", "DATE"),
        ("seedlings_count", "INTEGER"),
        ("agronomist_recommendations", "TEXT"),
        ("subsidy_claim_reference", "VARCHAR(100)"),
        ("subsidy_claim_date", "DATE"),
        ("subsidy_inspection_date", "DATE"),
        ("subsidy_inspector_name", "VARCHAR(200)"),
        ("subsidy_inspection_remarks", "TEXT"),
        ("subsidy_inspection_passed", "INTEGER"),
        ("subsidy_meeting_date", "DATE"),
        ("subsidy_meeting_decision", "VARCHAR(20)"),
        ("subsidy_approved_amount", "FLOAT"),
        ("subsidy_meeting_remarks", "TEXT"),
        ("subsidy_release_order_number", "VARCHAR(100)"),
        ("subsidy_release_amount", "FLOAT"),
        ("subsidy_release_date", "DATE"),
        ("subsidy_bank_credit_date", "DATE"),
        ("completion_certificate_date", "DATE"),
        ("farmer_feedback", "TEXT"),
        ("farmer_rating", "INTEGER"),
    ):
        add_column_if_missing("projects", col, ddl)

    add_index_if_missing("projects", "farmer_id")
    add_index_if_missing("projects", "dealer_id")
    add_index_if_missing("notifications", "user_id")

    add_column_if_missing("projects", "khatauni_number", "VARCHAR(50)")
    add_column_if_missing("projects", "ownership_type", "VARCHAR(20)", "'single'")

    for col, ddl, default in (
        ("khatauni_number", "VARCHAR(50)", ""),
        ("land_type", "VARCHAR(30)", "'agricultural'"),
        ("encumbrance", "INTEGER", "0"),
        ("is_project_khasra", "INTEGER", "0"),
    ):
        add_column_if_missing("project_land_parcels", col, ddl, default)

    for col, ddl, default in (
        ("father_name", "VARCHAR(120)", ""),
        ("share_percentage", "FLOAT", ""),
        ("owner_type", "VARCHAR(20)", "'project'"),
    ):
        add_column_if_missing("project_land_owners", col, ddl, default)


# 1b. Seed document_types master table if empty
def _seed_document_types():
    """Insert default document type rows on first run (idempotent)."""
    db = SessionLocal()
    try:
        if db.query(models.DocumentType).count() == 0:
            SEED = [
                # (name, category, description, allowed_roles, is_required, sort_order)
                ("Aadhaar Card (Front)",       "KYC",        "Front side – name, DOB, photo",          "admin,owner,office_staff,dealer",         1, 10),
                ("Aadhaar Card (Back)",        "KYC",        "Back side – address",                     "admin,owner,office_staff,dealer",         1, 11),
                ("PAN Card",                   "KYC",        "Permanent Account Number card",           "admin,owner,office_staff,dealer",         1, 12),
                ("Farmer Photograph",          "KYC",        "Recent passport-size photo",              "admin,owner,office_staff,dealer",         0, 13),
                ("Bank Passbook",              "KYC",        "Bank account passbook first page",        "admin,owner,office_staff,dealer",         0, 14),
                ("Caste Certificate",          "KYC",        "Caste / category certificate",            "admin,owner,office_staff,dealer",         0, 15),
                ("7/12 Extract (Land Record)", "Land",       "Satbara / Khasara land ownership record", "admin,owner,office_staff,dealer",         1, 20),
                ("8A Certificate",             "Land",       "Khatauni / Land bank certificate",        "admin,owner,office_staff,dealer",         1, 21),
                ("NOC / Land Owner Consent",   "Land",       "Joint-ownership NOC for bank / subsidy",  "admin,owner,office_staff,dealer",         1, 22),
                ("Land Map",                   "Land",       "Survey / cadastral map of the plot",      "admin,owner,office_staff,dealer",         0, 23),
                ("DPR Document",               "Project",    "Detailed Project Report",                 "admin,owner,office_staff,project_manager",0, 30),
                ("BOQ Sheet",                  "Project",    "Bill of Quantities",                      "admin,owner,office_staff,project_manager",0, 31),
                ("Contractor Quotation",       "Project",    "Contractor price quotation",              "admin,owner,office_staff,dealer,project_manager",0,32),
                ("Site Photograph",            "Project",    "Site / field photograph",                 "admin,owner,office_staff,project_manager,agronomist,structure_contractor,drip_contractor,bed_contractor,plantation_contractor",0,33),
                ("M1 Foundation Photo",        "Project",    "Foundation stage photo",                  "admin,owner,office_staff,project_manager,structure_contractor",0,40),
                ("M2 Structure Erection Photo","Project",    "Structure erection stage photo",          "admin,owner,office_staff,project_manager,structure_contractor",0,41),
                ("M3 Covering Material Photo", "Project",    "Covering material stage photo",           "admin,owner,office_staff,project_manager,structure_contractor",0,42),
                ("M4 Trellising Photo",        "Project",    "Trellising stage photo",                  "admin,owner,office_staff,project_manager,structure_contractor",0,43),
                ("M5 Drip Fitting Photo",      "Project",    "Drip irrigation fitting photo",           "admin,owner,office_staff,project_manager,drip_contractor",0,44),
                ("M6 Bed Preparation Photo",   "Project",    "Bed preparation stage photo",             "admin,owner,office_staff,project_manager,bed_contractor",0,45),
                ("M7 Plantation Photo",        "Project",    "Plantation stage photo",                  "admin,owner,office_staff,project_manager,plantation_contractor",0,46),
                ("Bank Sanction Letter",       "Bank",       "Bank loan sanction letter",               "admin,owner,office_staff,bank_officer",   1, 50),
                ("Bank Appraisal Report",      "Bank",       "Bank project appraisal report",           "admin,owner,office_staff,bank_officer",   1, 51),
                ("Bank Legal Search Report",   "Bank",       "Bank legal / title search",               "admin,owner,office_staff,bank_officer",   1, 52),
                ("KCC Letter",                 "Bank",       "Kisan Credit Card letter",                "admin,owner,office_staff,bank_officer",   0, 53),
                ("Bank Correspondence",        "Bank",       "Letters / queries to-from bank",          "admin,owner,office_staff,bank_officer",   0, 54),
                ("GOC Letter",                 "Agency",     "Government order / communication",        "admin,owner,office_staff,agency_officer", 0, 60),
                ("Inspection Report",          "Agency",     "Field inspection report",                 "admin,owner,office_staff,agency_officer", 0, 61),
                ("Subsidy Claim Form",         "Agency",     "Subsidy application / claim form",        "admin,owner,office_staff,agency_officer", 0, 62),
                ("Committee Approval Letter",  "Agency",     "Approval letter from committee",          "admin,owner,office_staff,agency_officer", 0, 63),
                ("Subsidy Release Order",      "Agency",     "Subsidy disbursement order",              "admin,owner,office_staff,agency_officer", 0, 64),
                ("Completion Certificate",     "Completion", "Project completion certificate",          "admin,owner,office_staff",                0, 70),
                ("Other",                      "Other",      "Any other supporting document",           None,                                      0, 99),
            ]
            for name, cat, desc, roles, req, srt in SEED:
                db.add(models.DocumentType(
                    name=name, category=cat, description=desc,
                    allowed_roles=roles, is_required=req, sort_order=srt,
                ))
            db.commit()
    except Exception:
        logger.exception("Seeding document_types failed")
        db.rollback()
    finally:
        db.close()


# 2. Initialize the FastAPI App.
#    Schema creation, migrations, and seeding run in the lifespan handler —
#    NOT at import time — so importing this module (tests, scripts, tooling)
#    has no side effects on the database.
@asynccontextmanager
async def _lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    _seed_document_types()
    os.makedirs("uploads", exist_ok=True)
    yield


app = FastAPI(
    title="ICON Greenhouse ERP",
    description="Enterprise API for Manufacturing, Agronomy, and Dealership Management",
    version="2.0.0",
    lifespan=_lifespan,
)

# 3. Security: Allow Mobile App & Web to communicate with this Backend
# Set ICON_ALLOWED_ORIGINS env var to a comma-separated list of allowed origins.
# In production this is REQUIRED — the server will refuse to start without it.
# In development it falls back to localhost origins only (never wildcard).
_IS_PRODUCTION_CORS = os.getenv("ICON_ENV", "").lower() == "production"
_raw_origins = os.getenv("ICON_ALLOWED_ORIGINS", "").strip()

if _raw_origins:
    ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
elif _IS_PRODUCTION_CORS:
    raise RuntimeError(
        "FATAL: ICON_ALLOWED_ORIGINS environment variable is not set. "
        "Refusing to start in production with a wildcard CORS policy. "
        "Set it to a comma-separated list of allowed origins, e.g. "
        "\"https://yourdomain.com,https://app.yourdomain.com\""
    )
else:
    import warnings as _w
    _w.warn(
        "SECURITY WARNING: ICON_ALLOWED_ORIGINS is not set. "
        "Defaulting to localhost origins for development. "
        "Set ICON_ALLOWED_ORIGINS in production.",
        stacklevel=1,
    )
    ALLOWED_ORIGINS = [
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA / other
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Plug in all Routers (API v1)
api_prefix = "/api/v1"

app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(farmers.router, prefix=api_prefix)
app.include_router(dealers.router, prefix=api_prefix)
app.include_router(banks.router, prefix=api_prefix)
app.include_router(projects.router, prefix=api_prefix)
app.include_router(structures.router, prefix=api_prefix)
app.include_router(contractors.router, prefix=api_prefix)
app.include_router(site_visits.router, prefix=api_prefix)
app.include_router(subsidy.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(uploads.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)

from routers import lookups
app.include_router(lookups.router, prefix=api_prefix)

from routers import devices
app.include_router(devices.router, prefix=api_prefix)

from routers import agronomist
app.include_router(agronomist.router, prefix=api_prefix)

from routers import iot
app.include_router(iot.router, prefix=api_prefix)

# 5. Root Endpoint (Health Check)
@app.get("/")
def read_root():
    return {
        "system": "ICON Greenhouse ERP Engine",
        "status": "LIVE",
        "version": "2.0.0",
        "docs_url": "/docs"
    }
