# Deep code analysis — fixes applied

Response to the external "ICON Backend — Deep Code Analysis Report". Verified each
finding against the live code before fixing (a couple were already partially
addressed by earlier work in this session). All changes verified: `python -m
py_compile` on every touched file, `python -c "import main"` constructs the app
(123 routes), and the new indexes were confirmed present in the live dev DB.

**Out of scope for this pass (explicitly deferred, not forgotten):** default
password policy (`icon123`) and introducing Alembic. Both remain documented as
technical debt in the original report.

## Critical security gaps — fixed

| Finding | Fix |
|---|---|
| `GET /subsidy/calculate/{id}` unauthenticated — financial data leak | Added `get_current_user` + `assert_project_access`. |
| `GET /reports/project/{id}` had auth but no ownership check — any user could read any project's daily reports | Added `assert_project_access`. `POST /reports/daily` now also checks the target project exists and is accessible. |
| `site_visits.log_site_visit` (create) — any allowed role could log a visit against *any* project id | Added `assert_project_access`. |
| `site_visits.get_site_visit` (single by id) — returned the visit without checking the caller could access its parent project | Added a project lookup + `assert_project_access`. |
| Device-token upsert silently reassigned ownership across users (a leaked/guessed token could redirect someone's push notifications) | `routers/devices.py`: cross-user reassignment is now an explicit delete-then-recreate (not an in-place mutation) and logged via `logging.warning` for audit visibility. Same-device re-login by the same user is untouched (no behavior change for the common case). |

## Concrete code bugs — fixed

| Finding | Fix |
|---|---|
| `contractors.py` had two functions both named `get_contractor_skills`; the second (route `/contractor-skills/{id}`) returned a bare SQLAlchemy `Query` (missing `.all()`), which FastAPI can't serialize | Renamed the second to `list_contractor_skill_assignments` and added `.all()`. |
| `subsidy.py` `get_rates` read `c.max_quantity`, but the `Component` model column is `max_qty` — would raise `AttributeError` the first time a "Component"-type rate was returned | Fixed the attribute name. |
| `auth_dep.get_current_user_optional` called `get_current_user(credentials, db)` but the real signature is `(request, credentials, db)` — would `TypeError` if ever invoked (currently unused, but now correct if/when it's wired up) | Added the missing `request: Request` parameter and corrected the call. |
| `backend/.dev_secret_key` (the dev JWT signing key) was untracked-by-policy but not actually gitignored | Added `backend/.dev_secret_key` to `.gitignore`. **Not done — needs your call:** the file is already committed to git history (`git ls-files` confirms it's tracked). Adding it to `.gitignore` only stops *future* changes from being tracked; the key itself is still in history and any clone/fork has it. If this repo's `.dev_secret_key` was ever pushed somewhere shared, treat that key as compromised. I did not run `git rm --cached` or regenerate the key myself since that's a git-history/credential decision, not a code fix — say the word and I'll do both. |
| `passlib[bcrypt]` listed in `requirements.txt` but `routers/auth.py` uses the `bcrypt` library directly (passlib is dead weight, per a comment already in that file about a Windows incompatibility) | Replaced with `bcrypt==4.2.1` in `requirements.txt`. |

## Stage workflow enforcement — added

`PUT /projects/{id}/stage` previously accepted any string as `stage_name` and never checked required documents. Now:
- **Validates** `stage_name` against `models.VALID_STAGES` → `400` if invalid.
- **Blocks** leaving a stage that has unmet entries in `constants.stages.STAGE_REQUIRED_DOCS` → `409` with the list of missing document types. Admin/owner can override (their PATCH/PUT already bypasses other guards elsewhere in this router, so this stays consistent).
- This is enforcement, not just the read-only `GET /uploads/types?stage=&required=true` info endpoint added earlier — actually advancing a project past `document_collection`, `design_boq`, `bank_processing`, etc. without the required docs now fails server-side, not just client-side.

## DB indexes + dead-config cleanup — added

- Added `index=True` to `Project.farmer_id`, `Project.dealer_id`, `Notification.user_id` in `models.py`, **and** an idempotent `CREATE INDEX IF NOT EXISTS` in `main.py`'s startup migration (since `create_all()` never alters existing tables). Verified present in the live dev DB:
  ```
  ix_projects_farmer_id, ix_projects_dealer_id, ix_notifications_user_id
  ```
- `update_project_fields` (PATCH `/projects/{id}`) had `BANK_FIELDS`, `GOC_FIELDS`, `SUBSIDY_FIELDS` as permanently-empty sets, and an `agronomist` whitelist referencing three columns (`agronomist_recommendations`, `plantation_date`, `seedlings_count`) that **don't exist on `Project`** — those roles' PATCH calls were silent no-ops via the `hasattr()` guard. Removed the dead/misleading whitelist entries rather than inventing new Project columns to fill them (that's a schema decision, not a bug fix — bank/subsidy/agronomy data already lives on `BankBranch`, `ProjectMilestone`, and `AgronomistConsultation`). If those roles need project-level PATCH fields, add real columns first.

## Verified, not changed (judgment calls worth flagging)

- **Public lookup GETs** (`/lookups/states`, `/districts`, `/talukas`, `/villages`, `/area-types`, `/agencies`) are unauthenticated by the report's own framing as "may be OK for forms." These are reference/geography data with no PII or financial content — I left them as-is rather than guess whether your registration/login flows need them pre-auth.
- **Broad internal-role project access** (`project_manager`, `bank_officer`, `agency_officer`, `agronomist` see *all* projects in `assert_project_access`) — this looked intentional (matches the router docstrings describing these as supervisory roles), not a bug, so untouched.
- **CheckConstraint/Index imported in models.py but rarely applied** beyond what I added — broader DB-level enum constraints (role, stage) are a larger schema change than this pass's scope; `VALID_STAGES` is now enforced at the API layer instead (see above).
