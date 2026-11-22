# FE-HIST-025 -- Loading skeleton CLS budget — reserved rows, layout-shift compliance (CLS<0.1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-02 §1 (CLS<0.1), SPEC-03 (view states)

## Outcome
The loading skeleton meets CLS<0.1: reserved rows match the approximate height of real event cards, preventing observable layout shift when the timeline loads. Visual spot check passes for all three periods (today/week/month).

## Approach (execution path)
1. Audit the `HistoryListSkeletonComponent` from FE-HIST-015 for layout-shift.
2. Measure: each skeleton row height must match the rendered `HistoryEventRowComponent` height (approximately 72–80px including padding).
3. Adjust reserved row height using CSS `min-height` with the design token for card row height.
4. Confirm that switching from skeleton → list does not trigger a visible jump.
5. Run the CLS test via Playwright (page.evaluate) in FE-HIST-028.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-list-skeleton.component.ts`
- [ ] Skeleton row height matches event card height (CLS<0.1)
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] Playwright CLS measurement: cumulative layout shift < 0.1 on skeleton → list transition
- [ ] `npx nx lint hist-feature-history` PASS

## Dependencies
FE-HIST-015 (HistoryListSkeletonComponent baseline), FE-HIST-028 (Playwright CLS measurement).

## Tenant-context impact
Nenhum.

## Prioridade
P7
