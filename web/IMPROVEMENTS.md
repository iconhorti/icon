# Post-migration improvements — status & backend contracts

This file tracks the review-driven improvements applied after the TS migration,
and documents the **backend work** still required for the feature items that the
frontend can't complete alone.

## ✅ Done (frontend, shipped)

| Area | What changed | Files |
|------|--------------|-------|
| **Roles centralized** | Single source of truth for role strings + access sets; `<RequireRole>` wrapper and `useRequireRole()` hook replace duplicated per-page guards. | `src/lib/roles.ts`, `src/components/RequireRole.tsx`, `App.tsx`, all management pages |
| **Shared formatters** | `fmtCurrency/fmtCrore/fmtNumber/pct/fmtDate`. Fixes the `string \| number` mixed-type bug in `conversionRate`. | `src/lib/format.ts` |
| **Central logger** | `logger.warn/error` + `errorMessage()`. Replaced silent `catch {}` blocks in ProjectForm. Single integration point for Sentry later. | `src/lib/logger.ts` |
| **Upload validation** | Client-side type/size guard (10 MB, whitelisted extensions) before upload hits the network. | `src/lib/fileValidation.ts`, `ProjectForm.tsx` |
| **CSV export** | Every `AgTable` now has an Export CSV button (AG-Grid community exporter). Per-page filenames. | `src/components/AgTable.tsx`, all list pages |
| **Server-state (TanStack Query)** | Installed `@tanstack/react-query`; `QueryClientProvider` in `main.tsx`; **DealersManagement** converted to `useDealers/useSaveDealer/useToggleDealer` as the reference pattern (caching, dedupe, auto-invalidation). | `src/lib/queryClient.ts`, `src/hooks/useDealers.ts`, `DealersManagement.tsx`, `main.tsx` |
| **i18n scaffold** | Zero-dep `t()` + `useTranslation()` + `en`/`hi` dictionaries + `LanguageSwitcher` in the sidebar. Dealers page migrated as the worked example. | `src/i18n/*`, `src/components/LanguageSwitcher.tsx`, `Sidebar.tsx` |

### Pages now on TanStack Query + `t()`
All list/management screens are converted — they no longer hand-roll
`useState(loading/error/data)` + `loadX()`:

| Page | Hook(s) |
|------|---------|
| DealersManagement | `useDealers`, `useSaveDealer`, `useToggleDealer` |
| UserManagement | `useUsers`, `useSaveUser`, `useToggleUser` |
| AgronomistsManagement | `useUsers('agronomist')`, `useRoleKpis` |
| OfficeStaff | `useStaff`, `useSaveUser`, `useToggleUser`, `useRoleKpis` |
| ContractorsManagement | `useContractors`, `useSkills`, `useRoleKpis`, `useInvalidateContractors` |
| FarmerManagement | `useFarmers`, `useFarmerStats`, `useSaveFarmer`, `useDeleteFarmer` |
| ProjectList | `useProjects` |
| Reports | `useProjectStats` |
| Notifications | `useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` |

Hooks live in `src/hooks/`; query keys are centralized in `qk` (`src/lib/queryClient.ts`).
Mutations auto-invalidate the relevant lists, so edits on one screen refresh others
(e.g. creating a `project_manager` in Users updates the Staff screen).

**Correction to an earlier claim in this doc:** an older version of this section said
"Everything is converted." That covered every *list/management* page, but missed three
detail/form pages. Corrected status:
- `OfficeStaff` → `DprWorkflowTab`: `useDprPipeline` + `useAdvanceStage` (per-row "updating" UX preserved; advancing a stage auto-refreshes the pipeline and project lists).
- `Masters`: `useLookup(tab)` for each standard tab + `useLocationLevel(level, filter)` for the states→districts→talukas→villages drill-down. The `data` map the JSX reads is now assembled from the query cache (`src/hooks/useMasters.ts`), and all create/update/delete handlers invalidate the relevant keys instead of hand-managing a `data` dictionary.
- `ProjectDetail` — **converted**: `useProjectDetail(id)` in `src/hooks/useProjects.ts`. This page is a pure single-entity read (no transform), so it was a clean fit — same `fetchProject()` name kept as a thin wrapper over `refetch()` since three child components (`TeamAssignmentCard`, `ProjectItemsCard`, `StageActionPanel`) take it as a `refresh`/`onSaved` callback prop.
- `ProjectForm` / `FarmerForm` — **intentionally NOT converted**. Both are multi-step
  wizards where the initial fetch (edit mode) is immediately unpacked into independent
  pieces of editable local state (e.g. `FarmerForm` splits one address string into
  village/taluka/district/pincode fields). There's no "cached read" being displayed —
  it's a one-time form-initialization side effect, which `useEffect` + imperative fetch
  already expresses correctly. Converting these to `useQuery` would only address a
  documentation/consistency complaint, not fix a bug, at real regression risk for the
  most complex pages in the app (multi-step submission with item/document side effects).
  Revisit only if a concrete staleness bug shows up in practice.

### How to extend the patterns
- **More server-state hooks:** copy any file in `src/hooks/` (e.g. `useDealers.ts`). Add the key to `qk` in `src/lib/queryClient.ts`, then delete the page's manual `useState(loading/error/data)` + `loadX()`.
- **More translations:** add keys to `src/i18n/en.ts` first (others fall back to English), then translate in `hi.ts`. Replace literal JSX strings with `t('key')`. Page titles/subtitles are migrated; form-field labels and table headers are the next batch.

## ⏳ Needs backend work (frontend ready to consume)

These were in the review but require API/database support. Frontend contracts proposed below.

### 1. Audit trail / activity log UI — ✅ FRONTEND SHIPPED (awaiting endpoint)
Stage changes say "this will be logged" — there is now a read view on `ProjectDetail`.
- **Frontend (done):** `ActivityTimeline` card (`src/components/ProjectDetail/ActivityTimeline.tsx`),
  `getProjectActivity()` + `ProjectActivity` type in `api/client.ts`, and `useProjectActivity()`
  hook (`src/hooks/useProjects.ts`). Renders actor/role, action, stage transition (from → to,
  using `WORKFLOW_STAGES` labels), optional note, and relative time. The card auto-refreshes when
  a stage is advanced/reverted.
- **Graceful degradation:** if the endpoint returns 404/501 the card shows a "will appear once the
  audit-log API is enabled" hint instead of an error, and does not retry — so it's safe to ship now.
- **Backend (TODO):** implement `GET /api/v1/projects/{id}/activity` returning
  `[{ id, actor_name, actor_role?, action, from_stage?, to_stage?, note?, created_at }]`
  (or `{ activity: [...] }` — the client accepts both). The UI lights up automatically once it's live.

### 2. Optimistic concurrency (lost-update protection) — ✅ FRONTEND SHIPPED (awaiting backend)
Two staff editing the same project silently clobber each other.
- **Frontend (done):** `src/lib/concurrency.ts` (`versionOf`, `isConflict`, `CONFLICT_MESSAGE`).
  `ProjectForm` captures the project's `version`/`updated_at` at load and sends it in the update
  payload; on **409** it shows the "changed since you opened it — reload" message instead of saving.
  `StageActionPanel` (inline stage field-edits) does the same. No-op until the backend enforces it.
- **Backend (TODO):** add a concurrency token to Project — `version` (int, preferred) or rely on
  `updated_at` — and make `PUT /projects/{id}` (and `PATCH` for field updates) return **409 Conflict**
  when the submitted token is stale. The frontend already sends it and handles the rejection.

### 3. Real-time notifications — ✅ FRONTEND SHIPPED (awaiting endpoint)
- **Frontend (done):** `useNotificationsStream` (`src/hooks/useNotificationsStream.ts`) opens an
  `EventSource`, invalidates the notifications query on push, and dispatches
  `icon-notifications-refresh` so the Sidebar unread badge updates instantly too. Mounted app-wide
  in `Layout`. If the endpoint is missing the connection closes without a reconnect-loop and the
  existing 60 s poll keeps working.
- **Backend (TODO):** `GET /api/v1/notifications/stream` (text/event-stream), authenticated via the
  `?token=` query param (EventSource can't send headers), emitting an event per new/updated
  notification for the current user.

### 4. Required-document gate per stage — ✅ FRONTEND SHIPPED (awaiting endpoint)
- **Frontend (done):** `useRequiredDocs` (`src/hooks/useDocuments.ts`) + `RequiredDocsChecklist`
  card on `ProjectDetail`. Shows each required doc for the current stage with a present/missing
  indicator and a summary banner. Renders nothing when the backend hasn't marked any docs required
  (graceful), so it's safe to ship now.
- **Backend (TODO):** `GET /api/v1/uploads/types?stage={stage}&required=true` →
  `{ document_types: [...] }` (or bare `string[]`). To hard-*block* stage advance, wire
  `useRequiredDocs(...).missing.length` into the advance handler in `ProjectDetail`.

### 5. Offline / poor-connectivity (field staff) — 🟡 FIRST SLICE SHIPPED
- **Frontend (done):** `useOnlineStatus` (`src/hooks/useOnlineStatus.ts`) + a global offline banner
  in `Layout` ("You're offline — changes can't be saved…").
- **Remaining (own milestone):** a service worker + IndexedDB **draft/mutation queue** (e.g. Workbox)
  so edits made offline are persisted and replayed on reconnect. This is a substantial effort and
  should be planned separately — the banner is the awareness layer it builds on.

## Notes / known latent issues (not changed — out of scope)
- `Settings.tsx` and a few pages call the role guard before their `useState` hooks (pre-existing conditional-hooks pattern). Works because denied users navigate away, but should be refactored so the guard runs after all hooks.
- Heavy inline styles across pages — a CSS-token/utility layer would shrink files; deferred (cosmetic, large surface).
- `beforeunload` uses `e.returnValue = ''` — legacy but still required by Chrome to show the unsaved-changes prompt; kept intentionally.
