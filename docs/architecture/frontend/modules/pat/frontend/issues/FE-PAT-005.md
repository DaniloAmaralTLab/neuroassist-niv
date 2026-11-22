# FE-PAT-005 -- pat.providers.ts — HTTP adapter default for pat-service (carry-forward mock-adapter-default)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`pat.providers.ts` defaults all three PAT adapters to HTTP (not mock), because `pat-service` exists; a providers spec proves `PATIENT_PORT`, `COMMAND_PORT`, and `GESTURE_TYPE_PORT` resolve to their HTTP adapters by default (carry-forward `scaffold:mock-adapter-default`, ev=7).

## Approach (execution path)
1. Create `libs/pat/src/lib/pat.providers.ts` exporting `providePat(options?: { adapter: 'http' | 'mock' })`.
2. Default `options.adapter` to `'http'` — `pat-service` exists (SPEC-04 §2 carry-forward).
3. For `'http'`: provide `PATIENT_PORT` → `PatientHttpAdapter`, `COMMAND_PORT` → `CommandHttpAdapter`, `GESTURE_TYPE_PORT` → `GestureTypeHttpAdapter`.
4. For `'mock'`: provide mock adapters (fixtures in same wire shape via same mappers).
5. Each HttpAdapter injects `ACCESS_HTTP_BASE` and constructs its URL as `${ACCESS_HTTP_BASE}/pat` — not `/api/v1` (SPEC-04 §1 carry-forward `http-adapter:wrong-prefix`).
6. Write a providers unit test (`pat.providers.spec.ts`) asserting default resolves to HTTP adapter.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/src/lib/pat.providers.ts`
- [ ] unit test `libs/pat/src/lib/pat.providers.spec.ts` (default = http)
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient-http.adapter.ts`
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient-mock.adapter.ts`
- [ ] implementar `libs/pat/data-access/src/lib/command/command-http.adapter.ts`
- [ ] implementar `libs/pat/data-access/src/lib/command/command-mock.adapter.ts`
- [ ] implementar `libs/pat/data-access/src/lib/gesture-type/gesture-type-http.adapter.ts`
- [ ] implementar `libs/pat/data-access/src/lib/gesture-type/gesture-type-mock.adapter.ts`
- [ ] `npx nx test pat` PASS (providers spec)
- [ ] `npx nx lint pat` PASS

## Acceptance criteria
- [ ] `providePat()` with no args resolves `PATIENT_PORT`, `COMMAND_PORT`, `GESTURE_TYPE_PORT` to HTTP adapters (spec must assert this explicitly — not mock by default).
- [ ] All HTTP adapters use `${ACCESS_HTTP_BASE}/pat` as base, not `/api/v1`.
- [ ] Mock adapters serve fixtures in the same `*Wire` shape through the same mapper functions as the HTTP adapters.
- [ ] `npx nx build pat` PASS.

## Dependencies
FE-PAT-007, FE-PAT-009, FE-PAT-011 (adapter implementations must exist before providers can register them — these may be developed in parallel with this issue if stubs are acceptable).

## Tenant-context impact
Nenhum (tenant is derived from JWT claim; no provider-level branching per tenant).

## Prioridade
P1
