# FE-HIST-016 -- HistoryErrorBannerComponent — degraded banner + stale state + Retry; NEVER render false no-history

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**[SAFETY] SPEC refs:** SPEC-07 §2–4, SPEC-03 §3 (stale), doc 05 §5

## Outcome
**[SAFETY]** `HistoryErrorBannerComponent` renders a **visible degraded banner** with a Retry button when the history read fails; the last known entries are held and marked stale. The component NEVER renders a false "no history" empty state from a failed read.

## Approach (execution path)
1. Create `HistoryErrorBannerComponent` (standalone + OnPush):
   - `@Input() stale: boolean` — when true, shows "We couldn't refresh the history. Showing the last loaded view." (SPEC-07 §2 transport/5xx message).
   - `@Input() error?: AppError` — shows BE `detail` + `correlationId` (never raw HTTP body, SPEC-07 §1 pipeline).
   - `@Output() retry: EventEmitter<void>` — triggers `HistoryFacade.refresh()`.
2. The banner is rendered as an `@if error()` overlay above the stale timeline, NOT replacing the stale entry list.
3. `HistoryPageComponent` condition: banner shown when `state === 'error'`; stale entries remain visible underneath.
4. **403 forbidden** → separate "no access" state (not a failed read banner) — SPEC-07 §2.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-error-banner.component.ts`
- [ ] Banner shown on transport/5xx failure — stale entries still visible
- [ ] 403 forbidden renders a separate no-access state (SPEC-07 §2)
- [ ] Retry button triggers HistoryFacade.refresh()
- [ ] BE `detail` + `correlationId` shown — raw HTTP body NEVER shown
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-history` PASS — test proves that a failed read leaves prior entries visible (stale=true), not empty
- [ ] `npx nx lint hist-feature-history` PASS
- [ ] A failed read NEVER renders the HistoryEmptyStateComponent

## Dependencies
FE-HIST-012 (HistoryPageComponent manages the state), FE-HIST-011 (HistoryFacade stale signal).

## Tenant-context impact
Nenhum.

## Prioridade
P3
