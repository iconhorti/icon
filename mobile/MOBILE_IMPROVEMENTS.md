# Mobile app — review & fixes

Review of the Expo / React Native app (`mobile/`). It's healthy overall — 0 TS errors,
36 real screens across 7 roles, RTK Query data layer, SQLite read-cache + offline write
queue, push notifications, biometric unlock. The issues below were found and the
correctness/security cluster has been fixed.

## ✅ Fixed (this pass)

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **Offline writes never synced.** Four screens (`site_visit`, `dpr`, `health_assessment`, `visit_report`) call `queueAdd()`, but `useSyncQueue` was mounted nowhere — queued items sat in SQLite forever and never reached the server. | 🔴 Critical | Added `SyncQueueRunner` (headless) and mounted it in `App.tsx` inside `AuthProvider`. The queue now flushes. |
| 2 | **Logout left the write queue intact.** `logout()` cleared the read cache but not the sync queue → User A's queued offline writes could replay under User B's token on the same device. | 🔴 Security | `logout()` now also calls `queueClear()`. |
| 3 | **Poison-message infinite retry.** `syncNow` wrote an `attempts` column it never read; a non-retryable 422/400 re-fired on every foreground forever. | 🔴 | Drop after `MAX_ATTEMPTS` (5); dead-letter non-retryable 4xx immediately; only retry 5xx/408/429/network. Returns `{ synced, failed, dropped }`. |
| 4 | **Double-submit on lost response.** A write that succeeded but whose response was lost (timeout) would re-send on retry. | 🟡 | Each queued item carries a UUID sent as an `Idempotency-Key` header (backend should honour it; harmless otherwise). |
| 5 | **Sync only fired on `AppState → active`.** Regaining signal mid-session didn't trigger a flush. | 🟡 | `useSyncQueue` now also syncs on `expo-network` connectivity-regained (feature-detected). |
| 6 | **API URL + LAN IP duplicated in 5 files.** | 🟡 design | New `src/constants/config.ts` (`API_URL`); `baseApi`, `AuthContext`, `useSyncQueue`, `usePushNotifications`, `IotMonitorScreen` all import it. Zero hardcoded URLs remain. |

## ⏳ Remaining (next, not yet done)

### A. Camera — ✅ DONE on all four capture screens
A reusable `PhotoCapture` component (`src/components/shared/PhotoCapture.tsx`) wraps
`expo-image-picker`: tappable slots, live thumbnails with a ✓ badge, a `n/N captured` counter,
camera-permission handling, and quality-0.4 compression. `photosToPayload()` serializes the
slot→dataURI map into `photos: [{ slot, data }]`, embedded in the offline queue payload so
photos **survive no-signal** and upload when the queue flushes.

| Screen | Slots | Gate |
|--------|-------|------|
| `SiteVisitScreen` | Corner / Water / Road / Other | all 4 required |
| `DPRScreen` | Before / After | both required |
| `HealthAssessmentScreen` | Crop / Pest-Disease | optional |
| `VisitReportScreen` | Photo 1 / Photo 2 | optional |

- **Backend (TODO):** the four submit endpoints (`/site-visits`, `/projects/dpr`,
  `/agronomist/farms/{id}/assessment`, `/agronomist/farms/{id}/visit-report`) should accept
  `photos: [{ slot, data }]` (base64 data URIs). If payload size becomes a concern at field
  scale, switch the queue transport to multipart — the `PhotoCapture` API stays the same.

### B. Concurrency token — ✅ DONE on the update mutations (awaiting backend 409)
`src/utils/concurrency.ts` mirrors the web helper (`versionOf`, `isConflict`, `CONFLICT_MESSAGE`).
The three **PATCH/update** mutations now carry the concurrency token and the calling screens
handle a 409 by showing the conflict message and refetching:

| Mutation | Screen | Token source | 409 handling |
|----------|--------|--------------|--------------|
| `updateProjectFields` | (project edit) | loaded project | message |
| `updateMilestone` | `MilestoneTrackerScreen` | loaded milestone | message + refetch |
| `reviewDocument` | `ApprovalQueueScreen` | loaded doc | message |
| `reviewDocument` | `KycReviewScreen` | (only has docId) | message + go back to reload |

- **Backend (TODO):** add a `version` (int, preferred) or `updated_at` token to Project /
  Milestone / Document, and return **409** when the submitted token is stale. The client already
  sends it (in the PATCH body) and handles the rejection.
- **Offline queue note:** the queued writes (`site_visit`/`dpr`/`assessment`/`visit_report`) are
  append-only *creates*, not edits — lost-update doesn't apply. The `Idempotency-Key` already
  prevents duplicate submits, and a non-retryable 409 on replay is dead-lettered (see #3).

### C. Surface pending-sync count
The single `SyncQueueRunner` drives sync; consider showing `pendingCount` (already returned by
`useSyncQueue`) in the offline banner so users know writes are awaiting upload.
