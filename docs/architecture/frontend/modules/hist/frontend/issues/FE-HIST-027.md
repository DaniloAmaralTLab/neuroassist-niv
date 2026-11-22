# FE-HIST-027 -- Telemetry events — OpenHistory, Refresh, PeriodSwitch, LoadMore via @neuroassist/shared/observability

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-08 (all features), generator-config.yml §e2e

## Outcome
Telemetry events `OpenHistory`, `Refresh`, `PeriodSwitch`, `LoadMore` are emitted via `@neuroassist/shared/observability` at the right call sites. These events are low-noise and do not block any user action.

## Approach (execution path)
1. In `HistoryFacade.load()` (navigation): emit `OpenHistory { patientId, period }`.
2. In `HistoryFacade.refresh()`: emit `Refresh { patientId, period }`.
3. In `HistoryFacade.setPeriod()` (when period changes): emit `PeriodSwitch { from, to }`.
4. In `HistoryFacade.loadMore()`: emit `LoadMore { patientId, cursor, page }`.
5. Use the `ObservabilityService.trackEvent(name, props)` signature from `@neuroassist/shared/observability`.
6. Add unit test confirming each emit call.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-page.component.ts`
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history.facade.ts`
- [ ] `OpenHistory` emitted on load (navigation)
- [ ] `Refresh` emitted on explicit refresh
- [ ] `PeriodSwitch` emitted on period change
- [ ] `LoadMore` emitted on keyset pagination
- [ ] `npx nx test hist-data-access` PASS
- [ ] `npx nx lint hist-data-access` PASS

## Acceptance criteria
- [ ] `npx nx test hist-data-access` PASS — telemetry emit calls verified
- [ ] `npx nx lint hist-data-access` PASS
- [ ] Telemetry events do not block user interactions

## Dependencies
FE-HIST-011 (HistoryFacade), FE-HIST-012 (HistoryPageComponent).

## Tenant-context impact
Nenhum — telemetry events não transportam dados de tenant ou PII.

## Prioridade
P8
