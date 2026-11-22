# FE-HIST-026 -- Error boundary audit — 403 forbidden vs transport failure vs empty; never false all-clear

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**[SAFETY] SPEC refs:** SPEC-07 §2–3, SPEC-03 §3

## Outcome
**[SAFETY]** Error boundary audit confirms: 403 forbidden → "no access" state only; transport/5xx → degraded banner + stale timeline; empty → only after a successful zero-entry read. No path through the component renders a false all-clear.

## Approach (execution path)
1. Audit `HistoryPageComponent` condition branches:
   - `state === 'loading'` → skeleton (never empty)
   - `state === 'empty'` → `HistoryEmptyStateComponent` (only on successful read + zero entries)
   - `state === 'error'` → `HistoryErrorBannerComponent` above stale timeline (never empty state)
   - `state === 'forbidden'` → distinct "no access" message (from 403, SPEC-07 §2)
2. Add a unit test covering each transition: mock → error → verify empty state NOT rendered.
3. Add a unit test: mock → success with zero entries → verify empty state IS rendered.
4. Confirm `HistoryErrorBannerComponent` Retry button calls `HistoryFacade.refresh()`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-page.component.ts`
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-error-banner.component.ts`
- [ ] Unit test: failed read → stale banner, NOT empty state
- [ ] Unit test: success with zero entries → empty state, NOT banner
- [ ] Unit test: 403 → no-access state, NOT stale banner
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-history` PASS — all three state-transition unit tests pass
- [ ] `npx nx lint hist-feature-history` PASS
- [ ] E2E (FE-HIST-028, hist-access-and-contract.feature) confirms 403 → no-access, 5xx → degraded banner

## Dependencies
FE-HIST-015 (empty state), FE-HIST-016 (error banner), FE-HIST-028 (E2E coverage).

## Tenant-context impact
Nenhum.

## Prioridade
P7
