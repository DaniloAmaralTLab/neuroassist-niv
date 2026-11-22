# FE-ACS-002 -- acs.routes.ts — lazy route table with authGuard / canManageAccessGuard / opsHostGuard

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/acs/shell-entry/src/lib/acs.routes.ts` defines the full ACS lazy route table: `/access` (redirect), `/access/caregivers`, `/access/caregivers/new`, `/access/patient-sessions[/:patientId]`, and `/ops/tenants` (ops-host gated), all with correct guards and `loadComponent` lazy loading (SPEC-01).

## Approach (execution path)
1. Define `ACS_ROUTES: Routes` in `acs.routes.ts`.
2. `/access`: `AcsRootComponent` with redirect to `caregivers`; guard: `authGuard`.
3. `/access/caregivers` and `/access/caregivers/new`: `loadComponent` → feature-caregivers; guards: `[authGuard, canManageAccessGuard]`.
4. `/access/patient-sessions` and `/access/patient-sessions/:patientId`: `loadComponent` → feature-patient-sessions; guards: `[authGuard, canManageAccessGuard]`.
5. `/ops/tenants`: `loadComponent` → feature-tenant-admin; guards: `[authGuard, opsHostGuard]`.
6. Use `title` and `data.breadcrumb` on each route for `NavigationService` integration.
7. `authGuard` is the shared session guard from `@neuroassist/shared/auth-session` (no session → login, never renders ACS).
8. Export `ACS_ROUTES` from `index.ts`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/shell-entry/src/lib/acs.routes.ts`
- [ ] All 5 routes present (`/access`, `/access/caregivers`, `/access/caregivers/new`, `/access/patient-sessions`, `/ops/tenants`)
- [ ] Every feature route uses `loadComponent` (no eager imports)
- [ ] `/ops/tenants` guards: `[authGuard, opsHostGuard]` — NOT `canManageAccessGuard`
- [ ] `/access/caregivers` and `/access/patient-sessions` guards: `[authGuard, canManageAccessGuard]`
- [ ] `npx nx lint acs-shell-entry` PASS

## Acceptance criteria
- [ ] WHEN navigating to `/access`, THE SYSTEM SHALL redirect to `/access/caregivers`
- [ ] `authGuard` appears on every ACS route and is imported from `@neuroassist/shared/auth-session`
- [ ] No feature lib is eagerly bundled into the shell chunk (dynamic import in every `loadComponent`)
- [ ] `npx nx build acs-shell-entry` PASS

## Dependencies
FE-ACS-001 (acs.contract.ts must exist before routes reference its types), FE-ACS-019 (canManageAccessGuard), FE-ACS-020 (opsHostGuard).

## Tenant-context impact
None — routes are static; tenant is resolved at runtime by guards/interceptors.

## Prioridade
P1
