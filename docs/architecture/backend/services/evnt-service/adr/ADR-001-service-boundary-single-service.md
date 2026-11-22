<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — EVNT service boundary: single service

## Status
aceita

## Contexto
EVNT owns one bounded context: the `Event` aggregate and the orchestration of its notification.
The report-ingestion path (device-facing), the caregiver read/confirm/feedback path and the
active-alarm query all operate on the same single aggregate and must enforce the same invariants —
tenant isolation (INV-EVNT-1), exactly-once per gesture (INV-EVNT-4), single-table active alarm
(INV-EVNT-3). The project direction is a modular monolith (shared ADR-002) and the sibling services
ACS, PAT and EDGE are each a single service. The question is whether to split EVNT (e.g. a separate
ingestion service from a separate notification/read service).

## Decisão
We keep EVNT as a **single service** (`evnt-service`), one bounded context. Ingestion, the
active-alarm query, confirmation and feedback are not split out, because they share the one `event`
datastore and must be read and written transactionally and consistently (a confirmation write must
be seen immediately by the active-alarm query — ADR-010). `Patient` (PAT), `Command` (PAT), `Device`
(EDGE) and `Caregiver` (ACS) stay outside EVNT and are referenced by opaque id with no cross-service
FK. This matches the ACS/PAT/EDGE pattern.

## Consequências
- Positive: one cohesive event-and-alarm surface; the single-source-of-truth guarantee (ADR-010) is
  trivially held within one transactional boundary.
- Positive: simplest unit to reason about for the single-device pilot; mirrors the sibling services.
- Negative / trade-off: EVNT concentrates both the high-rate device-facing ingest and the
  caregiver-facing reads; if the two ever needed independent scaling (unlikely at pilot volume) a
  split would be required. Accepted — decomposition is a reversible, per-service decision that does
  not touch other modules.
