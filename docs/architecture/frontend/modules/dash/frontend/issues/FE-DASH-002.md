# FE-DASH-002 -- dash.routes.ts — DASH_ROUTES: /home with authGuard + dashGuard; redirectTo home; no entry route

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`libs/dash/src/lib/dash.routes.ts` exports `DASH_ROUTES` with a single `/home` route guarded by `authGuard` and `dashGuard`, a root redirect to `home`, and no `entry` route — conforming to SPEC-01 §1 and §5.

## Approach (execution path)
1. Create `libs/dash/src/lib/dash.routes.ts`.
2. Define `DASH_ROUTES: Routes` with a single entry: `path: 'home'`, `canActivate: [authGuard, dashGuard]`, `loadComponent: () => import('./feature-overview/overview-page.component').then(m => m.OverviewPageComponent)`, `title: 'Home'`, `data: { breadcrumb: 'Home' }`.
3. Add `{ path: '', pathMatch: 'full', redirectTo: 'home' }` for the module root redirect.
4. Verify: NO `entry` route is registered in this file (entry is a shell route, SPEC-01 §5).
5. Export `DASH_ROUTES` from `libs/dash/src/index.ts`.
6. Shell wiring reference (implemented in FE-DASH-004): `{ path: '', loadChildren: () => import('@neuroassist/dash').then(m => m.DASH_ROUTES) }`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/dash.routes.ts` created with `DASH_ROUTES`
- [ ] `/home` route with `canActivate: [authGuard, dashGuard]` and lazy-load of `OverviewPageComponent`
- [ ] Root redirect `{ path: '', redirectTo: 'home', pathMatch: 'full' }` present
- [ ] NO `entry` route in `DASH_ROUTES`
- [ ] `DASH_ROUTES` re-exported from `libs/dash/src/index.ts`
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS (no TS errors)
- [ ] Guard imports reference `authGuard` from shared/access and `dashGuard` from `libs/dash/access` (FE-DASH-014/015)

## Acceptance criteria
- [ ] `DASH_ROUTES` has exactly 2 route entries: `home` + root redirect
- [ ] `canActivate: [authGuard, dashGuard]` on the `home` route — no hardcoded `true`
- [ ] No `entry` path in `DASH_ROUTES`
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-001 (dash.contract.ts must exist for the lazy-load path to resolve)
- FE-DASH-014 (authGuard), FE-DASH-015 (dashGuard) — guards must be implemented before this route is active

## Tenant-context impact
None — routing is tenant-agnostic; the JWT carries the tenant context.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-01-route-map.md` (§1, §3, §5)

## Architecture alignment
- Guards backed by `AccessDecisionService.can` — never hardcoded (carry-forward `guard:stub-permissive`)
- Lazy-loaded via `loadComponent` (standalone components)
- Tags Nx: `scope:dash`, `type:domain`

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:dash
priority:P1

## Prioridade
P1
