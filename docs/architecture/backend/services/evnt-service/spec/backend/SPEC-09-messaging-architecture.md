# SPEC-09 — Messaging Architecture

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`

## Objective

Record EVNT's messaging posture: **disabled**. No broker, no outbox, no queue (`stack.messaging.enabled = false`).

## Scope

- **In:** the sync-REST posture, the audit-in-band model, the future-signal upgrade path.
- **Out:** any broker configuration (none exists).

## Technical decisions

- **All synchronous.** Cross-module coupling is HTTP within the request boundary (mirrors
  ACS/PAT/EDGE). EVNT's "domain events" are **audited domain actions** to HIST over sync REST
  (event-contracts §1).
- **Audit on the write path:** the HIST `POST /audit` call runs synchronously; failure policy resolved
  by HIST ADR-005 — every EVNT fact except `FeedbackRecorded` is commit-first then enqueue idempotent
  durable retry (SAFETY), `FeedbackRecorded` is hard-502 (rolls back `502 audit-unavailable`); dev
  log-only (event-contracts §1).
- **Delivery is pull:** the dashboard polls; EVNT opens no socket and pushes nothing (ADR-003, SPEC-03).
- **Future signal:** a broker or SSE/WebSocket push would reduce alarm latency below the poll
  interval (SPEC-03 Decision 2) and enable SAFETY-1/SAFETY-2; the audited action names become message
  names **without renaming** (doc 03, ADR-006 shared).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL use no broker and SHALL perform all cross-module coupling over synchronous REST.
- WHEN a state-changing use case commits, THE SYSTEM SHALL record the audit to HIST in the same request boundary (event-contracts §1).
- WHERE a broker is later introduced, THE SYSTEM SHALL reuse the existing audited action names as message names without renaming (doc 03).
