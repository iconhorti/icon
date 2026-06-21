# Backend endpoints — implemented for web + mobile parity

These close the backend contracts the web and mobile apps were already coded
against (with graceful-degradation fallbacks). App imports & migrations verified
clean (`python -c "import main"`).

## ✅ Implemented

### 1. Audit trail
- **`GET /api/v1/projects/{id}/activity`** → `[{ id, actor_name, actor_role, action, from_stage, to_stage, note, created_at }]` (most-recent first).
- New `ProjectActivity` table + `activity.log_activity()` helper.
- Rows are now written automatically on **stage change**, **full update**, and **field update** in `routers/projects.py`.
- Lights up the web **ActivityTimeline** card.

### 2. Optimistic concurrency (409)
- `Project.version` + `ProjectMilestone.version` columns added (idempotent startup migration in `main.py`).
- **`PUT /projects/{id}`** and **`PATCH /projects/{id}`** now read the client's `version`, return **409 Conflict** if stale, and bump `version` on success.
- `version` is included in `ProjectResponse` so the client can round-trip it.
- Lights up the lost-update guards in web **ProjectForm** / **StageActionPanel** and mobile's update mutations.

### 3. Required-document gate
- **`GET /api/v1/uploads/types?stage={stage}&required=true`** → `{ document_types: [...] }` for that stage.
- Backed by `constants/stages.py → STAGE_REQUIRED_DOCS`.
- Lights up the web **RequiredDocsChecklist**.

### 4. Push device registration
- **`POST /api/v1/devices/register`** `{ token, platform? }` → upserts `DeviceToken` for the current user.
- New `routers/devices.py` + `DeviceToken` table. The mobile app already calls this after login.

### 5. Real-time notifications (SSE)
- **`GET /api/v1/notifications/stream?token={jwt}`** → `text/event-stream`. Emits a `notification` event when the user's notification set changes; heartbeats otherwise. Token via query param because `EventSource` can't set headers.
- Lights up the web **useNotificationsStream**.

## ⏳ Deferred — needs mobile↔backend reconciliation (NOT a one-endpoint fix)

### 6. Site-visit photo persistence
The mobile capture screens POST a payload shaped like
`{ gps_lat, gps_lng, soil_type, water_source, electricity, road_access, observations, photos:[{slot,data}], submitted_at }`,
but the backend `SiteVisitCreate` schema requires `project_id` + `visited_by` (both `NOT NULL`)
and uses different field names (`visit_latitude` vs `gps_lat`, etc.). The mobile
`SiteVisitScreen` also has **no project selector**, so it can't supply `project_id`.

So storing the photos can't be done by adding a single endpoint — it needs a small
reconciliation:
1. Mobile: add a project picker to the capture screens (or pass `projectId` through navigation) and align field names.
2. Backend: a `POST /site-visits/field` endpoint accepting the mobile shape + base64 photos, decoding them to `uploads/site_visits/` and storing paths in `SiteVisit.photos` (the column already exists as a JSON-of-paths `Text`).

Recommend scoping this as its own task. The other queued mobile writes
(`dpr`, `health_assessment`, `visit_report`) have the same payload-vs-schema gap and
should be reconciled in the same pass.

## Notes
- Migrations run on startup and are idempotent (`_run_migrations()` in `main.py`) — safe on SQLite (dev) and Postgres (prod).
- The SSE poll interval is 15s (tune in `notifications.py`). For high scale, replace the DB-poll with a pub/sub (Redis) fan-out.
