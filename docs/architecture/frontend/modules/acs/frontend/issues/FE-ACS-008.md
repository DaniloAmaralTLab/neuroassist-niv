# FE-ACS-008 -- PatientSessionApiService — provision / revoke / get + PatientSessionWire + mapper

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

## Outcome
`PatientSessionApiService` exposes `provision`, `revoke`, and `get` routed through the gateway prefix `/acs/patient-sessions`, with `PatientSessionWire` mirroring the BE record 1:1 and a `toPatientSessionRow` mapper converting wire → `PatientSessionRowVM` (SPEC-04, SPEC-03 §3).

## Approach (execution path)
1. Define `PatientSessionWire` in `dto/patient-session.wire.ts`: `{ id, patientId, deviceId, status: 'active'|'revoked', provisionedBy, revokedBy: string|null, createdAt, revokedAt: string|null }`.
2. `provision(patientId, deviceId)` → `POST /acs/patient-sessions` with body `{ patientId, deviceId }` — both fields required (carry-forward `http-adapter:request-body-field-whitelist`).
3. `revoke(sessionId)` → `DELETE /acs/patient-sessions/{id}` — idempotent; `204` on already-revoked is treated as success (SPEC-07, api-contract §4.2).
4. `get(sessionId)` → `GET /acs/patient-sessions/{id}` → `toPatientSessionRow(wire)`.
5. `toPatientSessionRow`: set `activeSince = wire.createdAt`; expose `revokedAt` and `revokedBy` only when present — no fabricated null fillers for fields that the wire record does not carry.
6. Map errors by `type` slug (`forbidden`, `not-found`); `unauthenticated` triggers redirect (not an inline error).
7. Write contract spec asserting `provision` body equals `{ patientId, deviceId }` exactly.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/patient-session.api.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/dto/patient-session.wire.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/mappers/patient-session.mapper.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/patient-session.api.spec.ts`
- [ ] `provision` body: `{ patientId, deviceId }` — `toEqual` asserted in spec
- [ ] `revoke` treats `204` on already-revoked as success (idempotency, api-contract §4.2)
- [ ] `toPatientSessionRow` sets `activeSince = wire.createdAt`; no `expiresAt` field
- [ ] Error mapped by `type` slug
- [ ] `npx nx test acs-data-access` PASS

## Acceptance criteria
- [ ] `PatientSessionApiService.provision` sends body `{ patientId, deviceId }` (spec asserts `toEqual`)
- [ ] `PatientSessionApiService.revoke` treats `204` on a revoked session as success
- [ ] `PatientSessionRowVM.activeSince` is set from `wire.createdAt`, no countdown field present
- [ ] `npx nx build acs-data-access` PASS

## Dependencies
FE-ACS-004 (acs.providers.ts), INT-FE-ACS-002 (real endpoint contract).

## Tenant-context impact
`X-Tenant-Id` injected via interceptor per request.

## Prioridade
P2
