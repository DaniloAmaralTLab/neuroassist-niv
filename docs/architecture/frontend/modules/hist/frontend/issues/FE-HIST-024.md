# FE-HIST-024 -- HistoryWidgetComponent — read-only widget for DASH embedding; same hist.history.read guard; fed from HistoryFacade

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-06 §4, backend-api-cross-link.md §2

## Outcome
`HistoryWidgetComponent` is a slim, read-only history projection that DASH/Home can embed. It is still gated by `hist.history.read`, fed from `HistoryFacade` via `HistShellIntegrationService`, and DASH never queries `hist-service` directly.

## Approach (execution path)
1. Create `frontend/libs/hist/integration/src/lib/history-widget.component.ts` (standalone + OnPush):
   - Injects `HistShellIntegrationService` to read `historySlice` and `summarySlice` signals.
   - `AccessDecisionService.can('hist.history.read')` gates the widget — not shown to sessions without the authority.
   - Renders a compact timeline of recent events (a subset of `HistoryTimelineComponent`, read-only — no `markFeedback` output).
   - Accepts `@Input() maxEntries: number = 5` for slot sizing by DASH.
2. DASH imports `HistoryWidgetComponent` from `@neuroassist/hist/integration`; DASH NEVER calls `HttpClient` for hist directly (SPEC-06 §4).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/integration/src/lib/history-widget.component.ts`
- [ ] Widget gated by `hist.history.read` via AccessDecisionService
- [ ] Widget reads from HistoryFacade slice — DASH does NOT query hist-service directly
- [ ] No markFeedback output (read-only widget)
- [ ] `npx nx test hist-integration` PASS
- [ ] `npx nx lint hist-integration` PASS

## Acceptance criteria
- [ ] `npx nx test hist-integration` PASS
- [ ] `npx nx lint hist-integration` PASS
- [ ] Widget hidden when session lacks `hist.history.read`

## Dependencies
FE-HIST-023 (HistShellIntegrationService), FE-HIST-011 (HistoryFacade), INT-FE-HIST-005 (DASH embedding boundary).

## Tenant-context impact
Nenhum — widget reads same facade; tenant scope JWT-derived.

## Prioridade
P6
