# SPEC-05 — Idempotency & Concurrency

> EARS guide: `../../../../standards/ears-notation.md`.

## Objective
Make publish, retire, erase and usage-record safe under retries and concurrent publishes.

## Scope
- **In:** idempotency keys per operation; one-active concurrency control; durable-retry replay for
  erasure facts.
- **Out:** broker dedup (no broker).

## Technical decisions
- Idempotency keys (`event-contracts.md` §5); partial unique index for one-active (INV-CONV-2).

## Implementation
- **Publish** keyed on `trn:publish:<approvalId>`: a replay returns the existing version (`200`), never
  a duplicate. Concurrent publishes for the same patient serialize on `published_tree` (row lock) +
  the partial unique active index; the loser retries against the new active version.
- **Retire** keyed on version id; a second retire is a no-op `200`.
- **Erase** keyed on `conv-service:patient:<patientId>:AudioAssetsErased`; re-erase returns
  `erasedAssetCount: 0`. HIST facts re-sent with the original `idempotencyKey` (HIST ADR-003).
- **Usage** keyed on client `(patientId, phraseId, occurredAt)` unique per patient; replay → `200`.

## Edge cases
- Two TRN publishes race → exactly one becomes active; the other either supersedes-forward or is
  rejected with a conflict and retried (no two active versions, INV-CONV-2).
- Audit durable-retry after commit: a bounded "committed-but-not-yet-audited" window on erasure,
  reconciled by idempotent replay (ADR-006).

## Acceptance criteria (EARS)
- WHEN an operation arrives whose idempotency key was already applied, THE SYSTEM SHALL return the prior result and SHALL NOT create a duplicate.
- IF two publishes for the same patient commit concurrently, THEN THE SYSTEM SHALL keep exactly one `active` version (INV-CONV-2) and SHALL resolve the other deterministically.
- WHEN a durable-retry audit fact is re-sent, THE SYSTEM SHALL reuse the original idempotency key so HIST returns `200` with no duplicate.
- THE SYSTEM SHALL treat a repeated usage signal with the same key as already recorded (`200`), never a duplicate row (INV-CONV-6).
