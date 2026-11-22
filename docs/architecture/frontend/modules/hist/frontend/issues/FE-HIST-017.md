# FE-HIST-017 -- PeriodSummaryCardComponent — presentational; scope label 'period'|'loaded' (G-HIST-4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-03 §3, SPEC-02 §1, backend-api-cross-link.md §4 (G-HIST-4)

## Outcome
`PeriodSummaryCardComponent` is extracted to its own file (see FE-HIST-013 for `PeriodFilterTabsComponent`). This issue covers the final polish of the period summary and confirmation that the scope label is rendered correctly when the BE first-page summary is present vs. absent.

## Approach (execution path)
1. Confirm `PeriodSummaryCardComponent` created in FE-HIST-013 displays the scope label:
   - When `summaryScope === 'period'`: label "Total in period" (whole-period BE summary, G-HIST-4 CLOSED).
   - When `summaryScope === 'loaded'`: label "In loaded entries" (paginated window fallback).
2. Prototype KPI cards mapped: eventsInPeriod → "Events in period", confirmed → "Confirmed", markedReal → "Marked real", falsePositives → "False positives", notReviewed → "Not yet reviewed".
3. Prototype `confirmedTone` logic: if all events confirmed → 'up' tone; else 'warn' tone.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/period-summary-card.component.ts`
- [ ] Scope label 'period' → "Total in period"; 'loaded' → "In loaded entries"
- [ ] KPI fields: eventsInPeriod, confirmed, markedReal, falsePositives, notReviewed
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-history` PASS — scope label renders correctly for 'period' and 'loaded'
- [ ] `npx nx lint hist-feature-history` PASS

## Dependencies
FE-HIST-013 (also creates this component; this issue polishes).

## Tenant-context impact
Nenhum.

## Prioridade
P3
