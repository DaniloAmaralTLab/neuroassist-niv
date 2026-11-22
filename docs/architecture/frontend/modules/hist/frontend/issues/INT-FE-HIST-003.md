# INT-FE-HIST-003 -- EVNT audit payload amendment — maskedTarget field on EscalationAttempted (G-HIST-3 upstream dependency)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

**SPEC refs:** backend-api-cross-link.md §4 G-HIST-3, SPEC-03 §2 (maskedTarget)

## Outcome
EVNT `EscalationAttempted` audit payload includes `maskedTarget` (already masked BE-side: e.g. "+1 *** *** 4567"). The FE renders it verbatim and NEVER reconstructs the raw target. `channel` is structured (web_push|sms|voice).

## Approach (execution path)
1. This issue tracks the same EVNT amendment as INT-FE-HIST-002 for the `maskedTarget` / `channel` fields.
2. EVNT BE: before writing `EscalationAttempted` to the audit sink, mask `channel_target` (raw value not stored); include `maskedTarget` (masked string) and `channel` (enum) in the audit payload.
3. FE verification: `EscalationRowComponent` (FE-HIST-022) renders `maskedTarget` verbatim — test asserts the displayed value equals the fixture `maskedTarget` field without modification.

## Implementation checklist (by layer/file)
- [ ] EVNT BE amendment: EscalationAttempted includes maskedTarget + channel in audit payload
- [ ] FE EscalationRowComponent test: rendered maskedTarget === wire.maskedTarget (verbatim)
- [ ] No raw channel_target stored in HIST

## Acceptance criteria
- [ ] EscalationRowComponent unit test: `maskedTarget` rendered verbatim (FE-HIST-022)
- [ ] EVNT BE amendment deployed to dev

## Dependencies
INT-FE-HIST-002 (same EVNT amendment), FE-HIST-022 (EscalationRowComponent).

## Tenant-context impact
maskedTarget ocultação já aplicada BE-side — nenhum PII exposto no FE (LGPD).

## Prioridade
P4
