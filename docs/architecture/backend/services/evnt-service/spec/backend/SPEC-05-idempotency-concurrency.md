# SPEC-05 — Idempotency & Concurrency

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`

## Objective

Guarantee exactly-once event generation under at-least-once station delivery, and idempotent
confirm/feedback, under concurrent callers.

## Scope

- **In:** ingest dedup, race arbitration, confirm/feedback idempotency.
- **Out:** audit semantics (SPEC-09 / event-contracts).

## Technical decisions

- **Ingest:** dedup on `(deviceId, reportId)`. Pre-check read + DB `UNIQUE` as the authority. A race
  where two unconsumed reports insert concurrently is arbitrated by the UNIQUE constraint; the loser
  catches the constraint violation, re-reads the winning row, and returns the `200` replay — the
  caller never sees a raw `409` (INV-EVNT-4).
- **Confirm:** idempotent on the `confirmed_at IS NULL → NOT NULL` transition; a concurrent double
  confirm results in one `AlarmConfirmed`; a repeat returns the stored `confirmedAt`/`confirmedBy`
  `200` (INV-EVNT-5). Implement with a conditional update (`UPDATE ... WHERE confirmed_at IS NULL`)
  and treat 0 rows affected as the idempotent repeat.
- **Feedback:** idempotent on verdict equality; same verdict → `200` no audit; changed verdict →
  overwrite + one `FeedbackRecorded`.
- **Transaction boundary:** `@Transactional` in the application layer; the HIST audit call is in-band
  within the same boundary (SPEC-09).

## Edge cases

- Station retry storm on one gesture → N requests, 1 event, 1 audit.
- Two caregivers confirm the same alarm within the same poll window → 1 audit, both get `200`.

## Acceptance criteria (EARS)

- WHEN two requests race on the same unconsumed `(deviceId, reportId)`, THE SYSTEM SHALL persist exactly one event and resolve the other to the `200` replay (INV-EVNT-4).
- WHEN `confirmAlarm` is called concurrently on an unconfirmed emergency, THE SYSTEM SHALL apply exactly one confirmation and emit exactly one `AlarmConfirmed` (INV-EVNT-5).
- WHEN `recordFeedback` repeats the stored verdict, THE SYSTEM SHALL return `200` and emit no audit; a changed verdict SHALL overwrite and audit once.
- THE SYSTEM SHALL never surface a raw DB `409` for a dedup race; it SHALL map to the idempotent `200`/`201` outcome.
