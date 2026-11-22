# SPEC-05 — Idempotency & Concurrency

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.

## Objetivo
Specify idempotent writes and concurrency control for a low-write, read-mostly registry.

## Escopo
- **In:** declare/retire/deprecate idempotency; the unique constraint as the concurrency guard; audit
  idempotency.
- **Out:** detection-runtime idempotency (station/EVNT concern), broker dedup (no broker).

## Decisões técnicas
- The DB `UNIQUE (engine_version_id, gesture_type_code)` is the concurrency arbiter for concurrent
  declares of the same pair (one wins, the other becomes a status update).
- Writes are rare and admin-driven — optimistic handling is sufficient; no distributed locks.

## Implementação
- Declare: `INSERT ... ON CONFLICT (engine_version_id, gesture_type_code) DO UPDATE` semantics at the
  service layer; result status `201` (insert) vs `200` (update) reflects the outcome.
- Deprecate/retire: idempotent — a no-op transition returns `200` without a second audit.
- Audit idempotency key: `(source, subjectType, subjectId, eventType, occurredAt)` (event-contracts §2).

## Casos de borda
- Two admins declare the same pair concurrently → unique constraint serializes; both observe a valid
  final row; at most one `201`.
- Retried request after client timeout → same final state, no duplicate audit (idempotency key).

## Critérios de aceite (EARS)
- WHEN two concurrent declares target the same `(engineVersion, code)`, THE SYSTEM SHALL converge to a
  single row (INV-GEST-2) with no duplicate.
- WHEN a deprecate/retire targets an already-terminal state, THE SYSTEM SHALL respond `200`
  idempotently and SHALL NOT emit a duplicate audit fact.
