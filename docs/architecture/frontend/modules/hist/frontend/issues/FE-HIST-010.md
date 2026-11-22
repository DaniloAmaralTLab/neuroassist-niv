# FE-HIST-010 -- Wire types + DTO mappers — HistoryPageWire, HistoryEntryWire, PeriodSummaryWire, toHistoryEntryVM, toPeriodSummaryVM

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-03 §1–3, backend-api-cross-link.md §4–5

## Outcome
`HistoryPageWire`, `HistoryEntryWire`, `PeriodSummaryWire` TypeScript types mirror the BE api-contract §2 1:1. `toHistoryEntryVM` and `toPeriodSummaryVM` mappers translate wire → VM without fabricating fields absent from the contract.

## Approach (execution path)
1. Create `frontend/libs/hist/data-access/src/lib/history.wire.ts`:
   - `HistoryPageWire`: `{ patientId, window, entries, nextCursor, summary? }`
   - `HistoryEntryWire`: all BE api-contract §2 fields (id, kind, source, subjectType, subjectId, relatedEventId?, occurredAt, title, detail, commandId?, commandLabel?, urgency?, confirmation?, channel?, maskedTarget?, outcome?)
   - `PeriodSummaryWire`: `{ scope: 'period', window, counts, events }`
2. Create `frontend/libs/hist/data-access/src/lib/history.mappers.ts`:
   - `toHistoryEntryVM(wire: HistoryEntryWire): HistoryEntryVM` — maps `kind` (EventGenerated → 'event', EscalationAttempted → 'escalation', DetectionLapse* → 'detection-lapse'); disambiguates `DetectionLapseResolved` by `(source, subjectType)`; sets `isSafetySurface = kind === 'escalation' || kind === 'detection-lapse'`; `canRecordFeedback` left as `false` (AccessDecisionService check in facade/component).
   - `toPeriodSummaryVM(wire: PeriodSummaryWire, period: PeriodFilter): PeriodSummaryVM`
   - `deriveLoadedSummaryVM(entries: HistoryEntryVM[], period: PeriodFilter): PeriodSummaryVM` (scope='loaded' fallback).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history.wire.ts`
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history.mappers.ts`
- [ ] `HistoryEntryWire` mirrors BE api-contract §2 exactly — no invented fields
- [ ] `toHistoryEntryVM` maps `kind` correctly including DetectionLapseResolved disambiguation by (source, subjectType)
- [ ] `isSafetySurface` set correctly for escalation + detection-lapse kinds
- [ ] `maskedTarget` passed through verbatim — no unmasking
- [ ] `npx nx test hist-data-access` PASS
- [ ] `npx nx lint hist-data-access` PASS

## Acceptance criteria
- [ ] `npx nx test hist-data-access` PASS — mapper unit tests cover all 7 entry kinds; DetectionLapseResolved disambiguation tested
- [ ] `npx nx lint hist-data-access` PASS
- [ ] Mapper never fabricates `commandLabel` when absent (falls back to empty/undefined)

## Dependencies
Nenhuma (types são fundação da camada de dados).

## Tenant-context impact
Nenhum — tipos espelham o contrato BE; tenant nunca exposto como campo.

## Prioridade
P2
