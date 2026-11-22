# FE-ACS-009 -- PatientSessionFacade — vm() / opState() signals; pessimistic provision/revoke (SEC-001)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`PatientSessionFacade` exposes `vm()` (a `PatientSessionsVM` signal) and `opState()` signals; `provision` and `revoke` are **pessimistic by default** — the active/revoked row state changes only after the server confirms — enforcing SEC-001 (revocation reliably immediate and irreversible) (SPEC-03 §3, SPEC-04 §4).

## Approach (execution path)
1. Create `PatientSessionFacade` as an Angular service.
2. Private `WritableSignal<PatientSessionsVM>` exposed as `vm()` readonly.
3. Private `WritableSignal<OpState>` exposed as `opState()` readonly.
4. `loadForPatient(patientId)`: fetch `GET /acs/patient-sessions/{id}` for each session in the patient's list; set `vm().patient` from patient context.
5. `provision(patientId, deviceId)`: set `opState = 'provisioning'` → `api.provision(patientId, deviceId)` → on 201 prepend row to `vm().sessions` → set `opState = 'idle'`; on error set `opState = 'error'`.
6. `revoke(sessionId)`: set `opState = 'revoking'` → `api.revoke(sessionId)` → on 204 mark row `revoked` in signal → set `opState = 'idle'`; on error restore prior state + set `opState = 'error'` (pessimistic default per SEC-001).
7. Optimistic revoke is opt-in ONLY (mark `revoked` on click, reconcile, rollback on error) — but default MUST be pessimistic.
8. `canProvision` and `canRevoke` are derived from `AccessDecisionService.can(...)` — NOT stored in the facade signal; computed in the page component.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/patient-session.facade.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/patient-session.facade.spec.ts`
- [ ] `provision` is pessimistic: row appears in `vm().sessions` only after server `201`
- [ ] `revoke` default is pessimistic: row marked `revoked` only after server `204`
- [ ] `vm()` has no `expiresAt` field on session rows (carry-forward SPEC-03)
- [ ] Spec stubs typed as `Pick<PatientSessionFacade, ...>`
- [ ] `npx nx test acs-data-access` PASS

## Acceptance criteria
- [ ] WHILE `opState = 'provisioning'`, THE SYSTEM SHALL NOT show the new session row
- [ ] WHEN revoke returns `204`, THE SYSTEM SHALL mark the row `revoked` with `revokedAt` and `revokedBy`
- [ ] `vm().sessions[n].activeSince` is set; no `expiresAt` exists on the VM type
- [ ] `npx nx lint acs-data-access` PASS

## Dependencies
FE-ACS-008 (PatientSessionApiService).

## Tenant-context impact
Facade is cleared on `acsBootstrap.destroy()`. Patient sessions are tenant-scoped via `X-Tenant-Id`.

## Prioridade
P2
