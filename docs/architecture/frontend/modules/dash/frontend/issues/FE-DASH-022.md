# FE-DASH-022 -- Playwright stub generation — 6 .feature files mapped to test.fixme() stubs in apps/dash-e2e (no empty describe/no vacuous green — pitfall fe-nx-register-module:e2e-stub:empty-describe)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
Six Playwright spec stubs are created in `apps/dash-e2e/src/`, one per `.feature` file, each containing `test.fixme()` calls for each scenario — not empty `describe` blocks. Each stub is a runnable but pending test that correctly reports as "fixme/pending" (not silently green) until the scenario is implemented in FE-DASH-023 through FE-DASH-026.

## Approach (execution path)
1. For each of the 6 `.feature` files in `docs/architecture/frontend/modules/dash/frontend/e2e/`, create a corresponding `.spec.ts` file in `apps/dash-e2e/src/`.
2. Each spec file: `import { test } from '@playwright/test'`; one `test.fixme('Scenario: <title>', ...)` per scenario — never an empty `describe(() => {})` (pitfall `fe-nx-register-module:e2e-stub:empty-describe-passes-as-green`).
3. Feature file → spec file mapping:
   - `home-overview-composition.feature` → `home-overview-composition.spec.ts` (12 scenarios)
   - `fail-safe-composite-status.feature` → `fail-safe-composite-status.spec.ts` (7 scenarios + Outline)
   - `detection-lapse-notice.feature` → `detection-lapse-notice.spec.ts` (1 scenario)
   - `emergency-precedence.feature` → `emergency-precedence.spec.ts` (1 scenario)
   - `partial-failure-and-errors.feature` → `partial-failure-and-errors.spec.ts` (5 scenarios)
   - `entry-and-shell-routing.feature` → `entry-and-shell-routing.spec.ts` (5 scenarios)
4. Confirm Nx `dash-e2e` project is registered (or register via `fe-nx-register-module.py` if not done yet).
5. `npx nx run dash-e2e:e2e --list` should report all scenarios as FIXME (skipped), never as passing.

## Implementation checklist (by layer/file)
- [ ] `frontend/apps/dash-e2e/src/home-overview-composition.spec.ts` — 12+ `test.fixme()` stubs
- [ ] `frontend/apps/dash-e2e/src/fail-safe-composite-status.spec.ts` — 7+ stubs
- [ ] `frontend/apps/dash-e2e/src/detection-lapse-notice.spec.ts` — 1 stub
- [ ] `frontend/apps/dash-e2e/src/emergency-precedence.spec.ts` — 1 stub
- [ ] `frontend/apps/dash-e2e/src/partial-failure-and-errors.spec.ts` — 5 stubs
- [ ] `frontend/apps/dash-e2e/src/entry-and-shell-routing.spec.ts` — 5 stubs
- [ ] NO empty `describe(() => {})` in any file (pitfall prevention)
- [ ] `npx nx run dash-e2e:e2e --list` reports all scenarios (no silently empty suites)

## Acceptance criteria
- [ ] 6 spec files created; none has an empty `describe` block
- [ ] `npx nx run dash-e2e:e2e --list` returns non-zero scenario count
- [ ] All scenarios report as FIXME/pending, not passing vacuously

## Dependencies
- FE-DASH-004 (DASH_DESCRIPTOR — shell must route to `/home` for e2e to navigate there)
- Nx `dash-e2e` project must be registered

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§1–§3)
- `docs/architecture/frontend/modules/dash/frontend/e2e/*.feature` (all 6 files)

## Architecture alignment
- Pitfall prevention: `fe-nx-register-module:e2e-stub:empty-describe-passes-as-green` — use `test.fixme()` not empty describe
- Tags Nx: `scope:dash`, `type:e2e`

## Milestone
Wave 9 / E2E

## Labels
type:feature
layer:frontend
scope:dash
priority:P9

## Prioridade
P9
