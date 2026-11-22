## [FE-EDGE-030] e2e stubs — station-detection-liveness.feature + detection scenarios in device-status-badge

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
Playwright stubs register the new SAFETY-GEST-1 scenarios: the whole
`station-detection-liveness.feature` (single sender / StationLivenessPort / ≤30 s cadence / beatNow on
transition / keepalive beat on hidden / token rotation / no sendBeacon / no second sender / dashboard
never beats / mirror detection fields) and the detection scenarios appended to
`device-status-badge.feature` (detecting / connected-not-detecting+reason / offline / absent-unknown /
distinct-from-connectivity). Stubs fail explicitly until implemented.

**Context / Problem statement:**
- SPEC-08 (amended) inventories `station-detection-liveness.feature` and the detection badge scenarios.
- The sender behaviours are station-runtime; some scenarios drive the in-process port rather than the
  dashboard — the stubs assert the sender contract, not a network heartbeat from the dashboard.
- Depends on FE-EDGE-026/027/028/029 for the surfaces/service under test.

**Approach (execution path):**
1) Generate `apps/edge-e2e/src/station-detection-liveness.spec.ts` (9 stubs) + extend
   `device-status-badge.spec.ts` with the 5 detection stubs (incl. the Scenario Outline rows).
2) Each stub is `test.fixme()` or `throw new Error('TODO[FE-EDGE-030]: implement')` — never a vacuous
   `toHaveURL(/.*/)` under `test.skip`.
3) Seed RBAC (`edge.device.read`) via the session mechanism the shell reads (sessionStorage / refresh),
   not an unrelated header; each spec resets its own seed.

**Non-goals:**
- Does NOT implement the assertions (stubs only), matching FE-EDGE-024's stub discipline.

**Layer(s):**
frontend / e2e — `apps/edge-e2e/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§1, §2)
- `docs/architecture/frontend/modules/edge/frontend/e2e/station-detection-liveness.feature`
- `docs/architecture/frontend/modules/edge/frontend/e2e/device-status-badge.feature`

**Architecture alignment:**
- Stub-integrity rule (carry-forward Learning ev=45): stubs fail explicitly
- `fe-e2e:rbac-access-decision` (seed via session, not headers); `fe-e2e:shared-seed` (per-spec reset)
- Tag Nx: `scope:edge`, `type:e2e`

**Implementation checklist (by file)**

**App path**
- 🔲 `apps/edge-e2e/src/station-detection-liveness.spec.ts` (9 `test.fixme()` stubs)
- 🔲 `apps/edge-e2e/src/device-status-badge.spec.ts` (+5 detection stubs, incl. Outline Examples)

**Tests**
- 🔲 `nx lint edge-e2e` PASS
- 🔲 `nx e2e edge-e2e --list` shows the new stubs registered (not silently skipped)

**Milestone:**
Wave 9 / e2e + hardening (SAFETY-GEST-1 increment)

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P9

**Acceptance criteria:**
- `npx nx lint edge-e2e` PASS
- 14 new stubs registered in `test.fixme()` form (9 + 5)
- No vacuous `toHaveURL(/.*/)` under `test.skip`

**Dependencies:**
- FE-EDGE-026, FE-EDGE-027, FE-EDGE-028, FE-EDGE-029
- FE-EDGE-024 (base e2e stubs)

**Data impact:**
- Nenhum

**API / Contract impact:**
- None (stubs reference the SPEC-04/06 contracts under test).

**Testing / Evidence required:**
- `nx e2e edge-e2e --list` output showing the registered stubs.

**Risks / Notes:**
- The station-sender scenarios need a harness that can drive the in-process `StationLivenessPort`; where a true browser e2e cannot reach it, the stub documents an integration-test boundary rather than faking a pass.
