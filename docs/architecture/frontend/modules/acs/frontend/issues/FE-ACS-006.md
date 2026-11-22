# FE-ACS-006 -- CaregiverApiService — register / deactivate / me / links / link / unlink + CaregiverWire + mappers

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/13 itens

## Outcome
`CaregiverApiService` exposes 6 operations (`register`, `deactivate`, `me`, `links`, `link`, `unlink`) routed through `@neuroassist/shared/access-http-base` at the **gateway prefix `/acs`** (not `/api/v1`), with `CaregiverWire` and `PatientLinkWire` mirroring the BE record shape 1:1 and `toCaregiverRow`/`toPatientLinkVM` mappers converting wire → VM (SPEC-04, SPEC-03 §5).

## Approach (execution path)
1. Define `CaregiverWire` in `dto/caregiver.wire.ts` mirroring `POST /acs/caregivers` response exactly: `{ id, tenantId, username, role: 'caregiver'|'clinic_coordinator', status: 'active'|'deactivated' }`.
2. Define `PatientLinkWire` in `dto/patient-link.wire.ts`: `{ patientId: string }`.
3. Implement `CaregiverApiService` injecting `HttpClient` via `@neuroassist/shared/access-http-base`; base path `${ACCESS_HTTP_BASE}/acs`.
4. `register(body: { username, password, role })` → `POST /acs/caregivers` → `toCaregiverRow(wire)`.
5. `deactivate(id)` → `DELETE /acs/caregivers/{id}`.
6. `me()` → `GET /acs/caregivers/me` → `toCaregiverRow(wire)`.
7. `links(caregiverId)` → `GET /acs/caregivers/{id}/links` → `toPatientLinkVM[]`.
8. `link(caregiverId, patientId)` → `POST /acs/caregivers/{id}/links`.
9. `unlink(caregiverId, patientId)` → `DELETE /acs/caregivers/{id}/links/{patientId}`.
10. Register body must send ALL required fields — do NOT drop a newly-required field (carry-forward `http-adapter:request-body-field-whitelist`).
11. Map errors by `type` slug (not HTTP status) in a `.pipe(catchError(mapAcsError))` per call (SPEC-07 carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`).
12. Write a contract spec (`caregiver.api.spec.ts`) asserting body field completeness using `toEqual` on the full request body.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/caregiver.api.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/dto/caregiver.wire.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/dto/patient-link.wire.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/mappers/caregiver.mapper.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/caregiver.api.spec.ts`
- [ ] Gateway prefix `/acs` used (no `/api/v1` hardcoded — carry-forward `http-adapter:wrong-prefix`)
- [ ] `register` body: `{ username, password, role }` — toEqual asserted in spec
- [ ] Error mapped by `type` slug via `mapAcsError` — not by HTTP status code
- [ ] Unused params removed from mock adapter (carry-forward `build:no-unused-vars`)
- [ ] `npx nx test acs-data-access` PASS (contract spec)
- [ ] `npx nx lint acs-data-access` PASS

## Acceptance criteria
- [ ] `CaregiverApiService.register` sends `POST /acs/caregivers` with body `{ username, password, role }` (spec asserts `toEqual`)
- [ ] `CaregiverApiService.me` returns a `CaregiverRowVM` mapped from `CaregiverWire`
- [ ] Error response with `type: 'username-taken'` maps to `AppError { code: 'username-taken' }` (not 409)
- [ ] `npx nx build acs-data-access` PASS

## Dependencies
FE-ACS-004 (acs.providers.ts — registers this service), INT-FE-ACS-001 (real endpoint contract).

## Tenant-context impact
`X-Tenant-Id` header injected by the shared HTTP interceptor on every request; never hardcoded per call.

## Prioridade
P2
