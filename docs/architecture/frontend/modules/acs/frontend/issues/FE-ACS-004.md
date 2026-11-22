# FE-ACS-004 -- acs.providers.ts — http adapter default with ACCESS_HTTP_BASE/acs injection token

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`acs.providers.ts` exports `provideAcs()` configured with **http as the default adapter** (carry-forward `scaffold:mock-adapter-default:shell-provider-not-switched-to-http`) and the `ACCESS_HTTP_BASE` injection token pointing to the gateway prefix `/acs` — a providers spec proves the default is `http`, not mock (SPEC-04 §2).

## Approach (execution path)
1. Create `libs/acs/shell-entry/src/lib/acs.providers.ts` exporting `provideAcs(opts?: { adapter?: 'http' | 'mock' })`.
2. Default `adapter = 'http'` because `acs-service` exists (SPEC-04 §2 carry-forward).
3. Provide `ACCESS_HTTP_BASE` injection token with value from environment variable (e.g. `environment.acsBaseUrl` or `'${ACCESS_HTTP_BASE}/acs'`).
4. When `adapter === 'http'`: provide `CaregiverApiService` using `HttpAdapter` based at `${ACCESS_HTTP_BASE}/acs`.
5. When `adapter === 'mock'`: provide `MockAdapter` serving fixtures in the same wire shape.
6. Write a providers spec `acs.providers.spec.ts` asserting that `TestBed.inject(ADAPTER_TOKEN)` returns the HTTP adapter instance by default (not mock).
7. Never leave `providePermitAll()` in the production provider tree (carry-forward `fe-e2e:permit-all-in-prod-config`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/shell-entry/src/lib/acs.providers.ts`
- [ ] implementar `frontend/libs/acs/shell-entry/src/lib/acs.providers.spec.ts`
- [ ] Default adapter is `http` (spec asserts it)
- [ ] `MockAdapter` only provided when `adapter: 'mock'` is passed explicitly
- [ ] `providePermitAll()` is NOT in the production provider tree
- [ ] `npx nx test acs-shell-entry` PASS (providers spec)

## Acceptance criteria
- [ ] `provideAcs()` without arguments installs the HTTP adapter (spec asserts `instanceof HttpAdapter`)
- [ ] `provideAcs({ adapter: 'mock' })` installs the mock adapter
- [ ] `npx nx build acs-shell-entry` PASS

## Dependencies
FE-ACS-006 (CaregiverApiService), FE-ACS-008 (PatientSessionApiService), FE-ACS-010 (TenantAdminApiService) — providers registers the concrete services.

## Tenant-context impact
The `ACCESS_HTTP_BASE` token is configured at bootstrap; the `X-Tenant-Id` header is injected via the interceptor at runtime (never hardcoded per request).

## Prioridade
P1
