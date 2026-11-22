# INT-FE-ACS-003 -- Connect TenantAdminApiService to acs-service /acs/ops/tenants — ops-host gating + BE authority validation

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`TenantAdminApiService.onboard` communicates correctly with `POST /acs/ops/tenants`; the endpoint is reachable only when `opsHostGuard` resolves `onAdminHost = true` and the session holds `acs.tenant.onboard`; calling the endpoint from a session without authority returns `403 forbidden` (INV-5, SPEC-05 §2).

## Approach (execution path)
1. Bring up acs-service + gateway on the admin host / simulate admin-host token.
2. Exercise `POST /acs/ops/tenants` with `{ type: 'family', name: 'Test Family' }` using a session with `acs.tenant.onboard` authority → assert 201 and body matches `TenantWire`.
3. Exercise the same endpoint without `acs.tenant.onboard` authority → assert 403 with `type: 'forbidden'` slug.
4. Verify `type` closed set: `'family'` and `'clinic'` accepted; any other value returns 422.
5. `TenantWire` keys verified against live response; update if drift found.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/tenant-admin.api.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/dto/tenant.wire.ts`
- [ ] `POST /acs/ops/tenants` with `{ type, name }` returns 201 (admin session)
- [ ] Without `acs.tenant.onboard` authority → 403 with `type: 'forbidden'`
- [ ] `type` invalid value → 422 from acs-service
- [ ] `npx nx test acs-data-access` PASS

## Acceptance criteria
- [ ] `TenantAdminApiService.onboard` succeeds with `acs.tenant.onboard` authority (201 + TenantWire shape)
- [ ] Without authority: 403 maps to `AppError { code: 'forbidden' }`
- [ ] `type` accepts only `'family'` or `'clinic'`

## Dependencies
FE-ACS-010 (TenantAdminApiService), FE-ACS-020 (opsHostGuard — must resolve true for route to be reachable).

## Tenant-context impact
`POST /acs/ops/tenants` creates a new tenant; the platform-ops session does not operate within a tenant's scope.

## Prioridade
P4
