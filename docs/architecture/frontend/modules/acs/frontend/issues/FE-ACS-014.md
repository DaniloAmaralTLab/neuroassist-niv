# FE-ACS-014 -- feature-patient-sessions routes + PatientSessionsPageComponent connected to PatientSessionFacade

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`PatientSessionsPageComponent` (smart, OnPush) is promoted from the design-reference prototype and connected to `PatientSessionFacade`; it reads `vm()` and `opState()` signals, derives `canProvision` and `canRevoke` from `AccessDecisionService.can(...)`, and routes both `/access/patient-sessions` and `/access/patient-sessions/:patientId` (SPEC-02 §2, SPEC-03 §3).

## Approach (execution path)
1. Create `libs/acs/feature-patient-sessions/src/lib/patient-sessions.routes.ts` defining both paths; both resolved by `PatientSessionsPageComponent`.
2. `PatientSessionsPageComponent`: inject `PatientSessionFacade` and `AccessDecisionService`.
3. `canProvision = computed(() => accessDecision.can('acs.patient-session.provision'))`.
4. `canRevoke = computed(() => accessDecision.can('acs.patient-session.revoke'))`.
5. On route activation, read `patientId` from `ActivatedRoute.snapshot` and call `facade.loadForPatient(patientId)`.
6. Pass `vm()`, `opState()`, `canProvision`, `canRevoke` down to child presentational components.
7. Handle `provision` and `revoke` outputs; delegate to facade; on error display via `ui-feedback`.
8. No role evaluation inline — gating computed from `AccessDecisionService` (carry-forward `guard:stub-permissive`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/patient-sessions.routes.ts`
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/patient-sessions.page.ts`
- [ ] `canProvision` and `canRevoke` derived from `AccessDecisionService.can(...)` (not from facade signals)
- [ ] Route param `patientId` read from `ActivatedRoute.snapshot` and passed to `facade.loadForPatient()`
- [ ] No `HttpClient` or inline role evaluation in this component
- [ ] `npx nx test acs-feature-patient-sessions` PASS
- [ ] `npx nx lint acs-feature-patient-sessions` PASS

## Acceptance criteria
- [ ] WHILE `canRevoke = false`, THE SYSTEM SHALL disable the revoke action on every session row
- [ ] WHILE `canProvision = false`, THE SYSTEM SHALL hide the provision action
- [ ] Route `:patientId` loads sessions for that patient only
- [ ] `npx nx build acs-feature-patient-sessions` PASS

## Dependencies
FE-ACS-009 (PatientSessionFacade), FE-ACS-019 (canManageAccessGuard for route guard).

## Tenant-context impact
Sessions are tenant-scoped via interceptor; facade is cleared on tenant switch.

## Prioridade
P3
