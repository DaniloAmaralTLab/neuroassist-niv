# SPEC-05 — Idempotency and Concurrency

> ADR-003/ADR-007. Broker-free durable retry via `outbound_job` (data-model §2.9).
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Guarantee that publication, erasure, consent-revocation and audit are **idempotent** and safe under
retry/concurrency, with no partial publishes and no duplicate side effects.

## Scope

**In:** publish idempotency key, publication uniqueness, durable-retry semantics, concurrent dual-auth,
audit replay. **Out:** CONV-side idempotency (CONV SPEC-05 — TRN relies on it).

## Technical decisions

- **One approval → one publication**, idempotent on `idempotencyKey = trn:publish:<approvalId>`
  (INV-TRN-6); enforced by `publication` uniques (data-model §2.8).
- **Durable-retry jobs** (`outbound_job`) key every vendor/CONV/audit side effect on an idempotency key;
  a retry after an outage is a no-op once accepted.
- **No partial publish** (INV-TRN-4): publish proceeds only when all approved phrases are synthesized.

## Implementation

- `SynthesizeAndPublishService` creates the `publication` row first (unique on approval) → enqueues
  `synthesize`, `index`, `publish` jobs with stable keys. CONV publish carries
  `idempotencyKey=trn:publish:<approvalId>`; a CONV `200` replay marks the job `done`.
- `OutboundJobRunner` claims due jobs (`status IN ('pending'),(in_progress)` with `next_attempt_at<=now`),
  sets `in_progress`, retries with backoff, and is safe to run on multiple instances (claim is a guarded
  `UPDATE ... RETURNING`).
- Concurrent dual-auth: the two halves update the same `authorization` row; the `approved` transition is
  a guarded single-row update (optimistic/`SELECT ... FOR UPDATE`) so two racing confirmations settle to
  exactly one `approved` and one `ProposalApproved`.

## Edge cases

- Republish of an already-published approval → `200`/`202` with the existing publication, no duplicate.
- HIST `200` replay on a never-blocked fact → job `done`, no duplicate audit.
- Double erasure request → second returns `202` with zero counts (idempotent).
- Two instances claim the same job → only one wins the guarded claim; the other skips.

## Acceptance criteria (EARS)

- WHEN a publication is requested for an `approvalId` already published, THE SYSTEM SHALL return the existing publication and SHALL NOT create a duplicate or re-publish to CONV (INV-TRN-6).
- THE SYSTEM SHALL publish to CONV with `idempotencyKey=trn:publish:<approvalId>` and SHALL treat a CONV `200` replay as success (SPEC aligns CONV SPEC-05).
- THE SYSTEM SHALL NOT publish a version while any approved phrase lacks a synthesized `available` asset (no partial publish — INV-TRN-4).
- WHEN a durable-retry job re-sends a fact whose idempotency key was already accepted, THE SYSTEM SHALL mark the job `done` without a duplicate side effect.
- WHEN two confirmations race to complete the dual authorization, THE SYSTEM SHALL produce exactly one `approved` transition and one `ProposalApproved` (INV-TRN-1).
- WHEN erasure is requested for an already-erased patient, THE SYSTEM SHALL respond `202` with zero counts (idempotent).
