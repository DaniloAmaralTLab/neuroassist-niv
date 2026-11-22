# INT-FE-HIST-005 -- DASH HistoryWidgetComponent embedding — HistShellIntegrationService boundary confirmation (SPEC-06 §4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

**SPEC refs:** SPEC-06 §4, backend-api-cross-link.md §2

## Outcome
The HIST↔DASH embedding boundary is confirmed: DASH embeds `HistoryWidgetComponent` via `HistShellIntegrationService`, never querying `hist-service` directly. Cross-patient aggregation stays DASH-owned. Boundary confirmed with the DASH vision + BE at M1.5.

## Approach (execution path)
1. DASH vision review confirms DASH will embed `HistoryWidgetComponent` from `@neuroassist/hist/integration`.
2. DASH FE backlog issues reference `HistShellIntegrationService.historySlice` for embedding.
3. DASH does NOT add `hist-service` endpoints to its own adapter — it consumes the HIST-exported slice only.
4. If DASH needs cross-patient aggregation, it stays in a DASH-owned widget (never pushed into HIST).
5. Confirm at DASH M1.5 review (revisable, decision recorded in `backend-api-cross-link.md` §2).

## Implementation checklist (by layer/file)
- [ ] DASH FE backlog references HistShellIntegrationService for embedding (not direct hist-service call)
- [ ] HIST↔DASH boundary decision confirmed at M1.5
- [ ] No hist-service call in DASH adapter

## Acceptance criteria
- [ ] DASH embedding integration test: `HistoryWidgetComponent` renders in DASH slot under `hist.history.read`
- [ ] DASH adapter contains no call to `/hist/patients/...`

## Dependencies
FE-HIST-024 (HistoryWidgetComponent), DASH FE backlog.

## Tenant-context impact
Nenhum — widget reads same facade; tenant JWT-derived.

## Prioridade
P6
