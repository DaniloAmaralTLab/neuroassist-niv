# FE-DASH-024 -- E2E — fail-safe-composite-status scenarios: loading holds headline + all_clear only all ok+fresh + em-dash KPIs + per-source freshness matrix (Scenario Outline)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
`apps/dash-e2e/src/fail-safe-composite-status.spec.ts` is fully implemented: all 7 scenarios (including the `Scenario Outline` freshness matrix) from `fail-safe-composite-status.feature` pass, covering the fail-safe headline invariants (INV-1, INV-4) and freshness thresholds.

## Approach (execution path)
1. "A loading source holds the headline and never shows all clear": mock one source as `loading` → assert headline is `loading`/skeleton, NOT `all_clear` DOM class/text.
2. "All clear only when every source is ok and fresh": mock all sources `ok`+`fresh` → assert `all_clear` headline visible.
3. "A failed KPI renders an em dash, never zero": mock HIST `error` → assert KPI tile shows `'—'` not `'0'`.
4. "EVNT alarm source fresh within twice the poll interval": mock EVNT `PollingState=live`, `lastPolledAt` within 2×pollInterval → assert source `ok`.
5. "Stale EVNT alarm poll degrades the headline": set `lastPolledAt` > 2×pollInterval → assert `degraded` headline.
6. "EDGE heartbeat older than sixty seconds" (Scenario Outline): parameterised with `source=edge`, `health=stale`, `headline=degraded` → assert degraded; `source=hist`, `health=stale`, `headline=degraded` → assert degraded.
7. "HIST summary older than sixty seconds is stale": mock HIST `stale` → assert `degraded`.

## Implementation checklist (by layer/file)
- [ ] `frontend/apps/dash-e2e/src/fail-safe-composite-status.spec.ts` — all 7 scenarios implemented
- [ ] `loading` → NOT `all_clear` assertion (INV-1 E2E guard)
- [ ] Em-dash assertion: KPI tile text === `'—'` when HIST error
- [ ] Freshness Outline: `edge stale → degraded`, `hist stale → degraded`, `evnt stale → degraded`
- [ ] `npx nx run dash-e2e:e2e` PASS (all 7 scenarios)

## Acceptance criteria
- [ ] 7 scenarios PASS
- [ ] `loading` state does NOT show `all_clear` (INV-1)
- [ ] Em-dash rendered for HIST error (INV-4)

## Dependencies
- FE-DASH-022 (stubs)
- FE-DASH-005 (freshness constants — Outline uses these values)
- FE-DASH-006 (DashboardFacade derivation)
- FE-DASH-010 (KpiRowComponent em-dash)

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/e2e/fail-safe-composite-status.feature`

## Architecture alignment
- INV-1 E2E coverage, INV-4 E2E coverage
- Tags Nx: `scope:dash`, `type:e2e`

## Milestone
Wave 9 / E2E

## Labels
type:e2e
layer:frontend
scope:dash
priority:P9
safety:INV-1,INV-4

## Prioridade
P9
