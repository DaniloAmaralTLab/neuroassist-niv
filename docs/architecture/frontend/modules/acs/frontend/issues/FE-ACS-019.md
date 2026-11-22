# FE-ACS-019 -- canManageAccessGuard — AccessDecisionService.can() + no-session→login / no-perm→forbidden redirect

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`canManageAccessGuard` checks the session and the ACS management authorities via `AccessDecisionService`; on absent/expired session it redirects to `/login`; on permission denied (session present but authority absent) it redirects to `/acesso-negado`; it **never** hardcodes `return true` (carry-forward `guard:stub-permissive:hardcoded-return-true-bypasses-access-decision`; SPEC-01).

## Approach (execution path)
1. Create `libs/acs/access/src/lib/can-manage-access.guard.ts` as an Angular functional guard.
2. Inject `AuthSessionService` from `@neuroassist/shared/auth-session` and `AccessDecisionService` from `@neuroassist/shared/access-decision`.
3. If `!authSession.hasSessionToken()`: return `router.parseUrl('/login')` (carry-forward `guard:unauth-redirect:session-absent-must-go-to-login`).
4. If session present but `!accessDecision.can('acs.caregiver.create') && !accessDecision.can('acs.patient-link.link') && ...` (none of the ACS management authorities): return `router.parseUrl('/acesso-negado')`.
5. Otherwise: return `true`.
6. The guard does NOT evaluate roles inline — it consumes `AccessDecisionService` only.
7. Write a spec asserting both redirect paths and the passing path.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/access/src/lib/can-manage-access.guard.ts`
- [ ] implementar `frontend/libs/acs/access/src/lib/can-manage-access.guard.spec.ts`
- [ ] No-session redirects to `/login` (not `/acesso-negado`)
- [ ] No-permission (session present) redirects to `/acesso-negado`
- [ ] Never hardcodes `return true` — always checks `AccessDecisionService`
- [ ] No role evaluation inline — only `AccessDecisionService.can(key)`
- [ ] `npx nx test acs-access` PASS (both redirect paths and pass path)

## Acceptance criteria
- [ ] IF session is absent, THE SYSTEM SHALL redirect to `/login`
- [ ] IF session present but no ACS management authority, THE SYSTEM SHALL redirect to `/acesso-negado`
- [ ] Guard uses `AccessDecisionService.can(...)`, never `return true`
- [ ] `npx nx lint acs-access` PASS

## Dependencies
FE-ACS-001 (MODULE_PERMISSION_MAP provides the authority strings), FE-ACS-002 (acs.routes.ts references this guard).

## Tenant-context impact
`AccessDecisionService` resolves authorities from the active session JWT (tenant-scoped by the auth system).

## Prioridade
P5
