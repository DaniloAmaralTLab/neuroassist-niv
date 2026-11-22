# FE-HIST-012 -- feature-history lib + HistoryPageComponent — smart, signals, injects HistoryFacade + AccessDecisionService

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-02 §1, SPEC-03 §4 (UI events)

## Outcome
`HistoryPageComponent` (smart, standalone, OnPush) injects `HistoryFacade` and `AccessDecisionService`, reads signals, calls `facade.load()` on navigation, and renders the period-filter, timeline, skeleton/empty/error states and period summary.

## Approach (execution path)
1. Create `frontend/libs/hist/feature-history/src/lib/history.routes.ts` with `FEATURE_HISTORY_ROUTES` (a single route for the HistoryPageComponent, lazily loaded from HIST_ROUTES).
2. Create `frontend/libs/hist/feature-history/src/lib/history-page.component.ts`: standalone + OnPush, imports PeriodFilterTabsComponent, HistoryTimelineComponent, HistoryListSkeletonComponent, HistoryEmptyStateComponent, HistoryErrorBannerComponent, PeriodSummaryCardComponent, EscalationTrailSectionComponent.
3. Inject `HistoryFacade`, `AccessDecisionService`, `HistShellIntegrationService` (patient context).
4. On init: call `facade.load(patientId, 'week')` (prototype default period).
5. Use signals for the template: `loading()`, `empty()`, `error()`, `vm()`, `period()`, `summary()`.
6. Wire `selectPeriod` from PeriodFilterTabsComponent → `facade.setPeriod()`.
7. Wire `markFeedback` from HistoryTimelineComponent → emit upward (the shell wires it to EVNT — HIST writes nothing).
8. `EscalationTrailSectionComponent` shown when `hist.escalation-trail` flag is on.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-page.component.ts`
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history.routes.ts`
- [ ] Component is standalone + OnPush
- [ ] Calls `facade.load()` on navigation — no polling
- [ ] `markFeedback` delegated upward — HIST never writes
- [ ] `EscalationTrailSectionComponent` gated by `hist.escalation-trail` feature flag
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS
- [ ] `npx nx build hist-feature-history` PASS

## Dependencies
FE-HIST-003 (provideHist), FE-HIST-011 (HistoryFacade), FE-HIST-013..017, FE-HIST-018 (feature-trail), FE-HIST-023 (HistShellIntegrationService).

## Tenant-context impact
Nenhum — patientId vem do shell via HistShellIntegrationService.

## Prioridade
P3
