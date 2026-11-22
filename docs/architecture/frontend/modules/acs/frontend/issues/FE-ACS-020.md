# FE-ACS-020 -- opsHostGuard — served-from-host allowlist ACS_OPS_HOST; blocks /ops/tenants off-host

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`opsHostGuard` decides `onAdminHost` by comparing `window.location.origin` against the `ACS_OPS_HOST` injection token (a build-time/environment origin allowlist); off-host it blocks the `/ops/tenants` route entirely and the guard result is used by `AcsShellIntegrationService` to hide the Ops menu entry (SPEC-01, SPEC-05 §4, ADR-011 Option 1).

## Approach (execution path)
1. Create `libs/acs/access/src/lib/ops-host.guard.ts` as an Angular functional guard.
2. Inject `ACS_OPS_HOST` injection token (a list of allowed origins or a single origin string configured at build time/environment).
3. Compute `onAdminHost = ACS_OPS_HOST.includes(window.location.origin)`.
4. If `!onAdminHost`: return `false` (blocks navigation silently — no redirect to login or forbidden; the route is simply unreachable).
5. If `onAdminHost = true`: return `true`.
6. Export `onAdminHost` as a signal or via an injectable service so `AcsShellIntegrationService` can subscribe without re-evaluating.
7. Write a spec covering on-host and off-host scenarios.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/access/src/lib/ops-host.guard.ts`
- [ ] implementar `frontend/libs/acs/access/src/lib/ops-host.guard.spec.ts`
- [ ] `ACS_OPS_HOST` injection token (not hardcoded origin)
- [ ] Off-host: returns `false` (no redirect)
- [ ] `onAdminHost` signal/value accessible to `AcsShellIntegrationService`
- [ ] `npx nx test acs-access` PASS

## Acceptance criteria
- [ ] WHILE browser is not on the admin host, THE SYSTEM SHALL block `/ops/tenants` and SHALL NOT redirect
- [ ] WHEN `opsHostGuard` resolves `onAdminHost = true`, THE SYSTEM SHALL allow the route
- [ ] `ACS_OPS_HOST` is an injection token (not `window.location.origin` hardcoded in the guard)
- [ ] `npx nx lint acs-access` PASS

## Dependencies
FE-ACS-002 (acs.routes.ts — this guard is used on the `/ops/tenants` route), FE-ACS-021 (AcsShellIntegrationService consumes `onAdminHost`).

## Tenant-context impact
`onAdminHost` is a network/host property, not a tenant property; it is consistent across all tenants on the same host.

## Prioridade
P5
