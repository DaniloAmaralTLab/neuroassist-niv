# FE-DASH-015 -- dashGuard — AccessDecisionService-backed; asserts authenticated caregiver + linked patient context; evaluates NO dash.* key; never hardcoded true (guard:stub-permissive)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`libs/dash/access/src/lib/dash.guard.ts` is a DASH-specific `CanActivateFn` guard backed by `AccessDecisionService`; it asserts (1) an authenticated caregiver and (2) a linked patient context from the shell. It evaluates NO `dash.*` authority key (DASH has no backend authority — SPEC-01 §4, SPEC-05 §2). Each embedded panel self-gates on its own authority; the guard's role is to block an unauthenticated or patient-less access to the home overview.

## Approach (execution path)
1. Create `libs/dash/access/src/lib/dash.guard.ts` as a `CanActivateFn`.
2. Inject `AccessDecisionService` and `AuthenticatedCaregiverService` (or equivalent shell context service).
3. Logic:
   - If no caregiver session: redirect to ACS login (should have been caught by `authGuard`, but guard is defensive).
   - If no linked patient in context: redirect to a safe fallback (e.g. `/onboarding` or `/not-found`).
   - Otherwise: return `true` via `AccessDecisionService.can(...)` — but since DASH has no `dash.*` authority, the check is on presence of a valid caregiver+patient context, not on a named authority key.
4. Add a TSDoc comment: "dashGuard evaluates NO dash.* authority — DASH has no backend (ADR-001). It asserts a caregiver+patient context only. Each embedded panel self-gates on its owning authority (SPEC-05 §4)."
5. Never return a hardcoded `true` (carry-forward `guard:stub-permissive`).
6. Export from `libs/dash/access/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/access/src/lib/dash.guard.ts` created as `CanActivateFn`
- [ ] TSDoc: "evaluates NO dash.* authority" with SPEC-01 §4 and ADR-001 references
- [ ] Guard checks caregiver session AND linked patient context
- [ ] No hardcoded `return true` anywhere in this file
- [ ] No `dash.*` authority key string in this file
- [ ] `frontend/libs/dash/access/src/index.ts` exports `dashGuard`
- [ ] Guard imported in `dash.routes.ts` FE-DASH-002
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] Guard source contains no `dash.*` string (grep-verified)
- [ ] No `return true` or `return of(true)` without a check
- [ ] Guard blocks access when no linked patient exists in shell context
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-002 (DASH_ROUTES — uses both authGuard and dashGuard)
- FE-DASH-014 (authGuard — first in `canActivate` chain)

## Tenant-context impact
None — patient context is shell/ACS-scoped by the JWT (INV-6).

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-01-route-map.md` (§4)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-05-tool-contract.md` (§2)

## Architecture alignment
- Never hardcoded `return true` (carry-forward `guard:stub-permissive`)
- No `dash.*` authority key (D-639 / SPEC-05 §2)
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
