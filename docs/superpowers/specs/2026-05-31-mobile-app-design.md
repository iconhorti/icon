# ICON ERP Mobile App — Design Spec
**Date:** 2026-05-31  
**Status:** Approved  
**Source SRS:** `E:\Google Drive\01-Pankaj\999 Project\ICON\ICON_Mobile_App_SRS_Module21_v2.docx`  
**Wireframe Reference:** `E:\Google Drive\01-Pankaj\999 Project\ICON\ICON_Mobile_Wireframe.html`

---

## 1. Overview

A React Native companion app extending the ICON ERP web system to field staff and farmers. The app is **not** a full ERP replacement — each role gets a focused set of screens for their specific field tasks, with data synced to the central FastAPI backend.

**Platform:** Android-first (API 26+), iOS in Phase 3  
**Distribution:** Internal APK via MDM (Phase 1–2), Google Play Store (Phase 3)

---

## 2. Roles — 9 Total

| # | Role | Phase | Primary Use |
|---|------|-------|-------------|
| 1 | Office Work (Document Checker) | 1 | KYC review, document inbox, approval queue |
| 2 | Loan Officer | 1 | Farmer pipeline, loan applications, bank follow-up |
| 3 | Admin (Owner/MD) | 1 | Company-wide KPIs, user management, alerts |
| 4 | **Dealer** | **1** | Farmer portfolio, commission pipeline, add farmer |
| 5 | **Farmer** | **1** | My project status, timeline, subsidy breakdown |
| 6 | Erection Manager | 2 | Site visits, BOQ, 7-milestone tracker, DPR |
| 7 | Agronomist | 2 | Farm visits, IoT live monitor, health assessment |
| 8 | Contractor | 3 | Milestone progress, DPR, photo upload, payment status |
| 9 | Subsidy Officer | 3 | GOC tracker, JIT inspection, query management |

> Roles 1–3 and 6–9 are fully specified in the SRS (Module 21 v2).  
> Roles 4 (Dealer) and 5 (Farmer) are added here from the web app analysis.

---

## 3. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 51 (managed workflow) |
| Language | TypeScript |
| Navigation | React Navigation v6 — Stack + Tab per role |
| State / Cache | Redux Toolkit + RTK Query |
| Local DB | SQLite via `expo-sqlite` (offline drafts, cached lists) |
| Offline Sync | Background Fetch + Reachability — write-ahead queue |
| Camera | `expo-camera` + `expo-image-picker` |
| GPS | `expo-location` |
| Auth | JWT + `expo-secure-store` + biometric unlock |
| Push | Firebase Cloud Messaging (FCM) |
| Photo Upload | AWS S3 pre-signed URLs (direct device → S3) |
| IoT Stream | WebSocket (Agronomist IoT screen only) |
| PDF Export | `react-native-pdf-lib` (BOQ, visit reports, subsidy docs) |
| WhatsApp | `wa.me` deep-link with pre-filled message |
| OTA Updates | Expo EAS (no Play Store submission for JS-only updates) |
| Analytics | Firebase Crashlytics + Firebase Analytics |

---

## 4. Architecture

### 4.1 Navigation Shell

Each role gets a **bottom tab bar** with 4–5 tabs. Tab layout is determined by `user.role` from the JWT on login. Unknown roles see an "Access Denied" screen.

```
mobile/
  app/
    (auth)/
      login.tsx          ← OTP login screen
    (tabs)/
      _layout.tsx        ← role-based tab config
      index.tsx          ← home (role-specific)
      list.tsx           ← cases / farmers / sites / reports
      notifications.tsx
      profile.tsx
    project/[id].tsx     ← shared project detail (read-only)
    farmer/[id].tsx      ← shared farmer detail
  components/
    shared/              ← KpiCard, StageChip, ProjectRow, OfflineBanner
    office/              ← DocInbox, KycReview, ApprovalQueue
    loan/                ← FarmerPipeline, LoanApplication, Disbursement
    admin/               ← AdminKPIs, UserManagement, SystemConfig
    dealer/              ← DealerFunnel, FarmerPortfolio, AddFarmer
    farmer/              ← ProjectStatus, StageTimeline, SubsidyBreakdown
    erection/            ← SiteVisitForm, BOQCalculator, MilestoneTracker
    agronomist/          ← FarmList, IotMonitor, HealthAssessment, VisitReport
  api/
    client.ts            ← axios instance with JWT interceptor
    cache.ts             ← SQLite read-cache wrapper (TTL-based)
    sync.ts              ← offline write-ahead queue + background sync
  context/
    AuthContext.tsx       ← JWT storage, role, biometric unlock state
  store/
    index.ts             ← Redux store
    api/                 ← RTK Query API slices per domain
```

### 4.2 Authentication

1. User enters mobile number → app calls `/api/v1/auth/send-otp`
2. Enters OTP → `/api/v1/auth/verify-otp` → returns JWT
3. JWT stored in `expo-secure-store` (device keychain)
4. Subsequent launches: biometric unlock reads JWT from keychain
5. Auto-lock after 30 min idle; full OTP re-auth after 30-day token expiry

> **Backend work required:** Two new endpoints (`/auth/send-otp`, `/auth/verify-otp`) with SMS provider (MSG91 or Twilio).

### 4.3 Offline Strategy

| Data | Cache TTL | Offline write? |
|------|-----------|---------------|
| Farmer / Project lists | 1 hour | No |
| Dashboard stats | 15 min | No |
| IoT readings | 5 min | No |
| Site visit form | Draft until submit | **Yes — SQLite** |
| DPR / Labor log | Draft until submit | **Yes — SQLite** |
| Health assessment | Draft until submit | **Yes — SQLite** |
| Visit report | Draft until submit | **Yes — SQLite** |
| Loan update | — | No (online only) |

Offline write flow:
1. Form submission writes to SQLite immediately (UI confirms)
2. Background sync polls every 60 s for connectivity
3. On reconnect, queued items replayed against API in order
4. Conflict resolution: server-side timestamp wins; user notified

### 4.4 New Backend Endpoints Required

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/auth/send-otp` | Send OTP SMS to mobile number |
| `POST /api/v1/auth/verify-otp` | Verify OTP, return JWT |
| `POST /api/v1/devices/register` | Register FCM push token for device |
| `POST /api/v1/uploads/presign` | Return S3 pre-signed URL for photo upload |
| `WS /api/v1/iot/live/{farm_id}` | WebSocket IoT sensor stream (Agronomist) |

All existing REST endpoints are reused as-is with role-scoped responses.

---

## 5. Role Screens

### Role 4 — Dealer (NEW)

**Tabs:** Home · My Farmers · Add Farmer · Notifications · Profile

| Screen | Key Features |
|--------|-------------|
| **Home** | Funnel KPIs: Leads / Active / Completed / Commission earned+pending; district bar chart; dealer leaderboard position |
| **My Farmers** | Farmer list with stage progress bar, search/filter by stage/district; tap → farmer project detail; quick WhatsApp call |
| **Add Farmer** | Quick registration: name, phone, village, land area, crop type → creates farmer record + draft project in ERP |
| **Notifications** | Stage advance alerts for referred farmers, commission release notifications |

**Mobile-specific requirements:**

| Req ID | Requirement | Priority |
|--------|------------|---------|
| DLR-MOB-01 | Add Farmer form shall save as offline draft; submits on reconnect | High |
| DLR-MOB-02 | Commission earned/pending displayed prominently on home screen; tapping shows per-project breakdown | High |
| DLR-MOB-03 | One-tap WhatsApp to farmer from any farmer list item | Medium |
| DLR-MOB-04 | Push notification when any referred farmer's project advances a stage | Medium |
| DLR-MOB-05 | Dealer leaderboard position (vs other dealers) shown on home screen | Low |

### Role 5 — Farmer (NEW)

**Tabs:** My Project · Timeline · Financials · Notifications · Profile

| Screen | Key Features |
|--------|-------------|
| **My Project** | Current stage + badge (In Progress / Under Construction / Subsidy Processing / Completed); % progress; next stage; days running; project code |
| **Timeline** | 20-stage visual tracker — done (green) / current (highlighted) / upcoming (grey); stage group labels (Onboarding / Planning / Financial / Construction / Subsidy) |
| **Financials** | Total project cost, Govt. subsidy (50%), farmer's own investment; loan amount + account number (if sanctioned); subsidy released amount; documents required at current stage |
| **Notifications** | Stage advance updates, agronomist visit reports received, document requests from office staff |

**Mobile-specific requirements:**

| Req ID | Requirement | Priority |
|--------|------------|---------|
| FMR-MOB-01 | Farmer sees ONLY their own project — no cross-farmer data accessible | Critical |
| FMR-MOB-02 | App displays a "No project yet — contact your dealer" screen if no project linked | High |
| FMR-MOB-03 | Subsidy amount shown prominently; disclaimer "released after agency inspection" | High |
| FMR-MOB-04 | Push notification on every stage advance | High |
| FMR-MOB-05 | Agronomist visit report PDF accessible in Notifications as downloadable attachment | Medium |
| FMR-MOB-06 | App UI available in Gujarati and Hindi (farmer's preferred language from profile) | High |
| FMR-MOB-07 | Farmer cannot edit any project data — fully read-only | Critical |

---

## 6. Roles 1–3, 6–9 — Full Spec in SRS

Refer to **`ICON_Mobile_App_SRS_Module21_v2.docx`** for the complete screen-by-screen feature tables and mobile-specific requirements for:

- **Role 1 — Office Work:** Sections 3.1.1–3.1.7 (DOC-MOB-01 to DOC-MOB-07)
- **Role 2 — Erection Manager:** Sections 3.2.1–3.2.6 (ERC-MOB-01 to ERC-MOB-08)
- **Role 3 — Loan Officer:** Sections 3.3.1–3.3.6 (LN-MOB-01 to LN-MOB-06)
- **Role 6 — Agronomist:** Sections 3.4.1–3.4.6 (AGR-MOB-01 to AGR-MOB-07)
- **Role 7 — Admin:** Sections 3.5.1–3.5.6 (ADM-MOB-01 to ADM-MOB-06)
- **Role 8 — Contractor:** Sections 3.6.1–3.6.6 (CON-MOB-01 to CON-MOB-07)
- **Role 9 — Subsidy Officer:** Sections 3.7.1–3.7.7 (SUB-MOB-01 to SUB-MOB-07)

---

## 7. Cross-Role Requirements (from SRS §4)

- **Auth:** OTP login, biometric unlock, 30-min auto-lock, single-device session
- **Push:** FCM, deep-link on tap, priority channel bypasses DND for critical alerts
- **Offline/Sync:** SQLite write-ahead queue, server-timestamp conflict resolution, last-synced indicator on all list screens
- **Language:** English + Gujarati (Phase 1); Hindi (Phase 2). Farmer-facing WhatsApp messages in farmer's preferred language.
- **Performance:** Cold start < 3 s, navigation < 300 ms, API list loads < 2 s
- **Security:** HTTPS + certificate pinning, AES-256 at rest, biometric re-auth for approvals > ₹50,000, FLAG_SECURE on sensitive screens

---

## 8. Development Roadmap

### Phase 1 — Months 1–7 (Sprints M-SP-01 to M-SP-07 + 2 new)

| Sprint | Duration | Deliverable |
|--------|----------|------------|
| M-SP-01 | 2 weeks | Scaffold: Expo setup, navigation shell, OTP auth, JWT, biometric, SQLite offline layer, FCM setup |
| M-SP-02 | 2 weeks | Office Work: Document Inbox, KYC Review, camera + GPS upload |
| M-SP-03 | 2 weeks | Office Work: Approval Queue + biometric re-auth, Notifications, name-mismatch detection |
| M-SP-04 | 2 weeks | Loan Officer: Farmer Pipeline, Loan Application checklist, WhatsApp deep-link |
| M-SP-05 | 2 weeks | Loan Officer: Disbursement Tracker, Bank Follow-up log, tranche push notification |
| M-SP-06 | 2 weeks | Admin: Dashboard, Project Overview, User Management |
| M-SP-07 | 2 weeks | Admin: System Config, All Alerts, PDF export, deep-link routing |
| **M-SP-08** | **2 weeks** | **Dealer: Home funnel, My Farmers list, Add Farmer form (offline draft)** |
| **M-SP-09** | **2 weeks** | **Farmer: My Project home, Stage Timeline, Financials + language support** |

### Phase 2 — Months 8–13 (Sprints M-SP-10 to M-SP-15)

| Sprint | Duration | Deliverable |
|--------|----------|------------|
| M-SP-10 | 2 weeks | Erection Manager: Site Visit 5-step offline form, GPS + camera, draft management |
| M-SP-11 | 2 weeks | Erection Manager: BOQ calculator + PDF export, 7-milestone tracker |
| M-SP-12 | 2 weeks | Erection Manager: Labor Log/DPR, mandatory photos, WhatsApp DPR summary |
| M-SP-13 | 2 weeks | Agronomist: Farm List, Health Assessment offline form, pest/disease alert push |
| M-SP-14 | 2 weeks | Agronomist: IoT Live Monitor (WebSocket), 24h trend chart, Visit Report + farmer OTP |
| M-SP-15 | 2 weeks | QA, UAT with field staff, bug fixes, Play Store internal testing release |

### Phase 3 — Months 14–18

iOS release, Contractor app, Subsidy Officer app, AR site overlay (future).

**Total Phase 1+2: 15 sprints × 2 weeks = 30 weeks**  
**Team: 2 React Native developers + 1 QA**

---

## 9. Screen Count Summary

| Role | Screens | Phase |
|------|---------|-------|
| Office Work | 5 | 1 |
| Loan Officer | 5 | 1 |
| Admin | 5 | 1 |
| Dealer | 4 | 1 |
| Farmer | 3 | 1 |
| Erection Manager | 5 | 2 |
| Agronomist | 5 | 2 |
| Contractor | 5 | 3 |
| Subsidy Officer | 6 | 3 |
| **Total** | **43 screens** | |

---

## 10. Open Decision

**Authentication on mobile:** The current web backend uses phone + password. The SRS specifies OTP-only login for mobile. Two options:

- **Option A — OTP only:** Cleaner UX for farmers and field staff. Requires SMS provider integration (MSG91/Twilio) and 2 new backend endpoints.
- **Option B — Password login (same as web):** Zero backend auth changes. Biometric on repeat visits. Recommended for Phase 1 to reduce scope; switch to OTP in Phase 2.

> **Recommendation:** Use Option B (password login) for Phase 1 to ship faster. Add OTP as Phase 2 enhancement.
