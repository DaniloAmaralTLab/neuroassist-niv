# SPEC-05 — Idempotency + Concurrency

> ADR-003 (accepted, hybrid). Contract: `../../contracts/api-contract.md` §1, `../../contracts/data-model.md` §2.

## Objective

Guarantee a request retry never double-writes, with a hybrid idempotency key, and define concurrent-insert
semantics.

## Scope

- **In** — key derivation (explicit vs composite), UNIQUE enforcement, replay response, race handling.
- **Out** — delivery guarantees (no broker — SPEC-09); producer-side durable retry (SPEC-06).

## Decisions (ADR-003 — hybrid, Option C)

- **Explicit key wins** — when the envelope carries `idempotencyKey`, HIST upserts on it.
- **Composite fallback** — else the key is `source | subject_type | subject_id | action | occurred_at`
  (the GEST shape generalized; equivalent since `action ≡ eventType`).
- UNIQUE constraint on `idempotency_key`; on conflict return the existing record (`200`), never error.

## Implementation

- `IdempotencyKey.of(command)`: explicit if present, else composite (sub-second `occurred_at`).
- `AuditTrailPort.append(record)`: `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING`;
  when nothing inserted, `SELECT` the existing row → replay.
- Concurrency: two simultaneous inserts of the same key → DB UNIQUE serializes them; exactly one `201`,
  the other `200` (no lost update — append-only, no mutation).

## Edge cases

- Explicit key collides with a genuinely different action (producer bug) → stored once under that key;
  flagged for operator review is NOT automatic — document as producer responsibility.
- Two distinct actions with identical composite tuples (same `occurred_at` to sub-second) → rare
  collision; mitigated by sub-second precision and, where needed, an explicit key (ADR-003 Consequências).

## Acceptance criteria (EARS)

- WHEN an envelope carries an explicit `idempotencyKey`, THE SYSTEM SHALL upsert on it (ADR-003).
- WHEN no explicit key is present, THE SYSTEM SHALL derive the composite key
  `source|subject_type|subject_id|action|occurred_at`.
- WHEN a key already exists, THE SYSTEM SHALL append no second record and respond `200` (INV-HIST-3).
- WHILE two requests with the same key race, THE SYSTEM SHALL persist exactly one record.
