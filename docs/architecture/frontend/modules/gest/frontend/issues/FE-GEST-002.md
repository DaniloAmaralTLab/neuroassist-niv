# FE-GEST-002 -- gest.routes.ts — route table /station/runtime + /station/status gated by stationIdentityGuard (edge.device)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`libs/gest/src/lib/gest.routes.ts` exports `GEST_ROUTES` with two lazy routes under `/station/`; both are gated by `stationIdentityGuard` (edge.device identity — NEVER a caregiver `gest.*` authority); on absent/expired/unpaired station identity the guard routes to the station-unpaired state without rendering a fake running runtime (SPEC-01, INV-GEST-6).

## Approach (execution path)
1. Define `GEST_ROUTES: Routes` with two entries:
   - `{ path: 'runtime', loadComponent: () => import('./feature-station-runtime/...').then(m => m.StationRuntimePageComponent), canActivate: [stationIdentityGuard], title: 'Station detection', data: { breadcrumb: false } }`
   - `{ path: 'status', loadComponent: () => import('./feature-station-status/...').then(m => m.StationStatusPageComponent), canActivate: [stationIdentityGuard], title: 'Detection status' }`
2. Confirm no `AccessDecisionService.can('gest.*')` call appears in route guards or data resolvers.
3. Confirm both features are loaded via `loadComponent` (lazy) — no eager feature bundle.
4. Guard `stationIdentityGuard` is imported from `libs/gest/access` (not from shared).
5. Write a minimal router spec confirming both routes resolve to the correct components.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/src/lib/gest.routes.ts`
- [ ] Both routes use `loadComponent` (lazy) — no eager import
- [ ] Both routes list `canActivate: [stationIdentityGuard]`
- [ ] `/station/runtime` has `data: { breadcrumb: false }` (near-headless, patient never navigates)
- [ ] No `AccessDecisionService.can(...)` guard on either route
- [ ] `npx nx lint gest` PASS
- [ ] `npx nx build gest` PASS

## Acceptance criteria
- [ ] `stationIdentityGuard` listed on both routes; no `gest.runtime.*` authority guard
- [ ] Both routes are lazy (`loadComponent`, not `component` or eager import)
- [ ] `npx nx build gest` PASS (no TS errors)

## Dependencies
- FE-GEST-001 (MODULE_KEY)
- FE-GEST-024 (stationIdentityGuard implementation — routes can be declared before guard is implemented)

## Tenant-context impact
None — routes are gated by station identity, not tenant session.

## Prioridade
P1
