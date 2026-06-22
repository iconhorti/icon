# ICON Web Frontend Redesign — Design Spec
**Date:** 2026-06-22
**Status:** Approved
**Reference:** [turia.in/task-management-software-for-ca-firms](https://turia.in/task-management-software-for-ca-firms/) (visual style reference only — ICON's data model, roles, and workflow are unrelated)
**Scope:** `web/` — full visual + structural redesign of all ~18 pages and the shared component shell. No changes to routes, data fetching, role logic, i18n strings, or business logic.

---

## 1. Why

The current web app uses a "premium" forest-green-and-gold theme with glassmorphism (blurred translucent cards, gradient shadows) defined in `web/src/index.css`. The user wants a complete visual overhaul — moving to a clean, modern SaaS look modeled on Turia (a practice-management tool for CA firms), while keeping every existing feature (AG-Grid filtering/export, TanStack Query caching, i18n, role-based access) intact.

This is a **skin + layout-shell** change, not a rewrite. Every page keeps its existing data hooks, route, and business logic; only the visual layer (CSS tokens, layout structure, shared components) changes.

---

## 2. Visual reference (confirmed against a live screenshot)

Captured from `https://turia.in/task-management-software-for-ca-firms/`:
- Thin (~48px) icon-only sidebar rail, not a wide labeled sidebar
- Breadcrumb (`Home › Features › Task Management`) + underline-style tabs below the page header (`Task List` / `Task Summary`)
- Filter pill row (`All Categories`, `GST`, `MCA`, …) — dark-filled pill for the active filter, light grey for inactive
- A band of pastel, rounded KPI cards across the top, each with an emoji/icon, a large number, and a label (8 cards in the reference: Total, Pending, In Progress, Sent for Review, Request Changes, Overdue, Completed, Cancelled)
- Clean white data table: small colored circular avatar-initials per person, pill-shaped status badges in soft pastel colors (purple "Pending", orange "In Progress", green "Completed", red "Overdue", cyan "Sent for review"), plain colored text for priority (red "High", orange "Medium", green "Low")
- Primary accent: indigo/purple (`Start Free Trial` button, active nav state, logo)
- Generous rounded corners, minimal shadows, 1px borders doing most of the visual separation

---

## 3. Design tokens

Replaces the `:root` block in `web/src/index.css` (and its `.dark` overrides). The `--glass-*` variables, gold accent, and gradient shadow tokens are retired entirely.

```css
:root {
  /* Primary */
  --color-primary: #6366f1;        /* indigo-500 */
  --color-primary-hover: #4f46e5;  /* indigo-600 */
  --color-primary-soft: #eef2ff;   /* indigo-50, for active-nav pill bg */

  /* Neutrals */
  --color-text-main: #1e293b;      /* slate-800 */
  --color-text-muted: #64748b;     /* slate-500 */
  --color-text-faint: #94a3b8;     /* slate-400 */
  --color-bg-base: #fafbfc;
  --color-bg-card: #ffffff;
  --color-border: #f1f5f9;         /* slate-100, table/card borders */
  --color-border-strong: #e2e8f0;  /* slate-200, input borders */

  /* Status pairs (bg, text) — used identically for badges, priority text, KPI cards */
  --status-pending-bg: #fef3c7;    --status-pending-text: #92400e;   /* amber */
  --status-progress-bg: #cffafe;   --status-progress-text: #0e7490;  /* cyan */
  --status-urgent-bg: #ffe4e6;     --status-urgent-text: #9f1239;    /* rose */
  --status-financial-bg: #ede9fe; --status-financial-text: #6d28d9; /* violet */
  --status-success-bg: #dcfce7;   --status-success-text: #15803d;   /* green */
  --status-danger-bg: #fee2e2;    --status-danger-text: #b91c1c;    /* red */

  /* Radius */
  --radius-sm: 8px;   /* inputs, buttons, pills */
  --radius-md: 12px;  /* cards, table containers */

  /* Shadow — one token only, used sparingly */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06);

  --font-sans: 'Inter', sans-serif;
}

.dark {
  --color-primary: #818cf8;
  --color-primary-hover: #a5b4fc;
  --color-primary-soft: #312e81;
  --color-text-main: #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-text-faint: #64748b;
  --color-bg-base: #0f172a;
  --color-bg-card: #1e293b;
  --color-border: #1e293b;
  --color-border-strong: #334155;
  /* status pairs keep the same hues, darkened backgrounds + lightened text — finalized during implementation */
}
```

`--font-display` (Outfit) and the Google Fonts `@import` are dropped — Inter is used for everything, matching the reference.

**Avatar colors** are not CSS tokens — they're computed from a deterministic hash of the person's name/id (see §5), so the same person always renders the same color without a fixed palette running out.

---

## 4. Layout structure

Applies to every page via the shared `Layout`/`Sidebar` shell:

1. **Icon rail sidebar** (replaces `Sidebar.tsx`'s current wide labeled list) — 48px wide, icon-only, active item gets a `--color-primary-soft` pill background, tooltip-on-hover shows the label. User avatar circle pinned to the bottom.
2. **Breadcrumb + tab row** — shown on pages with sub-views (e.g. Projects: "Project List" / a future "Stage Summary"). Single-view pages just show the breadcrumb.
3. **KPI card band** — pastel rounded cards at the top of list pages where a meaningful breakdown exists (stage counts, status counts). Not mandatory on every page — only where the page already has dashboard-style KPI data (most list pages already compute these counts client-side or via `useRoleKpis`).
4. **Filter pill row** — replaces dropdown-style filters where the option set is small/enumerable (stage, role, category). Large/unbounded filters (date ranges, free-text search) stay as inputs.

---

## 5. Shared components (build/rewrite once, consumed everywhere)

| Component | File | Change |
|---|---|---|
| `Sidebar` | `web/src/components/Sidebar.tsx` | Rebuilt as icon rail per §4.1. Role-based nav items (already computed in `NAV_BY_ROLE`) stay — only the rendering changes. |
| `AgTable` | `web/src/components/AgTable.tsx` | `GRID_STYLES` block fully rewritten: remove grid lines, add soft-indigo row hover, restyle header to muted-uppercase, restyle pinned-actions column. **No change to columnDefs API, export, or column-picker logic** — pages keep working unmodified. |
| `Badge` *(new)* | `web/src/components/Badge.tsx` | One component replacing the ad-hoc `badge-success`/`badge-warning`/`badge-info` className soup scattered across pages. Takes a `tone` prop mapping to the status pairs in §3. |
| `Avatar` *(new)* | `web/src/components/Avatar.tsx` | Renders initials in a colored circle. Color = `hashStringToHue(name) → hsl(hue, 70%, 90%) bg / hsl(hue, 70%, 35%) text`, so it's deterministic per name, not random, and not limited to a fixed swatch list. |
| `KpiCard` | existing per-dashboard `KpiCard` components | Consolidated into one shared component (pastel bg + emoji/icon + number + label) instead of the several near-duplicate KpiCard implementations currently in `components/dashboards/*` and various pages. |
| `FilterPills` *(new)* | `web/src/components/FilterPills.tsx` | Pill row for enumerable filters (stage, category, role). |
| Buttons/inputs | `web/src/App.css` / `index.css` | `.btn-primary`, `.btn-outline`, `.form-control` class names **kept** (so page-level JSX doesn't need touching) — only their CSS rules change to the new tokens/radius. |

---

## 6. Rollout order

Dependency-ordered so nothing is styled against tokens/components that don't exist yet:

1. **Tokens** — `index.css` token replacement (§3)
2. **Shared shell** — `Sidebar`, `Layout`, `AgTable` restyle, new `Badge`/`Avatar`/`FilterPills`/shared `KpiCard`
3. **List pages** (highest traffic, most repetitive — validates the component system at scale): `ProjectList`, `FarmerManagement`, `DealersManagement`, `ContractorsManagement`, `UserManagement`, `AgronomistsManagement`, `OfficeStaff`, `Masters`
4. **Dashboards**: `Dashboard.tsx` + the 5 role-specific dashboard components
5. **Detail/form pages**: `ProjectDetail` (+ `StageActionPanel`, `TeamAssignmentCard`, `ProjectItemsCard`, `ActivityTimeline`, `RequiredDocsChecklist`), `ProjectForm`, `FarmerForm`
6. **Remaining pages**: `Reports`, `Documents`, `Notifications`, `Settings`, `SubsidyCalculator`, `Login`

Each step should leave the app in a buildable, working state — this is not a big-bang rewrite; it's restyled page by page in dependency order, verified with `tsc --noEmit` + `npm run build` after each step (matching the verification discipline already used throughout this project).

---

## 7. Explicitly out of scope

- Routes, navigation targets, role-based access rules
- Data fetching (TanStack Query hooks, query keys, mutations)
- i18n keys/strings (the `t()` calls stay; only their rendered container's styling changes)
- Backend contracts/endpoints
- Dark mode is **in scope** (token set defined in §3), but exact dark-mode status-pair values are finalized during implementation, not pre-specified pixel-for-pixel here
- Mobile app (`mobile/`) — unaffected, separate design system

---

## 8. Open implementation details (intentionally deferred to planning)

- Exact emoji/icon choice per KPI card per page (content decision, not a design-system decision)
- Whether `lucide-react` icons replace emoji in the final build (the approved mockup used emoji to match the Turia reference visually; `lucide-react` is already a dependency and may be a better fit for crispness — implementer's call, low risk either way)
- Per-page breadcrumb trail text (mechanical, derived from existing page titles)
