# SPEC-09 — Messaging Architecture

> **Messaging disabled** (`stack.messaging.enabled = false`). ADR-007. EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Record that TRN runs **broker-free** and specify the in-service durable-retry substrate that replaces a
message bus for long/flaky vendor and cross-service work.

## Scope

**In:** the no-broker decision, `outbound_job` semantics, failure/resilience mapping. **Out:** a future
outbox (not in v1).

## Technical decisions

- **No broker, no topic, no async outbox.** Every cross-service call (CONV, PAT, HIST) is synchronous
  REST. In-process domain events are not broker messages (event-contracts §5).
- **Durable-retry jobs** (`outbound_job`, data-model §2.9) carry: synthesize (ElevenLabs), index
  (Elasticsearch), publish/retire/erase (CONV), and never-blocked audit facts. Each job is idempotent on
  a stable key (SPEC-05).

## Implementation

- `OutboundJobRunner` polls due jobs, claims them atomically, executes the port call, and on success
  marks `done`; on failure increments `attempt_count`, sets `next_attempt_at` with backoff, records
  `last_error`. Multi-instance safe (guarded claim).
- Failure/resilience mapping (ADR-007):
  - Anthropic down → interactive `503`, no job (session resumable).
  - ElevenLabs down → `synthesize` job retried; proposal stays `approved`; no partial publish.
  - Elasticsearch down → `index` job retried; publish still proceeds.
  - CONV down → `publish`/`retire`/`erase_conv_audio` jobs retried idempotently; approval retained.
  - HIST down → hard-502 facts roll back the caller; never-blocked facts enqueue `audit` jobs.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL use no message broker; every cross-service call SHALL be synchronous REST (ADR-007).
- THE SYSTEM SHALL drive every long or flaky vendor/CONV/audit side effect through an idempotent `outbound_job` with backoff retry (SPEC-05).
- WHEN a vendor or CONV outage occurs, THE SYSTEM SHALL retry the corresponding job and SHALL NOT affect CONV runtime or block erasure/revocation (INV-TRN-9).
- THE SYSTEM SHALL complete synthesis before publishing (no partial publish — INV-TRN-4) and SHALL proceed with publish even when indexing is deferred (ADR-006).
