# HIST-014 -- Structured entry projection G-HIST-1..5 — subjectId, relatedEventId (join key for event-subject entries), commandId/commandLabel/urgency (omit commandLabel when absent), server-side confirmation fold onto EventGenerated, channel + masked maskedTarget on EscalationAttempted, enumerated outcome per kind

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Contexto

The `HistoryEntryMapper` converts raw `audit_record` rows into structured `HistoryEntry` objects
carrying the fields required by the FE prototype (G-HIST-1..5). All fields map to existing columns
or `payload` JSON paths — no new physical columns (data-model §7):

- `subjectId` ← `audit_record.subject_id` (G-HIST-1; for event-subject entries = eventId)
- `relatedEventId` ← `subject_id` WHERE `subject_type = 'event'` (G-HIST-2 — join key so the
  FE can fold confirmation/feedback/escalation onto the originating event row)
- `commandId`, `commandLabel`, `urgency` ← `payload ->> 'commandId'/'commandLabel'/'urgency'`;
  if `commandLabel` is absent in the stored payload, the field is **omitted** — never fabricated
  (G-HIST-1; depends on EVNT upstream amendment INT-HIST-002)
- `confirmation { confirmedAt, confirmedBy }` ← server-side fold of the sibling `AlarmConfirmed`
  row onto the `EventGenerated` entry, matched by `subject_id` within the window (G-HIST-2);
  absent when no `AlarmConfirmed` exists in-window
- `channel` ← `payload ->> 'channel'` on `EscalationAttempted` (`web_push|sms|voice`)
- `maskedTarget` ← `payload ->> 'maskedTarget'`; pass through verbatim (already masked by
  producer); omit when absent; HIST never unmasks (G-HIST-3; depends on INT-HIST-002)
- `outcome` ← enumerated per `kind`: event/feedback → `real|false_positive|not_evaluated`;
  escalation → `sent|failed`; detection-lapse → `started|resolved|acknowledged` (G-HIST-5)

## Spec de referencia

- SPEC-03 (caregiver history timeline — structured projection)
- api-contract.md §2 (G-HIST-1..5 field table)
- data-model.md §7 (caregiver timeline projection — column mapping)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/mapper/HistoryEntryMapper.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/model/HistoryEntry.java`
- [ ] unit tests: `backend/services/hist-service/src/test/java/com/neuroassist/hist/application/mapper/HistoryEntryMapperTest.java`

## Criterios de aceite

- [ ] AC-1 `EventGenerated` entry carries `subjectId`, `relatedEventId = subjectId`, `commandId`, `urgency`; `commandLabel` present only when payload carries it; `confirmation` present only when sibling `AlarmConfirmed` exists in-window
- [ ] AC-2 `EscalationAttempted` entry carries `channel` and `maskedTarget` (when present); raw contact endpoint is never projected (G-HIST-3)
- [ ] AC-3 `DetectionLapseResolved` from EDGE (`subjectType=edge-device`) and from EVNT (`subjectType=detection-lapse`) produce distinct entries with correct `source` and `subjectType` (event-contracts §5)
- [ ] AC-4 `outcome` values: `EventGenerated` → `not_evaluated` (no feedback yet); `FeedbackRecorded` with `feedback=real` → `real`; `EscalationAttempted` with `status=sent` → `sent`; `DetectionLapseStarted` → `started`
- [ ] AC-5 `commandLabel` absent in payload → field omitted from `HistoryEntry` (Jackson `@JsonInclude(NON_NULL)` or equivalent); no empty string
- [ ] AC-6 `./gradlew :hist-service:test` exits 0

## Dependencias

- HIST-013 (QueryPatientHistory feeds rows to this mapper)

## Estimativa

M

## Prioridade
P6
