# FE-ACS-025 -- Telemetry — forward provision / revoke / register events to @neuroassist/shared/observability

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`AcsShellIntegrationService` forwards three ACS UI action events (`caregiverRegistered`, `patientSessionProvisioned`, `patientSessionRevoked`) to `@neuroassist/shared/observability` so the HIST module can consume them downstream — no `console.log` calls remain in any ACS component (SPEC-06 §2, SPEC-08).

## Approach (execution path)
1. In `AcsShellIntegrationService`, after facade signals emit a successful `register`, `provision`, or `revoke`, call the observability service with the relevant payload.
2. `caregiverRegistered(caregiverId: string)`: emit after `CaregiverFacade.submitState()` transitions from `'submitting'` to `'editing'`.
3. `patientSessionProvisioned(sessionId: string, patientId: string)`: emit after `PatientSessionFacade.opState()` transitions from `'provisioning'` to `'idle'`.
4. `patientSessionRevoked(sessionId: string)`: emit after `PatientSessionFacade.opState()` transitions from `'revoking'` to `'idle'`.
5. Use `effect()` to react to signal transitions — no manual subscription with `subscribe()`.
6. Remove any `console.log` calls from ACS feature components (replace with observability or silent).
7. Write a spec verifying that `ObservabilityService` is called once per event (using a spy/stub).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/integration/src/lib/acs-shell-integration.service.ts`
- [ ] `caregiverRegistered`, `patientSessionProvisioned`, `patientSessionRevoked` forwarded on success
- [ ] No `console.log` in any ACS feature or data-access file
- [ ] `effect()` used to react to facade signal transitions (no manual `subscribe`)
- [ ] Spec asserts `ObservabilityService` called once per action
- [ ] `npx nx test acs-integration` PASS

## Acceptance criteria
- [ ] WHEN provision completes, THE SYSTEM SHALL call `ObservabilityService.patientSessionProvisioned(sessionId)` and SHALL NOT call `console.log`
- [ ] WHEN register completes, THE SYSTEM SHALL call `ObservabilityService.caregiverRegistered(caregiverId)`
- [ ] `npx nx lint acs-integration` PASS

## Dependencies
FE-ACS-021 (AcsShellIntegrationService base), FE-ACS-007 (CaregiverFacade signals), FE-ACS-009 (PatientSessionFacade signals).

## Tenant-context impact
Events are tenant-scoped by the session JWT; observability service propagates tenantId from the session.

## Prioridade
P8
