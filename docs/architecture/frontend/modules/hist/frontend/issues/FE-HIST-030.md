# FE-HIST-030 -- E2E — hist-access-and-contract.feature (guards, RBAC, adapter default, zero-write port, JWT tenant)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-08 §hist-access-and-contract.feature, e2e/hist-access-and-contract.feature

## Outcome
Playwright spec covers guards + RBAC + adapter contract: session redirect, `canReadHistoryGuard` denial, no-write route, adapter default http, JWT tenant (no `X-Tenant-Id`), zero-write port, operator authority exclusion, `hist.audit-console` off.

## Approach (execution path)
1. Create `frontend/apps/hist-e2e/src/hist-access-and-contract.spec.ts`.
2. Scenarios:
   - Unauthenticated session: navigating to /history redirects to login
   - Session lacking `hist.history.read`: `/history` denied by `canReadHistoryGuard`; timeline NOT rendered
   - Unlinked patient: 403 → no-access state; no history entries shown; existence not disclosed
   - No write route: `GET /history/create` and `GET /history/edit` return 404 (no such route)
   - Adapter default http: mock intercepts network call to `${ACCESS_HTTP_BASE}/hist/patients/.../history` (not `/api/v1`)
   - JWT tenant: request headers contain no `X-Tenant-Id`
   - Unauthorized 401: redirects to login
   - 403 forbidden: shows no-access message, not error banner
   - 400 validation-error: shows inline range error on period control
   - `hist.audit-console` off: no route or surface for `GET /hist/audit` exists
   - Operator authorities absent: no `hist.audit.read` guard triggered for caregiver navigation

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/hist-e2e/src/hist-access-and-contract.spec.ts`
- [ ] Unauthenticated redirect to login
- [ ] hist.history.read denial → timeline not rendered
- [ ] No /history write route
- [ ] Adapter uses ${ACCESS_HTTP_BASE}/hist (not /api/v1)
- [ ] No X-Tenant-Id in request headers
- [ ] hist.audit-console off → no audit route/surface

## Acceptance criteria
- [ ] `npx nx e2e hist-e2e --spec hist-access-and-contract.spec.ts` PASS

## Dependencies
FE-HIST-004 (canReadHistoryGuard), FE-HIST-008 (HistoryHttpAdapter), FE-HIST-001 (contract).

## Tenant-context impact
JWT-tenant assertion confirms LGPD-safe tenant isolation.

## Prioridade
P9
