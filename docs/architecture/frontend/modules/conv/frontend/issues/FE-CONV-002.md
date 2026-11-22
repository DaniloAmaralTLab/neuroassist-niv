# FE-CONV-002 -- CONV_ROUTES — single /patient/converse route with patientSessionGuard and lazy SpeechTreeNavigatorComponent

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

**SPEC refs:** SPEC-01 §1–4, generator-config.yml §shell_route, contracts/backend-api-cross-link.md §1

## Outcome
`CONV_ROUTES` is defined and exported: a single route at path `'converse'` (host mounts under `/patient`), lazy-loading `SpeechTreeNavigatorComponent`, protected by `patientSessionGuard`, titled `'Talk'`. A redirect from `''` to `'converse'` is included. No `/patient/confirm-training` route exists in CONV_ROUTES (TRN owns that).

## Approach (execution path)
1. Create `frontend/libs/conv/src/lib/conv.routes.ts`.
2. Define `CONV_ROUTES: Routes` — one route: `{ path: 'converse', canActivate: [patientSessionGuard], loadComponent: () => import('./feature-converse/speech-tree-navigator.component').then(m => m.SpeechTreeNavigatorComponent), title: 'Talk', data: { breadcrumb: 'Talk' } }`.
3. Add redirect: `{ path: '', pathMatch: 'full', redirectTo: 'converse' }`.
4. Export `CONV_ROUTES` from `frontend/libs/conv/src/lib/conv.routes.ts` and re-export from `frontend/libs/conv/src/index.ts`.
5. The Patient-Mode host lazy-loads `@neuroassist/conv` under `/patient`: `{ path: 'patient', loadChildren: () => import('@neuroassist/conv').then(m => m.CONV_ROUTES) }`. This host wiring is **not done here** (G1 host undecided — SPEC-01 §5); CONV ships the routes only.
6. Unit test: assert CONV_ROUTES has exactly one real route (path='converse') + one redirect; assert `confirm-training` is absent.

**Guard dependency:** `patientSessionGuard` from `frontend/libs/conv/access/` (FE-CONV-018). Wire with a stub guard for the route-unit test.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/src/lib/conv.routes.ts` created with `CONV_ROUTES: Routes`
- [ ] One route: path='converse', canActivate=[patientSessionGuard], loadComponent SpeechTreeNavigatorComponent, title='Talk'
- [ ] Redirect: `{ path: '', pathMatch: 'full', redirectTo: 'converse' }`
- [ ] NO `/patient/confirm-training` route (TRN owns it — SPEC-01 §2)
- [ ] Re-exported from `frontend/libs/conv/src/index.ts`
- [ ] `npx nx test conv` PASS — asserts exactly 1 non-redirect route and no confirm-training
- [ ] `npx nx lint conv` PASS

## Acceptance criteria
- [ ] `CONV_ROUTES` has exactly one navigable path (`converse`) and one redirect — no publish/retire/erase or confirm-training route
- [ ] `patientSessionGuard` is wired as `canActivate` on the converse route
- [ ] `SpeechTreeNavigatorComponent` is lazy-loaded (no eager import)
- [ ] `npx nx test conv` PASS; `npx nx lint conv` PASS

## Dependencies
FE-CONV-001 (conv.contract.ts for route title metadata).
FE-CONV-018 (patientSessionGuard — stub for unit test).

## Tenant-context impact
None — routes are global per app instance.
