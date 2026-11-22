# FE-HIST-015 -- HistoryListSkeletonComponent + HistoryEmptyStateComponent — presentational; CLS<0.1 reserved rows

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-02 §1, SPEC-03 (view states: loading, empty), SPEC-07 §2 (SAFETY: loading ≠ empty)

## Outcome
`HistoryListSkeletonComponent` renders reserved rows during loading (CLS<0.1); `HistoryEmptyStateComponent` renders the "No events in this period." message only on a successful read with zero entries. These two states are mutually exclusive and never confused.

## Approach (execution path)
1. Create `HistoryListSkeletonComponent` (standalone + OnPush): renders N reserved-height rows using the design-system skeleton tokens. Rows must match the approximate height of real event cards to prevent layout shift (CLS<0.1).
2. Create `HistoryEmptyStateComponent` (standalone + OnPush): renders "No events in this period." — shown only when `HistoryViewState === 'empty'` (successful read, zero entries).
3. The skeleton is shown for `HistoryViewState === 'loading'`; the empty state for `'empty'`; the error banner for `'error'` — mutually exclusive in `HistoryPageComponent`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-list-skeleton.component.ts`
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-empty-state.component.ts`
- [ ] Skeleton uses reserved height rows (CLS<0.1)
- [ ] Empty state shown ONLY on successful read with zero entries
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS
- [ ] Skeleton is never shown simultaneously with empty state

## Dependencies
FE-HIST-012 (HistoryPageComponent selects the state).

## Tenant-context impact
Nenhum.

## Prioridade
P3
