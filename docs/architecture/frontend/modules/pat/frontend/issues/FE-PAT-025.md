# FE-PAT-025 -- Playwright e2e stubs — command-catalog.feature (6 scenarios: load, empty, error, RBAC, login redirect, patient-session denial)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Outcome
`command-catalog.spec.ts` stub for 6 Playwright scenarios from `command-catalog.feature` — explicitly fails until implemented via `test.fixme()`, seeds RBAC via session mechanism, never uses vacuous `toHaveURL(/.*/)` stubs.

## Approach (execution path)
1. Create `apps/pat-e2e/src/command-catalog.spec.ts` with 6 `test()` blocks: load catalog, empty state, page error + Retry, hide "New command" (RBAC), login redirect (session absent), patient-session denial (INV-PAT-7).
2. Each test uses `test.fixme()` or `throw new Error('TODO[FE-PAT-025]: implement')` per SPEC-08 §3 carry-forward — no vacuous `expect(page).toHaveURL(/.*/)` under `test.skip`.
3. RBAC scenarios seed the session authority via `sessionStorage` / refresh endpoint (the mechanism the shell reads), NOT `setExtraHTTPHeaders` (`fe-e2e:rbac-access-decision:setExtraHTTPHeaders-vs-localStorage`).
4. Each spec resets its own seed to avoid state leak (`fe-e2e:shared-seed:state-leak-across-specs`).

## Implementation checklist (by layer/file)
- [ ] implementar `apps/pat-e2e/src/command-catalog.spec.ts` (6 stubs, test.fixme())
- [ ] `npx nx lint pat-e2e` PASS
- [ ] Playwright config references the correct feature file path

## Acceptance criteria
- [ ] 6 test cases present and explicitly marked `test.fixme()` or `throw TODO`.
- [ ] No `test.skip` with a vacuous URL assertion (SPEC-08 §3 carry-forward).
- [ ] RBAC seed uses session mechanism, not HTTP headers.
- [ ] `npx nx lint pat-e2e` PASS.

## Dependencies
FE-PAT-012 (CommandCatalogPageComponent must exist for e2e to target).
FE-PAT-018, FE-PAT-019 (guards tested in these scenarios).

## Tenant-context impact
E2e seeds authenticate as a caregiver token with tenant embedded; patient-session denial scenario seeds a patient-session token (INV-PAT-7).

## Prioridade
P9
