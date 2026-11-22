# FE-HIST-014 -- HistoryTimelineComponent — presentational, markFeedback EventEmitter; HIST writes nothing, delegates to EVNT

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-02 §1–2, SPEC-04 §4, SPEC-05 §4

## Outcome
`HistoryTimelineComponent` renders the flat entry list using the shared ui/ row components, emits `markFeedback` upward for delegated EVNT write, and surfaces the "Was it real?" affordance only when `canRecordFeedback` is true (gated by `evnt.event.record`). HIST writes nothing.

## Approach (execution path)
1. Create `HistoryTimelineComponent` (standalone + OnPush):
   - `@Input() entries: HistoryEntryVM[]`
   - `@Output() markFeedback: EventEmitter<{ entryId: string; verdict: 'real'|'false_positive' }>`
   - Renders per entry kind: `HistoryEventRowComponent` (kind='event'), `EscalationRowComponent` (kind='escalation'), `DetectionLapseRowComponent` (kind='detection-lapse').
   - "Was it real?" button shown only when `entry.canRecordFeedback === true` (SPEC-05 §4); on click emits `markFeedback` — no direct write.
2. HIST never patches a local entry after the write; refresh is initiated by the shell/page.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/feature-history/src/lib/history-timeline.component.ts`
- [ ] `markFeedback` EventEmitter — no direct write
- [ ] "Was it real?" gated by `entry.canRecordFeedback`
- [ ] Uses HistoryEventRowComponent, EscalationRowComponent, DetectionLapseRowComponent from ui/
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS

## Acceptance criteria
- [ ] `npx nx test hist-feature-history` PASS
- [ ] `npx nx lint hist-feature-history` PASS
- [ ] Timeline component contains no HttpClient injection and no write method
- [ ] "Was it real?" hidden when `canRecordFeedback = false`

## Dependencies
FE-HIST-021 (HistoryEventRowComponent, ui/), FE-HIST-022 (EscalationRowComponent, DetectionLapseRowComponent — SAFETY).

## Tenant-context impact
Nenhum.

## Prioridade
P3
