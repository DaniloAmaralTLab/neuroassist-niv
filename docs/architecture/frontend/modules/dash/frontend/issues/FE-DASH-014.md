# FE-DASH-014 -- authGuard wiring for /home — reuse shell's shared authGuard; session-absent redirects to ACS login flow (SPEC-01 §4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`libs/dash/access/src/lib/auth.guard.ts` re-exports (or wires) the shell's shared `authGuard` for use in `DASH_ROUTES`; a request to `/home` without an active caregiver session redirects to the ACS login flow. DASH does not implement its own authentication — it delegates to the shared guard.

## Approach (execution path)
1. Inspect whether the shell already exports a shared `authGuard` from `@neuroassist/shared/access-decision` or `@neuroassist/acs`.
2. If a shared `authGuard` exists: `libs/dash/access/src/lib/auth.guard.ts` simply re-exports it (`export { authGuard } from '@neuroassist/shared/access-decision'`).
3. If the shared guard does not yet exist in an accessible lib: create a minimal `authGuard` in `libs/dash/access` that checks `AuthSessionService.isAuthenticated()` and redirects to `/login` (or the ACS login route) on false. Add a TODO note to consolidate into the shared lib (carry-forward `guard:shared-auth-not-extracted`).
4. The redirect target is the ACS login route: `router.navigate(['/login'])` or the shell's configured login path.
5. Export from `libs/dash/access/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/access/src/lib/auth.guard.ts` created (re-export or thin wrapper)
- [ ] Guard redirects session-absent navigation to ACS login flow
- [ ] `frontend/libs/dash/access/src/index.ts` exports `authGuard`
- [ ] Guard imported in `dash.routes.ts` FE-DASH-002
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] Navigating to `/home` without a session redirects to the ACS login flow, not to a 403 or blank page
- [ ] Guard never hardcodes `return true` (carry-forward `guard:stub-permissive`)
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-002 (DASH_ROUTES uses this guard)
- ACS login route must be registered in the shell (ACS FE-ACS-002/003)

## Tenant-context impact
None — authentication is tenant-agnostic at this layer.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-01-route-map.md` (§4)

## Architecture alignment
- Never hardcoded `return true` (carry-forward `guard:stub-permissive`)
- Shared guard pattern — no duplicate auth logic per module
- Tags Nx: `scope:dash`, `type:util`

## Milestone
Wave 5 / Guards

## Labels
type:feature
layer:frontend
scope:dash
priority:P5

## Prioridade
P5
