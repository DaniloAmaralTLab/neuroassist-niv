# INT-FE-ACS-005 -- Auth-session integration — authGuard + shared/auth-session JWT flow; session-absent redirects to /login

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
The shared `authGuard` from `@neuroassist/shared/auth-session` correctly intercepts all ACS routes when the session is absent or expired and redirects to `/login`; the refresh endpoint flow works under ARCH-033 (in-memory access token + sessionStorage refresh); no ACS component receives a JWT from localStorage (SPEC-01, ARCH-033).

## Approach (execution path)
1. Bring up the full app with `acs-service` + `neuroassist-niv-api-gateway`.
2. Navigate to `/access/caregivers` without a session → assert redirect to `/login`.
3. Navigate to `/access/caregivers/new` with an expired access token → assert the app triggers the refresh endpoint → resumes navigation after refresh.
4. Verify the ACS HTTP interceptor never reads from `localStorage` (ARCH-033: access token is in-memory only).
5. Verify that `acs-auth.ts` e2e helper seeds via `sessionStorage[refresh]` + `page.route` for `/api/acs/auth/refresh` (not `addInitScript` with localStorage).
6. Verify no `providePermitAll()` in `app.config.ts` (carry-forward `fe-e2e:permit-all-in-prod-config`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/access/src/lib/can-manage-access.guard.ts`
- [ ] `authGuard` imported from `@neuroassist/shared/auth-session` (not custom)
- [ ] Absent session → redirect to `/login` (confirmed with live app)
- [ ] Refresh flow resumes ACS navigation after token refresh
- [ ] No `providePermitAll()` in production `app.config.ts`
- [ ] `npx nx run acs-e2e:e2e` PASS (login-redirect scenario from FE-ACS-027)

## Acceptance criteria
- [ ] Navigating to any ACS route without a session redirects to `/login`
- [ ] After session refresh, ACS navigation resumes normally
- [ ] `localStorage` does not contain any JWT at any point in the ACS auth flow

## Dependencies
FE-ACS-019 (canManageAccessGuard — depends on authGuard from shared), FE-ACS-026 (Playwright stubs reference login flow), FE-ACS-027 (register-caregiver e2e login-redirect scenario).

## Tenant-context impact
JWT is tenant-scoped; the auth flow resolves the tenant from the JWT claim on login.

## Prioridade
P4
