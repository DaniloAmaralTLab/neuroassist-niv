# FE-ACS-026 -- Playwright stub generation — 4 .feature files with test.fixme() (no vacuous assertions)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
Playwright spec stubs are generated for all 4 ACS e2e feature files; each stub uses `test.fixme()` (or `throw new Error('TODO[FE-ACS-02N]: implement')`) so it **explicitly fails** until implemented — never a vacuous `await expect(page).toHaveURL(/.*/)` under `test.skip` that turns green without testing anything (carry-forward `fe-nx-register-module:e2e-stub:vacuous-assertion-under-skip`; SPEC-08 §3).

## Approach (execution path)
1. Run `python scripts/fe-nx-register-module.py --module acs --app neuroassist-niv-web --root frontend` to register the module in Nx and generate the e2e stubs.
2. Verify each generated spec uses `test.fixme()` — not `test.skip()` with a vacuous assertion.
3. If any generated stub has a vacuous assertion, replace with `test.fixme('TODO[FE-ACS-02N]: implement this scenario')`.
4. Verify no `describe()` block is empty — if a feature has 0 scenarios, do NOT emit a silently-green describe (carry-forward `fe-nx-register-module:e2e-stub:empty-describe-passes-as-green`).
5. Auth seed stubs (`acs-auth.ts`) must seed the role via sessionStorage/refresh endpoint — not via `setExtraHTTPHeaders` Bearer or `localStorage` (carry-forward `fe-e2e:rbac-access-decision:setExtraHTTPHeaders-vs-localStorage`).
6. Each spec resets its own seed to avoid state leak (carry-forward `fe-e2e:shared-seed:state-leak-across-specs`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/acs-e2e/src/register-caregiver.spec.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/provision-patient-session.spec.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/revoke-patient-session.spec.ts`
- [ ] implementar `frontend/apps/acs-e2e/src/tenant-onboarding.spec.ts`
- [ ] All stubs use `test.fixme()` — no `test.skip()` + vacuous assertion
- [ ] No empty `describe()` blocks
- [ ] `npx nx run acs-e2e:lint` PASS

## Acceptance criteria
- [ ] All 4 spec files exist under `frontend/apps/acs-e2e/src/`
- [ ] Each test body contains `test.fixme(...)` (Playwright marks these as expected-to-fail)
- [ ] `npx nx run acs-e2e:lint` PASS
- [ ] Running `npx nx run acs-e2e:e2e` with fixme stubs reports "fixme" — not silently green

## Dependencies
FE-ACS-002 (acs.routes.ts — routes must exist for e2e to navigate to).

## Tenant-context impact
None — these are test stubs.

## Prioridade
P9
