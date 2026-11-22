# FE-PAT-007 -- PatientHttpAdapter (PATIENT_PORT) — wire types PatientWire + toPatient mapper

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`PatientHttpAdapter` implements `PATIENT_PORT` calling `POST /pat/patients`, `GET /pat/patients`, and `GET /pat/patients/{id}`; `PatientWire` mirrors the BE JSON record 1:1; `toPatient` maps wire → VM without fabricating null fields.

## Approach (execution path)
1. Create `patient.wire.ts` with `PatientWire: { id, tenantId, label, deviceId: string|null, status: 'active'|'inactive', createdBy, createdAt, updatedAt? }` mirroring api-contract §1 (SPEC-04 §3).
2. Create `patient.port.ts` with `PATIENT_PORT` injection token typed to the port interface (register, list, get).
3. Create `patient.mapper.ts` with `toPatient(wire: PatientWire): PatientVM` — carry-forward `fe-facade:fabricated-null-fields`: absent fields modelled explicitly, never invented.
4. Create `patient-http.adapter.ts` using `${ACCESS_HTTP_BASE}/pat/patients` base; `register` sends `{ label, deviceId? }` exactly (carry-forward `http-adapter:request-body-field-whitelist`); bearer token and `X-Correlation-Id` via interceptor; tenant from JWT not from `X-Tenant-Id` (INV-PAT-1).
5. Write unit tests for the mapper and for the adapter (HttpClientTestingModule stubs).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient.wire.ts`
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient.port.ts`
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient.mapper.ts`
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient-http.adapter.ts`
- [ ] unit tests mapper + adapter
- [ ] `npx nx test pat-data-access` PASS
- [ ] `npx nx lint pat-data-access` PASS

## Acceptance criteria
- [ ] `PatientWire` mirrors api-contract §1 exactly — no extra or missing fields.
- [ ] `register()` sends `{ label, deviceId? }` and NOT `tenantId` (tenant from JWT claim, INV-PAT-1).
- [ ] `toPatient` maps `deviceId: null` as explicitly null (never fabricated — carry-forward `fe-facade:fabricated-null-fields`).
- [ ] `npx nx build pat-data-access` PASS.

## Dependencies
FE-PAT-005 (pat.providers.ts registers PATIENT_PORT; adapters must conform to the port interface).

## Tenant-context impact
Tenant is derived from JWT `tenantId` claim server-side; PAT never sends `X-Tenant-Id` as authority (INV-PAT-1).

## Prioridade
P2
