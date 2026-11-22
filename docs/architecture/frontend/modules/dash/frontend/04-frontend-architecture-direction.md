# 04 — Frontend Architecture Direction — dash (DASH)

> Scope: stack, library organization, routing and state direction. No Angular code at this stage.

## 1. Stack

Angular 21, Nx 22.x, TypeScript strict, RxJS 7.8 **interop only** + **Signals as the state primitive**, Jest
(unit), Playwright (e2e). Tailwind v4 utilities bound to oklch tokens from `@neuroassist/shared/ui-tokens`
(dark default). English-only (ADR-018). Consistent with every promoted NIV module.

## 2. App boundary

DASH materializes as the Nx library **`@neuroassist/dash`** (`frontend/libs/dash`, bare-name house convention —
ADR-006, module-entry-as-library). The caregiver shell `neuroassist-niv-web` lazy-loads it as the **home** route.
DASH is **prototype-to-production (D-493)**: `screens/home` is promoted into `libs/dash/.../feature-overview`,
re-wired from its four prototype facades to the composed modules' public seams. It is **not** scaffolded greenfield
and owns no `apps/dash/` of its own beyond the lib.

## 3. Library organization (Nx tags)

| Sub-path | Nx tag | Depends on |
|---|---|---|
| `libs/dash` (entry) | `type:module-entry`, `scope:dash` | shared, and the **public API** of `scope:hist/evnt/edge/pat` |
| `feature-overview` | `type:feature`, `scope:dash` | `dashboard.facade`, composed modules' components, shared/ui |
| `dashboard.facade` | `type:facade`, `scope:dash` | composed modules' **facades/ports** (public), shared |
| `integration` | `type:integration`, `scope:dash` | composed modules' integration services + shared |
| `api/*` *(only if dash-service confirmed)* | `type:data-access`, `scope:dash` | shared/access-http-base |
| `ui/*` (optional) | `type:ui`, `scope:dash` | shared/ui-tokens only |

Boundary rule (enforced by `@nx/enforce-module-boundaries`): `scope:dash` may import another module **only via its
published `index.ts`** (facades, integration services, presentational components) — never its `lib/` internals, and
never another module's `data-access`. This is what keeps "composition over re-query" (ADR-005) mechanically true.

## 4. Hub / shared library dependencies

- `@neuroassist/shared/access-http-base` — `${ACCESS_HTTP_BASE}` (base `${ACCESS_HTTP_BASE}/dash` **only if**
  `dash-service` is confirmed; never `/api/v1`).
- `@neuroassist/shared/access-decision` — `AccessDecisionService` for the route guard and any surface gating.
- `@neuroassist/shared/error-model` — `ProblemDetail` → `AppError`.
- `@neuroassist/shared/ui-feedback` — degraded/error caregiver messaging.
- `@neuroassist/shared/ui-tokens` — design tokens (dark default).
- `@neuroassist/shared/observability` — correlation + advisory-decision audit.
- **Composed modules (public API):** `@neuroassist/hist`, `@neuroassist/evnt`, `@neuroassist/edge`, `@neuroassist/pat`.

## 5. Routing strategy

- Shell → `@neuroassist/dash` via `loadChildren` as the **home** route; `canActivate: [authGuard, dashGuard]`.
- `DASH_ROUTES`: `/home` → `feature-overview` via `loadComponent`. Routes out to `/history` (HIST),
  `/calibration` (PAT) and EVNT notice surfaces are **links to other modules' routes**, not DASH routes.
- **`/entry` is NOT a DASH route.** The static brand/login moment lives outside the shell; recommended owner is the
  app shell / ACS (doc 06 Q1, ADR-005). DASH does not register or promote it.
- DASH never auto-routes and never performs the emergency takeover (EVNT owns that).

## 6. State strategy

- **Signals-first, composition-derived.** `DashboardFacade` holds a private `signal` per source-health plus the
  composed modules' read-only signals, and exposes **`computed`** derivations: per-source `SourceHealth`, the
  `CompositeStatus` headline, `KpiVM`, `OverviewVM`. Public surface is `.asReadonly()` / `computed` only.
- **No store, no NgRx, no manual `BehaviorSubject`** as source of truth. DASH's only owned state is UI-local:
  source-health flags, the composite status, the advisory dismissal, refresh ticks.
- The headline `computed` encodes INV-1 (doc 03 §5): it returns `all_clear` only when every source is `ok` and
  clear; otherwise `degraded` / `notice` / (defer to) `emergency`.

## 7. Module contract strategy (`dash.contract.ts`)

Fields anticipated for the contract (reconciled with the shell registry and BE authorities at M1.5):

- `MODULE_KEY = 'dash'`; menu metadata (home/dashboard entry, icon, order) for the shell registry.
- `MODULE_PERMISSION_MAP` — DASH's own authorities are **pending BE** and equal the BE authorities once published
  (convention `dash.<resource>.<action>`, e.g. a prospective `dash.overview.read`); meanwhile DASH relies on the
  composed modules' authorities (`hist.history.read`, `evnt.*`, `edge.*`, `pat.*`) for the surfaces it embeds. No
  authority is invented ahead of the BE.
- `MODULE_FEATURE_FLAGS` — e.g. `dash.suggestion.enabled` (inline advisory), `dash.bff.enabled` (off until a
  `dash-service` is confirmed).
- `provideDash({ adapter })` — defaults to **`http`** **only if** `dash-service` is confirmed; a wire-shaped mock
  sits behind an explicit flag (carry-forward `scaffold:mock-adapter-default`). If DASH stays composition-only,
  `provideDash` wires no port and simply asserts the composed providers are present.
