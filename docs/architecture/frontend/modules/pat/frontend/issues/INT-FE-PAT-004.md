# INT-FE-PAT-004 -- Shared layer integration contract — access-http-base, tenant-context, auth-session, error-model wiring

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
PAT is correctly wired to all shared infrastructure libs (`@neuroassist/shared/access-http-base`, `tenant-context`, `auth-session`, `error-model`) and proves the full interceptor chain (bearer token + X-Correlation-Id + tenant-agnostic requests).

## Approach (execution path)
1. Verify `ACCESS_HTTP_BASE` injection token is provided in the app and resolves to the gateway origin (not `/api/v1`).
2. Verify the interceptor from `@neuroassist/shared/access-http-base` adds the `Authorization: Bearer <token>` header and `X-Correlation-Id` on all PAT requests.
3. Verify PAT never sends `X-Tenant-Id` as an authority header (INV-PAT-1) — scan all three HttpAdapters.
4. Verify `@neuroassist/shared/error-model` `AppError` is the only error shape reaching facades; `ProblemDetail` is consumed by the interceptor, not by adapters directly.
5. Verify `@neuroassist/shared/tenant-context` `switchTo(...)` triggers `patBootstrap.destroy()` which clears PAT signals (FE-PAT-006).
6. Create `libs/pat/data-access/src/lib/pat-data-access.module.ts` if needed to wire shared dependencies within the data-access lib.

## Implementation checklist (by layer/file)
- [ ] Verificar/completar `libs/pat/data-access/src/lib/pat-data-access.module.ts`
- [ ] Verificar que `ACCESS_HTTP_BASE` está provido corretamente na app
- [ ] Scan: nenhum adapter envia `X-Tenant-Id` (INV-PAT-1)
- [ ] `npx nx test pat-data-access` PASS
- [ ] `npx nx lint pat-data-access` PASS

## Acceptance criteria
- [ ] All PAT HTTP requests carry `Authorization: Bearer` and `X-Correlation-Id` (interceptor chain).
- [ ] No PAT adapter sends `X-Tenant-Id` (INV-PAT-1 verified by unit test or scan).
- [ ] `AppError` is the error shape; raw `ProblemDetail` does not escape the interceptor.
- [ ] `npx nx build pat-data-access` PASS.

## Dependencies
FE-PAT-007, FE-PAT-009, FE-PAT-011 (all three adapters exist and are configured by this issue's wiring).
FE-PAT-005 (pat.providers.ts uses ACCESS_HTTP_BASE).

## Tenant-context impact
Central integration point: tenant isolation is enforced via JWT claim (server-side), `X-Tenant-Id` explicitly excluded, `tenant-context.switchTo(...)` invalidates PAT state.

## Prioridade
P4
