# INT-FE-PAT-001 -- pat-service HTTP integration — PatientHttpAdapter live contract (register, list, get against /pat/patients)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`PatientHttpAdapter` is verified against the live `pat-service` for all 3 patient endpoints: `POST /pat/patients` (register), `GET /pat/patients` (list), `GET /pat/patients/{id}` (get).

## Approach (execution path)
1. Write `patient-http.adapter.spec.ts` with HttpClientTestingModule stubs covering: `register({ label })` → `POST /pat/patients` with correct body and 201 response mapped to PatientVM; `list()` → `GET /pat/patients` returns `PatientVM[]`; `get(id)` → `GET /pat/patients/{id}`.
2. Verify base URL is `${ACCESS_HTTP_BASE}/pat/patients`, not `/api/v1` (SPEC-04 §1 carry-forward).
3. Verify `register()` body does NOT send `tenantId` (derived server-side from JWT claim, INV-PAT-1).
4. Verify error normalization: `ProblemDetail` responses are mapped to `AppError` by the interceptor pipeline, not by raw HTTP status (SPEC-07 §1).
5. Integration smoke test: with running `pat-service` (or WireMock stub) confirm 201 response on `POST /pat/patients` with `{ label: 'Test Patient' }`.

## Implementation checklist (by layer/file)
- [ ] implementar/completar `libs/pat/data-access/src/lib/patient/patient-http.adapter.spec.ts`
- [ ] `npx nx test pat-data-access` PASS
- [ ] Integration smoke (opcional, com WireMock/pat-service): `POST /pat/patients` → 201

## Acceptance criteria
- [ ] Adapter sends no `tenantId` in register request body (INV-PAT-1).
- [ ] Base URL is `${ACCESS_HTTP_BASE}/pat/patients` (not `/api/v1`).
- [ ] Error responses are mapped via `AppError.code` (type slug), not HTTP status.
- [ ] `npx nx test pat-data-access` PASS.

## Dependencies
FE-PAT-007 (PatientHttpAdapter implementation).
INT-FE-PAT-004 (shared layer wiring — interceptor adds bearer token and X-Correlation-Id).

## Tenant-context impact
Multi-tenant: patients are tenant-scoped by the server via the JWT `tenantId` claim; no cross-tenant patient is returned (server enforces, 404 on mismatch).

## Prioridade
P4
