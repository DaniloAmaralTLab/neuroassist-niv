# INT-FE-ACS-001 -- Connect CaregiverApiService to acs-service /acs/caregivers — verify gateway prefix / wire shape / X-Tenant-Id

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`CaregiverApiService` communicates correctly with the live `acs-service` endpoints: gateway prefix `/acs/caregivers` resolves through `neuroassist-niv-api-gateway`; `CaregiverWire` mirrors the actual BE response shape; `X-Tenant-Id` header is present on every call; a contract spec exercises real responses against the wire type (SPEC-04, backend-api-cross-link §1).

## Approach (execution path)
1. Bring up `acs-service` + `neuroassist-niv-api-gateway` via docker-compose (dev profile).
2. Run a contract smoke against `POST /acs/caregivers`, `DELETE /acs/caregivers/{id}`, `GET /acs/caregivers/me`, `GET /acs/caregivers/{id}/links` using the actual service.
3. Compare the response JSON keys against `CaregiverWire` — flag any drift (carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`).
4. Verify `X-Tenant-Id` header appears on every request (check via gateway access log or test interceptor spy).
5. Verify the proxy config routes `/acs/*` to the correct service port (carry-forward `http-client:wrong-target-service`).
6. If drift found: update `CaregiverWire` and `toCaregiverRow` mapper; re-run FE-ACS-006 unit tests.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/caregiver.api.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/dto/caregiver.wire.ts`
- [ ] `CaregiverWire` keys match live acs-service response exactly
- [ ] `X-Tenant-Id` header present on every request (verified via interceptor or gateway log)
- [ ] Gateway prefix `/acs/caregivers` resolves (not `/api/v1/caregivers`)
- [ ] `proxy.conf.json` routes `/acs/*` to correct port
- [ ] `npx nx test acs-data-access` PASS (contract spec with real shape)

## Acceptance criteria
- [ ] `GET /acs/caregivers/me` response matches `CaregiverWire` shape exactly (no extra or missing keys)
- [ ] `POST /acs/caregivers` response `201` and body matches `CaregiverWire`
- [ ] `X-Tenant-Id` present in all requests

## Dependencies
FE-ACS-006 (CaregiverApiService implementation).

## Tenant-context impact
All acs-service calls are tenant-scoped; test uses a provisioned test tenant.

## Prioridade
P4
