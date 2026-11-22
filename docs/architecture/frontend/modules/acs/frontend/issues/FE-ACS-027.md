# FE-ACS-027 -- E2E — register-caregiver scenarios: register flow / username-taken field error / RBAC hiding / login redirect

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
The 4 register-caregiver e2e scenarios from SPEC-08 §2 are fully implemented in Playwright: (1) register a caregiver with valid credentials, (2) duplicate username surfaces a field error on `username` input (not a toast), (3) session lacking `acs.caregiver.create` hides the Register action, (4) absent session redirects to `/login` (SPEC-07 §2, SPEC-08 §2).

## Approach (execution path)
1. Implement `acs-auth.ts` helper: seeds a session with the desired authority via sessionStorage + refresh endpoint (ARCH-033 pattern — no `localStorage` or Bearer header injection).
2. Scenario 1 (register): login as a user with `acs.caregiver.create` → navigate to `/access/caregivers/new` → fill form → submit → assert new row in list.
3. Scenario 2 (username-taken): submit a form with an existing username → assert field error on `username` input (use `page.getByRole('textbox', { name: /username/i })`) → assert no toast message.
4. Scenario 3 (RBAC hiding): login as a user WITHOUT `acs.caregiver.create` → navigate to `/access/caregivers` → assert "Register caregiver" button is not in the DOM.
5. Scenario 4 (login redirect): navigate to `/access/caregivers/new` without a session → assert redirect to `/login`.
6. Each scenario seeds its own test data (`acs-real-seed.ts`) to avoid state leak.
7. Auth via login form at `/login`, not via `addInitScript` / localStorage (ARCH-033).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/acs-e2e/src/register-caregiver.spec.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/support/acs-auth.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/support/acs-real-seed.ts`
- [ ] Session seeded via `/login` form (not localStorage or Bearer header)
- [ ] Scenario 2: field error on `username` input verified (not a toast)
- [ ] Scenario 3: "Register caregiver" absent from DOM when lacking authority
- [ ] Each scenario has its own seed (no shared state between scenarios)
- [ ] `npx nx run acs-e2e:e2e` PASS (4 scenarios green)

## Acceptance criteria
- [ ] All 4 register-caregiver scenarios pass with real acs-service running
- [ ] Scenario 2: `page.getByRole('alert')` does NOT contain "taken" (no toast); field error appears on `username` input
- [ ] Scenario 4: navigating to `/access/caregivers/new` without session ends at `/login`
- [ ] JUnit XML report generated at `frontend/apps/acs-e2e/junit.xml`

## Dependencies
FE-ACS-013 (RegisterCaregiverPageComponent), FE-ACS-019 (canManageAccessGuard), FE-ACS-023 (error mapper), INT-FE-ACS-001 (real endpoint).

## Tenant-context impact
Tests run against a test tenant provisioned by `acs-real-seed.ts`; each scenario provisions its own caregiver to avoid conflicts.

## Prioridade
P9
