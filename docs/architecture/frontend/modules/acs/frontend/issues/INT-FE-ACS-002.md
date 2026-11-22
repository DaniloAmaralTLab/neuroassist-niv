# INT-FE-ACS-002 -- Connect PatientSessionApiService to acs-service /acs/patient-sessions — provision + revoke (SEC-001 pessimistic)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`PatientSessionApiService` communicates correctly with `acs-service` `/acs/patient-sessions` endpoints; provision body `{ patientId, deviceId }` matches the BE requirement exactly; revoke returns `204` (idempotent); `PatientSessionWire` mirrors the live response shape (SPEC-04, backend-api-cross-link §1, SEC-001).

## Approach (execution path)
1. Bring up `acs-service` + gateway; provision a test patient + device via seed.
2. Exercise `POST /acs/patient-sessions` with `{ patientId, deviceId }` → assert 201 + body matches `PatientSessionWire`.
3. Exercise `DELETE /acs/patient-sessions/{id}` → assert 204.
4. Exercise `DELETE /acs/patient-sessions/{id}` on the same (already-revoked) session → assert 204 (idempotent, api-contract §4.2).
5. Compare `PatientSessionWire` keys against actual response — flag drift.
6. Verify `createdAt` is present in the response (used as `activeSince`); verify no `expiresAt` field exists in the response.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/patient-session.api.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/dto/patient-session.wire.ts`
- [ ] Provision body `{ patientId, deviceId }` verified against real endpoint
- [ ] Revoke is idempotent — second DELETE on revoked session returns 204 (not 404 or 409)
- [ ] `PatientSessionWire.createdAt` present; `expiresAt` absent in wire type
- [ ] `npx nx test acs-data-access` PASS

## Acceptance criteria
- [ ] `POST /acs/patient-sessions` with `{ patientId, deviceId }` returns 201 with body matching `PatientSessionWire`
- [ ] Second `DELETE /acs/patient-sessions/{id}` on a revoked session returns 204
- [ ] `PatientSessionWire` has no `expiresAt` field (sessions never expire, SEC-001)

## Dependencies
FE-ACS-008 (PatientSessionApiService implementation).

## Tenant-context impact
Patient sessions are tenant-scoped; test uses a provisioned test tenant.

## Prioridade
P4
