## [FE-EDGE-024] Playwright e2e stubs — 5 feature files for apps/edge-e2e

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
Five Playwright spec files are generated under `apps/edge-e2e/src/`, one per `.feature` file, each with `test.fixme()` stubs for all scenarios — explicitly failing until implemented, with no vacuous `await expect(page).toHaveURL(/.*/)` under `test.skip`.

**Context / Problem statement:**
- SPEC-08 §2 defines 35 Gherkin scenarios across 5 feature files; each becomes a `Scenario:` in a spec.
- Carry-forward `fe_nx_register_module_parses_only_english_gherkin`: stubs must be in English only (all scenarios are already in English).
- Carry-forward `fe-e2e:shared-seed:state-leak-across-specs`: each spec resets its own RBAC/session seed.
- Carry-forward `fe-e2e:rbac-access-decision`: RBAC scenarios seed authority via sessionStorage / refresh endpoint, NOT via `setExtraHTTPHeaders`.
- Stub integrity: `test.fixme()` or `throw new Error('TODO[FE-EDGE-024]: implement')` — never `test.skip` with a vacuous assertion.

**Approach (execution path):**
1. Create `apps/edge-e2e/src/pair-edge-device.spec.ts` with 7 scenario stubs (SPEC-08 §2.pair-edge-device).
2. Create `apps/edge-e2e/src/pair-patient-phone.spec.ts` with 3 scenario stubs.
3. Create `apps/edge-e2e/src/device-status-badge.spec.ts` with 6 scenario stubs.
4. Create `apps/edge-e2e/src/device-lifecycle.spec.ts` with 6 scenario stubs.
5. Create `apps/edge-e2e/src/edge-navigation.spec.ts` with 5 scenario stubs.
6. Each spec uses `test.beforeEach` to reset session seed and `test.fixme()` on each scenario body.
7. Register the `edge-e2e` Nx project if not yet present (`project.json` for Playwright, FE-EDGE-003 / fe-nx-register concerns).

**Non-goals:**
- Do not implement the actual Playwright interactions — stubs only at this stage.
- Do not use `test.skip` with a vacuous assertion.

**Layer(s):**
frontend / e2e — `apps/edge-e2e/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§2, §3)
- `docs/architecture/frontend/modules/edge/frontend/e2e/` (feature files source)

**Architecture alignment:**
- Tag Nx: `scope:edge`, `type:e2e`

**Implementation checklist (by file)**

**e2e project**
- 🔲 `apps/edge-e2e/src/pair-edge-device.spec.ts` (7 stubs)
- 🔲 `apps/edge-e2e/src/pair-patient-phone.spec.ts` (3 stubs)
- 🔲 `apps/edge-e2e/src/device-status-badge.spec.ts` (6 stubs)
- 🔲 `apps/edge-e2e/src/device-lifecycle.spec.ts` (6 stubs)
- 🔲 `apps/edge-e2e/src/edge-navigation.spec.ts` (5 stubs)
- 🔲 `apps/edge-e2e/project.json` (Playwright Nx executor)

**Tests**
- 🔲 `npx nx run edge-e2e:lint` PASS (or `npx nx lint edge-e2e`)

**Milestone:**
Wave 9 / P9 e2e + Hardening

**Labels:**
type:e2e
layer:frontend
scope:edge
priority:P9

**Acceptance criteria:**
- 27 scenario stubs total across 5 files.
- Each stub is `test.fixme()` — not `test.skip` with a vacuous assertion.
- Each spec has `test.beforeEach` resetting session seed.
- `npx nx lint edge-e2e` PASS

**Dependencies:**
- FE-EDGE-003 (edge-e2e Nx project must be registered)
- All P1-P8 issues (stubs cover the implemented scenarios)

**Data impact:**
Nenhum

**API / Contract impact:**
- RBAC stubs seed `edge.device.pair`, `edge.device.unpair`, `edge.device.revoke` authorities via session mechanism

**Testing / Evidence required:**
- `npx nx run edge-e2e:lint` passes; no `test.skip` with vacuous assertions present.

**Risks / Notes:**
- If the `edge-e2e` Nx project is not yet registered (no `project.json`), the stubs exist but won't be runnable via `nx run`. Use `fe-nx-register-module.py` (D-487) to register.
