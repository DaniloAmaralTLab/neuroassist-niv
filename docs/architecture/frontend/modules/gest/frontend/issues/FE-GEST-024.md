# FE-GEST-024 -- stationIdentityGuard — edge.device token validation, never hardcoded return true, 'station unpaired' routing

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`stationIdentityGuard` is a functional `CanActivateFn` that validates the edge.device token via `EdgeIdentityService`; returns `true` only on a valid, non-expired device token; expired/absent device token → redirects to `/station/status` with query `{unpaired:true}`; NEVER returns `true` unconditionally (carry-forward `guard:stub-permissive:hardcoded-return-true`).

## Approach (execution path)
1. `stationIdentityGuard(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree>`.
2. Inject `EdgeIdentityService` (from `libs/edge`).
3. Call `EdgeIdentityService.validateDeviceToken()`: on `{valid:true}` → return `true`; on `{valid:false, reason:'EXPIRED' | 'ABSENT'}` → return `router.createUrlTree(['/station/status'], {queryParams:{unpaired:true}})`.
4. On network error (503, timeout): return `router.createUrlTree(['/station/status'], {queryParams:{error:'identity-unreachable'}})`.
5. Guard registered on BOTH routes in `gest.routes.ts` (`/station/runtime` + `/station/status`).
6. Spec: (a) valid token → `true`; (b) expired token → UrlTree `/station/status?unpaired=true`; (c) absent token → UrlTree `/station/status?unpaired=true`; (d) identity service returns 503 → UrlTree `/station/status?error=identity-unreachable`; (e) return value is NEVER `true` for cases (b–d).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/access/src/lib/station-identity.guard.ts`
- [ ] implementar `frontend/libs/gest/access/src/lib/station-identity.guard.spec.ts`
- [ ] Guard is a `CanActivateFn` (not class-based)
- [ ] All 5 spec scenarios covered (valid / expired / absent / 503 / never-true)
- [ ] Never returns `true` unconditionally — carry-forward `guard:stub-permissive:hardcoded-return-true`
- [ ] Guard registered on BOTH routes in `gest.routes.ts`
- [ ] `npx nx test gest-access` PASS
- [ ] `npx nx build gest-access` PASS

## Acceptance criteria
- [ ] 5 spec scenarios (including never-true for cases b–d) all PASS
- [ ] Guard is functional (not class-based `CanActivate`)
- [ ] `npx nx test gest-access` PASS

## Dependencies
- FE-GEST-002 (gest.routes.ts — guard registered here)
- INT-FE-GEST-001 (edge.device token authorities, ACS-1)

## Tenant-context impact
None — station-level guard; authenticates the physical device, not a tenant session.

## Prioridade
P1
