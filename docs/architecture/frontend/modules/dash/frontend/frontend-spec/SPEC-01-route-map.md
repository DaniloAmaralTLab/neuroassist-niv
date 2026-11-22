# SPEC-01 — Route Map — dash (DASH) Frontend

> The route surface `@neuroassist/dash` exposes. DASH is the caregiver **home**: a single
> operational route (`/home`) lazy-loaded by the shell after sign-in. Sources:
> `frontend/04-frontend-architecture-direction.md` §5, `frontend/05-state-and-data-flow.md` §6,
> `adr/ADR-005-composition-host-and-fail-safe-overview.md`, BE `adr/ADR-001` (no backend) and
> `adr/ADR-002` (fail-safe overview). No Angular code here — the code fences are illustration.

## 1. Master route table

| Path | Component | Feature Lib | Guards | Title | Breadcrumb |
|---|---|---|---|---|---|
| `/home` | `OverviewPageComponent` | `libs/dash/feature-overview` | `authGuard`, `dashGuard` | "Home" | `[Home]` (root) |

- `/home` is the shell's **default post-login destination** and the dashboard root; its breadcrumb is the
  root and it does **not** nest under another module (doc 05 §6).
- DASH registers **exactly one** route. Everything else the overview shows is a **link out** to another
  module's route, listed in §2 — never a DASH-owned route.

## 2. Outbound links (other modules' routes — not DASH routes)

| Trigger | Destination | Owner | Authority on the destination |
|---|---|---|---|
| "View history" / recent-events "View all" | `/history` | HIST | `hist.history.read` |
| "Manage catalog" | `/calibration` | PAT | `pat.command.read` |
| Tap a routine notice | EVNT notice surface | EVNT | `evnt.event.read` |
| Tap a detection-lapse notice | EVNT lapse alert surface | EVNT | `evnt.detection-lapse.read` |

DASH owns no breadcrumb for these; they are the owning module's routes reached by `routerLink`.

## 3. `DASH_ROUTES` shape (illustration)

```ts
export const DASH_ROUTES: Routes = [
  {
    path: 'home',
    canActivate: [authGuard, dashGuard],      // AccessDecisionService-backed; never a hardcoded true
    loadComponent: () =>
      import('./feature-overview/overview-page.component').then(m => m.OverviewPageComponent),
    title: 'Home',
    data: { breadcrumb: 'Home' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
];
```

Shell wiring: the shell lazy-loads `DASH_ROUTES` as the home branch
(`{ path: '', loadChildren: () => import('@neuroassist/dash').then(m => m.DASH_ROUTES) }`) and makes
`/home` the default landing after a successful ACS sign-in.

## 4. Guards

- **`authGuard`** — shared session guard. A request to `/home` without an active caregiver session is
  redirected to the ACS login flow (the same pattern every promoted NIV module uses).
- **`dashGuard`** — a thin `AccessDecisionService`-backed guard. Because DASH owns no authority of its own
  (SPEC-05), `dashGuard` does **not** evaluate a `dash.*` key; it asserts an authenticated caregiver with a
  linked patient context and lets each embedded panel self-gate on its owning module's authority (SPEC-05
  §2). It follows the platform guard convention (`AccessDecisionService.can`, never a hardcoded `true` —
  carry-forward `guard:stub-permissive`).

## 5. The `entry` screen is NOT a DASH route

The prototype `screens/entry` (`/entry`) is a static, pre-shell brand/login moment with no operational data
(BE ADR-001 inspection: `writes: (none)`, reads none). Per `adr/ADR-005` §5 and `frontend/04` §5 its
**recommended owner is the app shell / ACS**: the DASH **promote** phase promotes it as a **shell route**
whose single call-to-action ("Enter the dashboard") drives the **ACS login flow**, landing on `/home`. DASH
does not register, host or promote it as a DASH route; the ownership is recorded in
`../contracts/backend-api-cross-link.md` §4. Owner = **SHELL** (orchestrator default, revisable).

## Acceptance criteria (EARS)

- WHEN a caregiver completes sign-in, THE SYSTEM SHALL route to `/home` as the default dashboard destination.
- IF `authGuard` finds no active caregiver session on `/home`, THEN THE SYSTEM SHALL redirect to the ACS login flow and SHALL NOT render the overview.
- IF `dashGuard` denies `/home`, THEN THE SYSTEM SHALL redirect to a safe fallback route and SHALL NOT render the overview.
- THE SYSTEM SHALL register no `/dash` backend route and SHALL NOT call any `/dash` endpoint from the home overview.
- THE SYSTEM SHALL treat `entry` as a shell route owned by the shell and SHALL NOT register `entry` in `DASH_ROUTES`.
