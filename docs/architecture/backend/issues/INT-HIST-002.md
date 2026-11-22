# INT-HIST-002 -- EVNT audit-payload amendment — commandLabel field on EventGenerated audit payload + maskedTarget on EscalationAttempted audit payload; amendment being tracked in EVNT; HIST passes both fields through verbatim (G-HIST-1/G-HIST-3); do NOT edit EVNT specs/contracts from this module

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

The caregiver timeline (G-HIST-1 and G-HIST-3) requires two fields that EVNT must include in its
audit-record payloads before HIST can project them:

- `commandLabel` on `EventGenerated` payloads — a human-readable label for the command that
  triggered the event (e.g., "Levantar mão"). **This field originates in EVNT** (the command-catalog
  entity lives there). HIST passes it through verbatim when present; omits the field (never
  fabricates) when absent (api-contract §2 G-HIST-1).
- `maskedTarget` on `EscalationAttempted` payloads — the pre-masked contact endpoint (e.g.,
  `+55•••••1234`). **Masking is performed by EVNT before the audit call.** HIST never unmasks;
  passes through verbatim or omits (api-contract §2 G-HIST-3).

The amendment to include these fields is **tracked in the EVNT backlog**. This INT-HIST issue
documents the dependency and the HIST-side behavior when the fields are absent (backward-compatible:
no breaking change, fields are additive). **Do NOT edit EVNT specs or contracts from this module.**

## Spec de referencia

- api-contract.md §2 (G-HIST-1 commandLabel, G-HIST-3 maskedTarget)
- integration-contracts.md (HIST–EVNT payload contract)
- EVNT event-contracts.md §2 (EventGenerated + EscalationAttempted payload schema — read-only reference)

## Escopo

- [ ] EVNT: add `commandLabel` (string, optional) to `EventGenerated` audit-record payload schema
- [ ] EVNT: add `maskedTarget` (string, optional, pre-masked) to `EscalationAttempted` audit-record payload schema
- [ ] HIST: `HistoryEntryMapper` already handles absent fields (HIST-014); verify backward compatibility when EVNT amendment deploys

## Criterios de aceite

- [ ] AC-1 After EVNT amendment: `EventGenerated` audit records include `commandLabel` in `payload`; HIST mapper projects it onto the `HistoryEntry` (HIST-014 AC-1 passes)
- [ ] AC-2 Before EVNT amendment (or when `commandLabel` is absent): HIST mapper omits the field from `HistoryEntry` — no empty string, no null field (G-HIST-1)
- [ ] AC-3 After EVNT amendment: `EscalationAttempted` audit records include `maskedTarget`; HIST mapper projects it verbatim (HIST-014 AC-2 passes)
- [ ] AC-4 Integration test with both old and new EVNT payload versions confirms backward compatibility

## Dependencias

- HIST-014 (structured projection in HIST-side must be ready to receive the new fields)

## Estimativa

S

## Prioridade
P6
