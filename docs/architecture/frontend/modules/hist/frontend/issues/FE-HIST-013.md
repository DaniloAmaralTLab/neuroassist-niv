# FE-HIST-013 -- PeriodFilterTabsComponent — presentational period selector (today/week/month)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-02 §1, SPEC-03 §3–4

## Outcome
`PeriodFilterTabsComponent` renders the today/week/month tab bar (prototype `FilterTabs`; 'month' replaces prototype 'mes'). `PeriodSummaryCardComponent` renders the period summary with the scope label ('period' = whole-period BE summary; 'loaded' = paginated-window fallback).

## Approach (execution path)
1. Create `PeriodFilterTabsComponent` (standalone + OnPush):
   - `@Input() period: PeriodFilter`; `@Output() selectPeriod: EventEmitter<PeriodFilter>`
   - Three buttons: 'today' | 'week' | 'month' — renders active state from `period`.
   - 'month' replaces prototype 'mes' (SPEC-03 §3, mapping note).
2. Create `PeriodSummaryCardComponent` (standalone + OnPush):
   - `@Input() summary: PeriodSummaryVM`; `@Input() summaryScope: 'period'|'loaded'`
   - Renders eventsInPeriod, confirmed, markedReal, falsePositives, notReviewed
   - Shows scope label: 'period' = "Total in period"; 'loaded' = "In loaded entries" (G-HIST-4 — truthful label when paginated).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/period-filter-tabs.component.ts`
- [ ] `frontend/libs/hist/feature-history/src/lib/period-summary-card.component.ts`
- [ ] PeriodFilterTabsComponent uses 'month' not 'mes'
- [ ] PeriodSummaryCardComponent renders summaryScope label truthfully ('period'|'loaded')
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS
- [ ] Period tab renders 'Today', 'Week', 'Month' (not 'Mes')
- [ ] Summary scope 'loaded' shows a distinct label from 'period'

## Dependencies
FE-HIST-012 (HistoryPageComponent that hosts these).

## Tenant-context impact
Nenhum.

## Prioridade
P3
