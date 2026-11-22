# SPEC-09 — Messaging Architecture

> `stack.messaging.enabled = false`. Contract: `../../contracts/event-contracts.md` §6.

## Objective

State, explicitly, that HIST has no broker coupling and why idempotency is handled at ingest.

## Scope

- **In** — the no-broker stance; synchronous coupling; the future-broker signal.
- **Out** — any outbox, topic, queue, or consumer (none exist).

## Decisions

- **No broker, no outbox.** Messaging is disabled project-wide; all contact is synchronous REST
  (`POST /hist/audit`, `GET /hist/...`). This is why `POST /hist/audit` is in-band and HIST becomes a
  synchronous dependency of every write path (doc 06 R1).
- **Idempotency at ingest** — because there is no broker to provide delivery guarantees, a request retry
  is made safe by the composite/explicit key upsert (SPEC-05, ADR-003), not by the transport.
- **Anchor is internal** — `AuditRecordAppended` is an in-process milestone only; it is not published.
- **Future-broker signal** — if a broker is later introduced, producers' action names become message
  names without renaming and `POST /audit` becomes a consumer — a separate, explicit future decision,
  out of scope here (doc 04).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL publish no broker message and run no outbox.
- THE SYSTEM SHALL rely on ingest-side idempotency (SPEC-05), not transport delivery guarantees.
