"""
One-time migration: convert all stage strings (old typos AND the new verbose
strings from seed_realistic.py) → clean slug-based stage names.

Run from the backend folder ONCE after seeding:
    cd backend
    python migrate_stages.py

Safe to re-run — already-migrated slug rows won't match any pattern below
so they are silently skipped.
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
import models

# ── Mapping: every known stage string → correct slug ─────────────────────────
#
# Organised by pipeline phase.  The LEFT side must exactly match what is stored
# in the database (including typos / mixed-case).  The RIGHT side is the slug
# from constants/stages.py and models.VALID_STAGES.
#
STAGE_MAP = {

    # ── FARMER ONBOARDING ─────────────────────────────────────────────────────
    "Famremer Onbaord  Peinding at Delear Level":   "farmer_onboarding",
    "Famremer Onbaord Peinding at Delear Level":    "farmer_onboarding",
    "Farmer Onboard Pending at Dealer Level":       "farmer_onboarding",

    # ── DOCUMENT COLLECTION / OFFICE DPR ─────────────────────────────────────
    "Peding At Office Level":                       "document_collection",
    "Pending At Office Level":                      "document_collection",
    "Sent to Office Staff For Preparing DPR":       "document_collection",

    # ── DPR READY ─────────────────────────────────────────────────────────────
    "DPR Ready":                                                                    "dpr_ready",
    "DPR PREPARED and Forwared to Bank Officer":                                    "dpr_ready",
    "Project-Site Completed-Design Completed and Sent to Project Manager for Rewardig Project to Contractos": "dpr_ready",

    # ── BANK PROCESSING ───────────────────────────────────────────────────────
    "Bank Processing":                              "bank_processing",
    "Bank Procesing":                               "bank_processing",
    "Bank Submission Pending":                      "bank_processing",
    "Bank Processing-Sanctioned Not Received":      "bank_processing",

    # ── SITE VISIT ────────────────────────────────────────────────────────────
    "Site Visit Pending":                           "site_visit",
    "Bank Sanction Received and Sent To Office Staff for GOC Application": "site_visit",
    "Project-Site Visit Pending":                   "site_visit",
    "Project-Site Visit Completed":                 "site_visit",

    # ── DESIGN BOQ ────────────────────────────────────────────────────────────
    "Design BOQ Pending":                           "design_boq",
    "Project-Site Completed-Design Pending":        "design_boq",

    # ── GOC REGISTRATION ─────────────────────────────────────────────────────
    "GOC Application Pending":                          "goc_registration",
    "GOC Application Peindg":                           "goc_registration",
    "GOC- Approved But Not Issued":                     "goc_registration",
    "GOC Approved But Not Issued":                      "goc_registration",
    "GOC Application Done and Sent to Agency Officer":  "goc_registration",
    "GOC Application Done-Approval Pending":            "goc_registration",
    "GOC Application Approved":                         "goc_registration",
    "GOC- Approved Iussed and Sent to Project Manager": "goc_registration",

    # ── M1 FOUNDATION ────────────────────────────────────────────────────────
    "Project-Assignement To Conractors Pending":                              "m1_foundation",
    "Project-Assignement To Conractors Done and Sent to Contractors":         "m1_foundation",

    # ── M2 STRUCTURE ERECTION ────────────────────────────────────────────────
    "Erection Start_peindig":                       "m2_structure_erection",
    "Erection Start Pending":                       "m2_structure_erection",
    "Erection Start_pending":                       "m2_structure_erection",
    "Erection Started and IN Progress":             "m2_structure_erection",

    # ── M4 TRELLISING ────────────────────────────────────────────────────────
    "Work Started and IN Progress":                 "m4_trellising",
    "Work In Progress":                             "m4_trellising",
    "Ecrection Started and Completed and Submitted to Project Manager": "m4_trellising",

    # ── M5 DRIP FITTING (post-inspection) ────────────────────────────────────
    "Porject-Inspection Pending":                   "m5_drip_fitting",
    "Porject-Inspection Done":                      "m5_drip_fitting",
    "Porject-Inspection Report Pending":            "m5_drip_fitting",
    "Porject-Inspection Report Submiited and Sent of Agencey Officer": "m5_drip_fitting",

    # ── SUBSIDY CLAIM ─────────────────────────────────────────────────────────
    "Subsidy Application Penidng":                      "subsidy_claim",
    "Subsidy Application Pending":                      "subsidy_claim",
    "Subsidy Application Done and Sent Agency Officer": "subsidy_claim",

    # ── AGENCY INSPECTION ─────────────────────────────────────────────────────
    "Subsidy_ Visit Penindg":                       "agency_inspection",
    "Subsidy Visit Pending":                        "agency_inspection",
    "Subsdidy Visitr Report Not Sumtted":           "agency_inspection",
    "Subsidy Visit Report Not Submitted":           "agency_inspection",
    "Subsdidy Visit Done":                          "agency_inspection",
    "Subsdidy Visit Report Not Submitted":          "agency_inspection",
    "Subsdidy Visit Report Submitted":              "agency_inspection",

    # ── COMMITTEE MEETING ─────────────────────────────────────────────────────
    "Subsid Meeting Peding":                        "committee_meeting",
    "Subsidy Meeting Pending":                      "committee_meeting",
    "Subsiy Not Released":                          "committee_meeting",
    "Subsidy Not Released":                         "committee_meeting",
    "Subsid Meeting Done and Case Approved":        "committee_meeting",

    # ── TERMINAL: SUBSIDY RELEASED ────────────────────────────────────────────
    "Subsidy Released":                             "subsidy_released",

    # ── TERMINAL: COMPLETED ───────────────────────────────────────────────────
    "Completed":                                    "completed",
}


def run():
    db = SessionLocal()
    total_updated = 0
    try:
        for old, new in STAGE_MAP.items():
            projects = db.query(models.Project).filter(
                models.Project.project_stage == old
            ).all()
            for p in projects:
                p.project_stage = new
            if projects:
                print(f"  {len(projects):>4} rows: '{old[:65]}' → '{new}'")
                total_updated += len(projects)

        db.commit()
        print(f"\nMigration complete — {total_updated} project rows updated.")

        # Show new stage distribution
        from sqlalchemy import func
        rows = (
            db.query(models.Project.project_stage, func.count(models.Project.id))
            .group_by(models.Project.project_stage)
            .order_by(func.count(models.Project.id).desc())
            .all()
        )
        print("\nNew stage distribution (slugs):")
        for stage, cnt in rows:
            print(f"  {stage:<35} {cnt}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
