<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — Command snapshot on the Event (resolves ADR-008's open implementation question for EVNT)

## Status
aceita

## Contexto
Shared/BA **ADR-008** decided that `Event.command` is a reference (FK) to `Command` rather than a
fixed `type` enum, and left an explicit `TODO[architect]`: *"investigate whether the final backend
schema should keep Command as its own table or denormalize label/urgency directly into Event for
performance — implementation decision, not evaluated here."* Shared/BA **ADR-010** decided the Event
is a single table and "active alarm" is a read-time query. EVNT must decide how the event obtains and
retains the Command's `urgency` + `label`: resolve live from PAT on every read, or capture a snapshot
at generation. Commands are recalibratable in PAT (`PATCH /pat/commands/{id}` changes `urgency` /
`label`), and PAT is a separate service reached only by sync REST.

## Decisão
EVNT **snapshots** `urgency` + `label` onto the Event at generation time, while keeping the opaque
`commandId` reference (no cross-service FK):

- At ingest, EVNT calls `GET /pat/commands/{commandId}` (service-client, `pat.command.read`) once and
  stores `command_label` + `urgency` as columns on the `event` row (doc 05).
- Reads (active-alarm, History) never call PAT — the event is self-describing. The live catalog
  remains PAT's truth; the snapshot is the **historical** truth of what fired.

This answers ADR-008's open question for the EVNT side (denormalize label/urgency onto Event) without
contradicting it (the `commandId` reference is retained) and composes with ADR-010 (still one table).

## Consequências
- Positive: an event is immutable history — a later recalibration of the command in PAT does not
  rewrite what the caregiver was alarmed about (Risk R5 is intended behaviour).
- Positive: read paths (the polled active-alarm, History) are a single-table query with no fan-out to
  PAT — fast and resilient to PAT downtime.
- Positive: PAT is consulted exactly once per event (at generation), the only point urgency must be
  correct (it decides full-screen vs toast).
- Negative / trade-off: if PAT is unreachable at generation, EVNT cannot type the event and must fail
  the report so the station retries (Risk R4) rather than guess urgency — a correctness-over-
  availability choice for a safety signal. Exact degrade confirmed at specs.
- Negative / trade-off: a snapshot can diverge from the live command label; accepted and desired for
  history. A caregiver viewing History sees the label as it was when the event fired.
