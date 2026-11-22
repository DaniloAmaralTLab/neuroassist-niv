# FE-PAT-018 -- authGuard for all PAT routes (session absent → login redirect, patient-session denial INV-PAT-7)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Outcome
The PAT `authGuard` (a carry-forward of the shared session guard from `@neuroassist/shared/auth-session`) ensures all PAT routes redirect to login on absent/expired session, and denies patient-session tokens that carry no `pat.*` authority (INV-PAT-7).

## Approach (execution path)
1. In `libs/pat/access/src/lib/auth.guard.ts` re-export or extend the shared `authGuard` from `@neuroassist/shared/auth-session` for all PAT routes.
2. On session absent/expired → redirect to shell login route, never render any PAT surface (carry-forward `guard:unauth-redirect:session-absent-must-go-to-login`).
3. A `patient-session` token carries only `conv.*` / `gest.*` authorities; since it satisfies no `pat.*` authority, the shared guard's authority check denies it and redirects to the forbidden route (INV-PAT-7, SPEC-01 §1).
4. Write unit tests: session present (caregiver token) → route allowed; session absent → redirects to login; patient-session token → denied (INV-PAT-7).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/access/src/lib/auth.guard.ts`
- [ ] unit tests (caregiver pass, session absent → login, patient-session denied)
- [ ] `npx nx test pat-access` PASS
- [ ] `npx nx lint pat-access` PASS

## Acceptance criteria
- [ ] Session absent on any PAT route → redirect to login, no PAT surface rendered (SPEC-01 EARS).
- [ ] Patient-session token (conv.*/gest.* only) → route denied, redirect to forbidden route (INV-PAT-7).
- [ ] `npx nx build pat-access` PASS.

## Dependencies
Nenhuma (depends on shared auth-session guard which is a shared lib pre-condition).

## Tenant-context impact
Tenant identity is embedded in the JWT bearer; authGuard does not inspect tenant directly.

## Prioridade
P5
