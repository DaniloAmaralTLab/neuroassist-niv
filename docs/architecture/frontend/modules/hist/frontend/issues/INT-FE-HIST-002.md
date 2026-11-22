# INT-FE-HIST-002 -- EVNT audit payload amendment — commandLabel field on EventGenerated (G-HIST-1 upstream dependency)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

**SPEC refs:** backend-api-cross-link.md §4 G-HIST-1, SPEC-03 §2 (commandLabel)

## Outcome
EVNT amends its `EventGenerated` audit payload to include `commandLabel` (the family's free-text word, e.g. "Water") and `commandId`/`urgency`. When the field is absent (pre-amendment EVNT), the FE falls back to `entry.title` — NEVER fabricates.

## Approach (execution path)
1. File an amendment request against EVNT BE: `EventGenerated` audit envelope must include `commandLabel`, `commandId`, `urgency` from the matched `Command` record.
2. Update EVNT `EscalationAttempted` audit envelope with `maskedTarget` (backend-masks before writing to HIST; raw `channel_target` NOT written to audit).
3. Confirm in `HistoryEntryWire` that `commandLabel` is optional (HIST already handles absence with graceful fallback, G-HIST-1).
4. Run the FE `HistoryMockAdapter` fixture with `commandLabel` present AND absent and verify both render correctly.

## Implementation checklist (by layer/file)
- [ ] EVNT BE amendment: EventGenerated payload includes commandLabel, commandId, urgency
- [ ] EVNT BE amendment: EscalationAttempted payload includes maskedTarget (server-side masked)
- [ ] FE fixture test: commandLabel absent → entry.title shown (no fabrication)
- [ ] FE fixture test: commandLabel present → commandLabel shown in quotes

## Acceptance criteria
- [ ] FE `HistoryMockAdapter` fixture tests (FE-HIST-009) PASS for both commandLabel present and absent
- [ ] EVNT BE amendment merged and deployed to dev environment

## Dependencies
EVNT BE backlog (EVNT amendment issue), FE-HIST-009 (HistoryMockAdapter), FE-HIST-010 (HistoryEntryWire).

## Tenant-context impact
Nenhum.

## Prioridade
P4
