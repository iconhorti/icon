"""Generate ICON Code Analysis summary as a Word document."""
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from datetime import date

OUTPUT = r"E:\Google Drive\01-Pankaj\199 ICON_Accounts\95 Software Design\ICON\ICON_Code_Analysis_Summary.docx"


def set_cell_shading(cell, hex_color: str):
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), hex_color)
    shading.set(qn("w:val"), "clear")
    cell._tc.get_or_add_tcPr().append(shading)


def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    return h


def add_table(doc, headers, rows, header_fill="2E5090"):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = h
        set_cell_shading(hdr[i], header_fill)
        for p in hdr[i].paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
                r.font.size = Pt(10)
    for ri, row in enumerate(rows):
        cells = table.rows[ri + 1].cells
        for ci, val in enumerate(row):
            cells[ci].text = str(val)
            for p in cells[ci].paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()
    return table


def build():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    # Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("ICON Greenhouse ERP")
    run.bold = True
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(46, 80, 144)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = sub.add_run("Comprehensive Code Analysis Summary")
    r2.font.size = Pt(14)
    r2.italic = True

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r3 = meta.add_run(f"Prepared: {date.today().strftime('%d %B %Y')}")
    r3.font.size = Pt(10)
    r3.font.color.rgb = RGBColor(100, 100, 100)

    doc.add_paragraph()

    # Executive Summary
    add_heading(doc, "1. Executive Summary", 1)
    doc.add_paragraph(
        "ICON is a full-stack agricultural greenhouse and subsidy ERP system tracking farmers, "
        "dealers, contractors, bank processing, construction milestones (M1–M7), document compliance, "
        "and government subsidy workflows across a 20-stage project lifecycle."
    )
    doc.add_paragraph(
        "The platform comprises three tiers: a FastAPI backend (Python/SQLAlchemy), a React 19 "
        "TypeScript web application for office and admin users, and an Expo/React Native mobile app "
        "for field staff. The domain model and role-based access control (13 roles) are well designed. "
        "Recent development has closed several web–backend gaps (audit trail, optimistic concurrency, "
        "SSE notifications). The primary systemic risk is mobile–backend API contract drift, which "
        "blocks field capture workflows in production."
    )

    add_table(doc,
        ["Tier", "Technology", "Maturity"],
        [
            ["Backend", "FastAPI 2.0, SQLAlchemy 2.0, JWT, SQLite/Postgres", "Solid core; workflow rules defined but not enforced"],
            ["Web", "React 19, TypeScript, Vite, TanStack Query, AG Grid", "Mid-migration TS; list pages strong, detail pages imperative"],
            ["Mobile", "Expo 54, RTK Query, SQLite offline queue", "Good offline design; API contracts diverge from backend"],
        ],
    )

    # Architecture
    add_heading(doc, "2. System Architecture", 1)
    doc.add_paragraph(
        "Clients communicate with a single FastAPI application at /api/v1. The backend uses JWT "
        "authentication (HS256, 24-hour expiry), role-based guards, and project-scoped access checks. "
        "Data is stored in SQLite (development) or PostgreSQL (production via DATABASE_URL). "
        "Uploaded documents are stored in uploads/project_{id}/."
    )

    add_heading(doc, "2.1 User Roles (13)", 2)
    add_table(doc,
        ["Role", "Web Access", "Mobile Access"],
        [
            ["admin, owner", "Full ERP", "Admin tabs"],
            ["office_staff", "Projects, DPR pipeline, approvals", "Office tabs"],
            ["project_manager", "Project management", "Erection tabs (shared with contractors)"],
            ["dealer", "Farmers, project create", "Dealer tabs"],
            ["farmer", "Dashboard only (intended)", "Farmer tabs"],
            ["bank_officer", "Reports, documents", "Loan tabs"],
            ["agency_officer", "Reports, documents", "Access Denied screen"],
            ["agronomist", "Reports, documents", "Agronomist tabs"],
            ["4 contractor types", "Filtered project view", "Erection tabs"],
        ],
    )

    # Domain
    add_heading(doc, "3. Domain & Workflow", 1)
    doc.add_paragraph(
        "Projects progress through 20 stages defined in backend/constants/stages.py:"
    )
    stages = doc.add_paragraph(style="List Bullet")
    stages.add_run(
        "draft → farmer_onboarding → document_collection → site_visit → design_boq → dpr_ready → "
        "bank_processing → goc_registration → m1_foundation … m7_plantation → subsidy_claim → "
        "agency_inspection → committee_meeting → subsidy_released → completed"
    )
    doc.add_paragraph(
        "Required documents per stage are defined in STAGE_REQUIRED_DOCS and exposed via "
        "GET /uploads/types?stage=&required=true. The web RequiredDocsChecklist consumes this data, "
        "but stage advancement does not currently enforce document presence."
    )

    add_heading(doc, "3.1 Core Entities", 2)
    add_table(doc,
        ["Entity", "Description"],
        [
            ["Person", "Universal user table with role-specific profiles (farmer, dealer, employee, contractor)"],
            ["Project", "Central entity with items, contractors, milestones, documents, financials, version token"],
            ["DocumentType", "Master list of KYC, land, project, bank, and agency document types"],
            ["ProjectActivity", "Audit trail for stage changes and project edits"],
            ["SiteVisit / DailySiteReport", "Field operations and erection reporting"],
            ["Notification / DeviceToken", "In-app notifications and push token registration"],
        ],
    )

    # Backend
    add_heading(doc, "4. Backend Analysis", 1)

    add_heading(doc, "4.1 Strengths", 2)
    for item in [
        "Production guards: ICON_SECRET_KEY and ICON_ALLOWED_ORIGINS required in production",
        "Upload security: extension whitelist + magic-byte MIME sniffing (strongest security surface)",
        "Optimistic concurrency: version column on Project/Milestone; HTTP 409 on stale updates",
        "Audit foundation: ProjectActivity table with automatic logging on stage changes",
        "Stage vocabulary centralized in constants/stages.py feeding dashboard KPIs",
        "Password-change gate via JWT must_change_pwd flag",
        "16 modular routers with documented RBAC in code comments",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    add_heading(doc, "4.2 Critical Gaps", 2)
    add_table(doc,
        ["Issue", "Severity", "Detail"],
        [
            ["Unauthenticated GET /subsidy/calculate/{id}", "Critical", "Financial data leak — no JWT or access check"],
            ["Stage advancement without validation", "High", "No enforcement of stage order or required documents"],
            ["Reports/site-visits missing project scoping", "High", "Any authenticated user can read some project data"],
            ["Mobile API contract mismatch", "High", "Field capture payloads rejected by backend (422/404)"],
            ["Default password icon123", "High", "Known credential for all new users"],
            ["No Alembic migrations", "Medium", "Hand-rolled ALTER TABLE; silent failure on errors"],
            ["Push register only — no sender", "Medium", "DeviceToken stored but never used to send notifications"],
            ["JWT in SSE query string", "Medium", "Token exposure in logs/browser history"],
            ["Contractor skills endpoint bug", "Medium", "/contractor-skills/{id} returns Query object not .all()"],
        ],
    )

    add_heading(doc, "4.3 Backend Routers (16)", 2)
    add_table(doc,
        ["Router", "Key Endpoints", "Auth"],
        [
            ["auth", "login, change-password, me", "Public login; JWT elsewhere"],
            ["projects", "CRUD, stage, activity, items, co-applicants", "JWT + assert_project_access"],
            ["uploads", "upload, verify, types, file download", "JWT + role×doctype matrix"],
            ["notifications", "my, unread-count, stream (SSE), read", "JWT; SSE via ?token="],
            ["devices", "register push token", "JWT"],
            ["subsidy", "agencies, rates, calculate", "calculate: NO AUTH"],
            ["lookups", "geo hierarchy, area types, agencies", "Many GETs unauthenticated"],
            ["farmers, dealers, users, contractors", "CRUD + role-specific views", "JWT + role matrix"],
            ["dashboard", "role-kpis, stats", "JWT; role from token"],
            ["site_visits, reports", "field ops, daily reports", "JWT; weak project scoping"],
        ],
    )

    # Web
    add_heading(doc, "5. Web Frontend Analysis", 1)

    add_heading(doc, "5.1 Strengths", 2)
    for item in [
        "Centralized roles in lib/roles.ts with RequireRole compile-time guards",
        "TanStack Query on all list/management pages with centralized query keys (qk)",
        "Graceful degradation for activity timeline, SSE stream, required-docs (404/501 safe)",
        "Lazy-loaded routes with error boundary for chunk load failures",
        "AG Grid with CSV export on all management tables",
        "i18n scaffold (English/Hindi) with LanguageSwitcher",
        "Forward-compatible concurrency and upload validation patterns",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    add_heading(doc, "5.2 Critical Bug — Farmer Navigation", 2)
    doc.add_paragraph(
        "The Sidebar and FarmerDashboard link farmers to /projects and /projects/:id, but "
        "ROLE_SETS.PROJECT_VIEW excludes the farmer role. The route guard redirects farmers to /. "
        "Farmers cannot reach their project detail page despite dashboard links pointing there."
    )

    add_heading(doc, "5.3 Web Pages (18)", 2)
    add_table(doc,
        ["Category", "Pages", "Data Pattern"],
        [
            ["Query-migrated", "Dealers, Users, Farmers, Contractors, Staff, ProjectList, Reports, Notifications, Masters", "TanStack Query hooks"],
            ["Still imperative", "ProjectDetail, ProjectForm, Documents, Dashboard, FarmerForm, Login, Settings", "Manual useEffect + API"],
            ["Dead/orphan", "SubsidyCalculator", "No route; missing API export"],
        ],
    )

    add_heading(doc, "5.4 Web Technical Debt", 2)
    for item in [
        "37 orphaned .jsx files from JS→TS migration (not imported, should be deleted)",
        "Dual role systems: roles.ts ROLE_SETS vs Sidebar NAV_BY_ROLE can drift",
        "STAGE_LABELS duplicated in 4+ files instead of shared import",
        "No useProject(id) hook — ProjectDetail/Form bypass Query cache",
        "getMe() defined but never called — no token validation on app startup",
        "Required docs checklist informational only — does not block stage advance",
        "Settings notification toggles are UI-only, not persisted",
        "Demo credentials (icon123) visible in Login UI",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    # Mobile
    add_heading(doc, "6. Mobile App Analysis", 1)

    add_heading(doc, "6.1 Offline-First Design (Well Engineered)", 2)
    doc.add_paragraph(
        "Four field capture screens (SiteVisit, DPR, HealthAssessment, VisitReport) queue writes "
        "to SQLite when offline. SyncQueueRunner flushes on app foreground and network regained. "
        "Each queued item carries a UUID sent as Idempotency-Key header. Retry policy: 5xx/408/429 "
        "retry up to 5 attempts; 4xx dead-lettered immediately. Queue cleared on logout (security fix)."
    )

    add_heading(doc, "6.2 Critical — API Parity Matrix", 2)
    add_table(doc,
        ["Mobile Call", "Backend Reality", "Result"],
        [
            ["GET /projects → {items, total}", "Returns array", "Empty lists"],
            ["GET /farmers → {items, total}", "Returns array", "Empty lists"],
            ["GET /documents", "GET /uploads/all", "404"],
            ["PATCH /documents/:id/review", "PATCH /uploads/:id/verify", "404"],
            ["GET /notifications", "GET /notifications/my", "404"],
            ["PATCH /notifications/:id/read", "PUT /notifications/:id/read", "404"],
            ["POST /farmers", "POST /farmers/register", "404"],
            ["PATCH /projects/:id/fields", "PATCH /projects/:id + {updates}", "404"],
            ["GET/PATCH milestones", "Not implemented", "404"],
            ["POST /projects/dpr", "POST /reports/daily (different schema)", "404"],
            ["GET /agronomist/farms", "Not implemented", "404"],
            ["POST /devices/register {push_token}", "Expects {token}", "Silent failure"],
            ["POST /site-visits (mobile shape)", "Different field names, needs project_id", "422 dead-letter"],
        ],
    )

    add_heading(doc, "6.3 Mobile UX Gaps", 2)
    for item in [
        "pendingCount computed but never shown — users don't know writes are queued",
        "No Profile/logout tab on Erection and Agronomist role tabs",
        "VisitReportScreen built but not registered in any navigator",
        "Site visit and DPR screens lack project picker",
        "Health assessment uses farm_id hardcoded as 0 in queue endpoint URL",
        "Biometric unlock implemented but never invoked on app start",
        "Default password icon123 on farmer registration (AddFarmerScreen)",
        "useCachedQuery only on 2 dashboards despite 5 cache keys defined",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    # Integration
    add_heading(doc, "7. Cross-Tier Integration Status", 1)

    add_heading(doc, "7.1 Recently Closed (Web ↔ Backend)", 2)
    add_table(doc,
        ["Feature", "Backend", "Web", "Mobile"],
        [
            ["Audit trail", "GET /projects/{id}/activity", "ActivityTimeline", "—"],
            ["Optimistic concurrency", "Project.version + 409", "ProjectForm, StageActionPanel", "Update mutations"],
            ["Required docs metadata", "GET /uploads/types?required=true", "RequiredDocsChecklist", "—"],
            ["SSE notifications", "GET /notifications/stream", "useNotificationsStream", "—"],
            ["Device registration", "POST /devices/register", "—", "Field name mismatch"],
        ],
    )

    add_heading(doc, "7.2 Still Open", 2)
    for item in [
        "Align mobile RTK paths, HTTP methods, and response transforms with backend",
        "Add mobile-shaped field endpoints OR adapt mobile payloads to backend schemas",
        "Accept base64 photos in create endpoints for field capture",
        "Add project/farm pickers on all mobile capture screens",
        "Implement agronomist router or remove agronomist mobile features",
        "Fix push token field name (push_token → token)",
        "Honor Idempotency-Key on backend create endpoints",
        "Enforce stage order and required documents on stage advancement",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    # Security
    add_heading(doc, "8. Security Assessment", 1)
    add_table(doc,
        ["#", "Finding", "Severity", "Layer"],
        [
            ["1", "Unauthenticated subsidy calculation endpoint", "Critical", "Backend"],
            ["2", "Default password icon123 for all new users", "High", "Backend + Mobile"],
            ["3", "Mobile API mismatch — field data never persists", "High", "Mobile"],
            ["4", "PII (Aadhaar/PAN) in API responses without redaction", "High", "Backend"],
            ["5", "JWT in SSE query string", "Medium", "Backend + Web"],
            ["6", "Device token upsert — token hijack risk", "Medium", "Backend"],
            ["7", "Reports/site-visits missing project access checks", "Medium", "Backend"],
            ["8", "No rate limiting on login/uploads", "Medium", "Backend"],
            ["9", "No token refresh/revocation", "Medium", "All"],
            ["10", "Demo credentials visible in web Login UI", "Medium", "Web"],
        ],
    )

    # Maturity
    add_heading(doc, "9. Maturity Scorecard", 1)
    add_table(doc,
        ["Dimension", "Backend", "Web", "Mobile"],
        [
            ["Architecture", "★★★★☆", "★★★★☆", "★★★★☆"],
            ["Domain modeling", "★★★★☆", "★★★☆☆", "★★★☆☆"],
            ["RBAC", "★★★☆☆", "★★★★☆", "★★★★☆"],
            ["API contracts", "★★★☆☆", "★★★★☆", "★★☆☆☆"],
            ["Offline/resilience", "—", "★★☆☆☆", "★★★★☆"],
            ["Security", "★★★☆☆", "★★★☆☆", "★★★☆☆"],
            ["Test coverage", "★☆☆☆☆", "★☆☆☆☆", "★☆☆☆☆"],
            ["Documentation", "★★★★☆", "★★★★☆", "★★★★☆"],
            ["Production readiness", "★★★☆☆", "★★★☆☆", "★★☆☆☆"],
        ],
    )

    # Roadmap
    add_heading(doc, "10. Recommended Roadmap", 1)

    add_heading(doc, "Phase 0 — Unblock Production (1–2 weeks)", 2)
    for item in [
        "Mobile API reconciliation — fix RTK paths, methods, response transforms",
        "Fix push token field: push_token → token in mobile",
        "Add JWT + assert_project_access to /subsidy/calculate/{id}",
        "Fix farmer web routing — add farmer to PROJECT_VIEW or change nav links",
        "Fix contractor skills bug — add .all() to /contractor-skills/{id}",
    ]:
        doc.add_paragraph(item, style="List Number")

    add_heading(doc, "Phase 1 — Workflow Integrity (2–3 weeks)", 2)
    for item in [
        "Enforce VALID_STAGES and sequential order on stage PUT",
        "Block stage advance when STAGE_REQUIRED_DOCS not satisfied",
        "Add assert_project_access to reports and site-visit create",
        "Add project/farm pickers on all mobile capture screens",
        "Surface pendingCount in mobile offline banner",
    ]:
        doc.add_paragraph(item, style="List Number")

    add_heading(doc, "Phase 2 — Hardening (3–4 weeks)", 2)
    for item in [
        "Alembic migrations; gitignore icon_app.db",
        "Migrate web ProjectDetail/Form to TanStack Query (useProject hook)",
        "Remove 37 dead .jsx files",
        "Backend idempotency for create endpoints",
        "Password policy — no default in production; force change",
        "Basic test suite: auth, stage transitions, 409, upload validation",
    ]:
        doc.add_paragraph(item, style="List Number")

    add_heading(doc, "Phase 3 — Scale & Polish", 2)
    for item in [
        "Redis pub/sub for SSE; push notification sender implementation",
        "Complete i18n (web form labels; mobile Hindi)",
        "PII field-level redaction in API responses",
        "Extend mobile useCachedQuery to project/document lists",
    ]:
        doc.add_paragraph(item, style="List Number")

    # Bottom line
    add_heading(doc, "11. Conclusion", 1)
    doc.add_paragraph(
        "ICON is a well-architected ERP with a rich domain model, thoughtful RBAC, and recent "
        "investment in web modernization and backend parity features. The web tier is the most "
        "production-ready client. The mobile tier has excellent offline engineering but is "
        "functionally blocked by API contract drift — until reconciled, field capture data will "
        "queue locally and then dead-letter on sync."
    )
    doc.add_paragraph(
        "The highest-leverage work is a focused mobile–backend reconciliation sprint, fixing the "
        "farmer web routing bug, and closing backend authorization gaps (subsidy, reports, site visits). "
        "After that, enforcing workflow rules (stage order, required documents) will turn the defined "
        "business logic into actual system behavior."
    )

    # Key files
    add_heading(doc, "Appendix: Key File Index", 1)
    add_table(doc,
        ["Area", "Path"],
        [
            ["Backend bootstrap", "backend/main.py, database.py, auth_dep.py"],
            ["Domain model", "backend/models.py, schemas.py, constants/stages.py"],
            ["Workflow", "backend/routers/projects.py, activity.py"],
            ["Security surface", "backend/routers/uploads.py, auth.py"],
            ["Status docs", "backend/BACKEND_ENDPOINTS.md, web/IMPROVEMENTS.md, mobile/MOBILE_IMPROVEMENTS.md"],
            ["Web routing", "web/src/App.tsx, lib/roles.ts, components/Sidebar.tsx"],
            ["Web data layer", "web/src/hooks/*, lib/queryClient.ts, api/client.ts"],
            ["Mobile navigation", "mobile/src/navigation/TabNavigator.tsx, tabs/*.tsx"],
            ["Mobile offline", "mobile/src/db/syncQueue.ts, hooks/useSyncQueue.ts"],
            ["Mobile API", "mobile/src/store/api/*.ts, constants/config.ts"],
        ],
    )

    # Footer
    doc.add_paragraph()
    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = footer.add_run("ICON Greenhouse ERP — Confidential Code Analysis")
    fr.font.size = Pt(9)
    fr.font.color.rgb = RGBColor(150, 150, 150)
    fr.italic = True

    doc.save(OUTPUT)
    print(f"Saved: {OUTPUT}")


if __name__ == "__main__":
    build()
