# FE-ACS-011 -- feature-caregivers routes + CaregiverListPageComponent connected to CaregiverFacade

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`CaregiverListPageComponent` (smart, OnPush) is promoted from the design-reference prototype and connected to `CaregiverFacade` signals; it reads `caregivers()`, `listState()`, and `accessDecision.can('acs.caregiver.create')` to drive the list table, loading skeleton, empty state, and "Register caregiver" action visibility (SPEC-02 §1, SPEC-03 §1).

## Approach (execution path)
1. Create `libs/acs/feature-caregivers/src/lib/caregivers.routes.ts` with `/access/caregivers` and `/access/caregivers/new` routes, both lazy via `loadComponent`.
2. Promote the prototype's caregiver-list screen into `CaregiverListPageComponent` (standalone, OnPush).
3. Inject `CaregiverFacade` and `AccessDecisionService`; derive `canRegister = accessDecision.can('acs.caregiver.create')` as a local signal.
4. Call `facade.load()` in `ngOnInit`; wire `listState()` to loading skeleton / empty state / page-error switches.
5. Pass `rows = facade.caregivers()`, `canRegister` to `CaregiverTableComponent` as inputs.
6. Handle `roleEdit` and `deactivate` outputs from the table (emit to facade; role-edit is out of MVP due to G4 — no BE endpoint).
7. No component imports `HttpClient`; no inline role evaluation (carry-forward SPEC-02 §4).
8. All component instances standalone + OnPush.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/caregivers.routes.ts`
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/caregiver-list.page.ts`
- [ ] `canRegister` derived from `AccessDecisionService.can('acs.caregiver.create')` (not hardcoded)
- [ ] `listState()` controls loading skeleton / empty state / page-error template branches
- [ ] `facade.load()` called in `ngOnInit`; not called from template
- [ ] No `HttpClient` import in this component
- [ ] `npx nx test acs-feature-caregivers` PASS
- [ ] `npx nx lint acs-feature-caregivers` PASS

## Acceptance criteria
- [ ] WHILE `listState = 'loading'`, THE SYSTEM SHALL render the list skeleton and SHALL NOT render the empty state
- [ ] WHILE `listState = 'success'` and rows empty, THE SYSTEM SHALL render the empty state
- [ ] WHILE `canRegister = false`, THE SYSTEM SHALL hide the "Register caregiver" action
- [ ] `npx nx build acs-feature-caregivers` PASS

## Dependencies
FE-ACS-007 (CaregiverFacade), FE-ACS-012 (CaregiverTableComponent input contract).

## Tenant-context impact
`CaregiverFacade.load()` fetches data scoped to the current tenant via interceptor; roster is cleared on tenant switch.

## Prioridade
P3
