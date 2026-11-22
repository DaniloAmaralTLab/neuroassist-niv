# INT-FE-HIST-004 -- Shell delegated feedback wiring — EVNT feedback port + HistoryFacade.refresh on success (ADR-005, SPEC-06 §3)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

**SPEC refs:** SPEC-06 §3, SPEC-04 §4, SPEC-05 §4, backend-api-cross-link.md §3

## Outcome
The shell wires `HistoryTimelineComponent`'s `markFeedback` output to EVNT's public feedback port (`POST /evnt/events/{eventId}/feedback`, authority `evnt.event.record`). On EVNT success, the shell signals HIST to `HistoryFacade.refresh()`; HIST never patches locally.

## Approach (execution path)
1. In the shell app `AppComponent` (or the HIST route host), subscribe to `HistoryTimelineComponent`'s `markFeedback` output.
2. Call `EvntFeedbackPort.recordFeedback(eventId, verdict)` (EVNT's public port, authority `evnt.event.record`).
3. On EVNT success: call `HistShellIntegrationService.handleMarkFeedback()` → `HistoryFacade.refresh()`.
4. On EVNT failure: surface via EVNT's error path (EVNT SPEC-07); HIST does NOT re-read.
5. HIST module has NO direct EVNT import — the wiring lives in the shell.

## Implementation checklist (by layer/file)
- [ ] Shell app wires markFeedback → EVNT port
- [ ] On EVNT success → HistoryFacade.refresh() called
- [ ] On EVNT failure → HIST does NOT re-read; EVNT's error path surfaces it
- [ ] HIST has no EVNT import (clean separation)
- [ ] `npx nx build neuroassist-niv-web` PASS

## Acceptance criteria
- [ ] E2E (FE-HIST-028): delegated feedback scenario PASS
- [ ] `npx nx build neuroassist-niv-web` PASS (no circular dependency)

## Dependencies
FE-HIST-023 (HistShellIntegrationService), EVNT FE backlog (EVNT feedback port).

## Tenant-context impact
Nenhum — feedback write escoped by eventId JWT.

## Prioridade
P4
