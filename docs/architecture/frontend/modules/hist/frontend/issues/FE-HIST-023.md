# FE-HIST-023 -- HistShellIntegrationService — patient context, facade slice, delegated feedback wiring via shell

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-06 §2–4

## Outcome
`HistShellIntegrationService` wires the shell patient context into `HistoryFacade`, exposes the read-only facade slice for DASH embedding, and routes the delegated `markFeedback` write to EVNT's port. No timer, no HttpClient.

## Approach (execution path)
1. Create `frontend/libs/hist/integration/src/lib/hist-shell-integration.service.ts` (injectable at root):
   - **Patient context**: subscribes to the shell's patient-context observable (ACS/DASH concern); on change calls `HistoryFacade.load(newPatientId)`.
   - **Facade slice for DASH**: exposes `readonly historySlice = this.facade.historyPageVm.asReadonly()` and `readonly summarySlice = this.facade.periodSummaryVm.asReadonly()` for `HistoryWidgetComponent` (SPEC-06 §4).
   - **Delegated feedback**: `handleMarkFeedback(entryId, verdict)` — calls the EVNT port's `POST /evnt/events/{eventId}/feedback`; on success calls `HistoryFacade.refresh()`; on failure does NOT re-read (SPEC-07 §2.2). HIST holds NO EVNT dependency — the shell wires this via an injected EVNT port callback.
   - No `setInterval`/`setTimeout`.
2. `destroy()`: release patient-context subscription.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/integration/src/lib/hist-shell-integration.service.ts`
- [ ] `frontend/libs/hist/integration/src/index.ts`
- [ ] Patient context subscription drives HistoryFacade.load()
- [ ] Facade slice exposed for DASH (read-only signals)
- [ ] `handleMarkFeedback` delegates to EVNT port, calls refresh() on success
- [ ] On EVNT failure: does NOT re-read, does NOT update entry locally
- [ ] No timer
- [ ] `npx nx test hist-integration` PASS
- [ ] `npx nx lint hist-integration` PASS

## Acceptance criteria
- [ ] `npx nx test hist-integration` PASS
- [ ] `npx nx lint hist-integration` PASS
- [ ] Service does not import any EVNT implementation directly (shell wires it via callback/port)

## Dependencies
FE-HIST-011 (HistoryFacade), INT-FE-HIST-004 (shell delegated feedback wiring).

## Tenant-context impact
Tenant scope changes are handled via patient-context change → HistoryFacade.load() with new patientId.

## Prioridade
P6
