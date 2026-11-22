# SPEC-05 — Idempotency and concurrency

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Specify idempotent behavior of state-changing operations and concurrency control for the
authorization surface, so retries and concurrent requests never corrupt identity state.

## Escopo

- **In:** idempotent revoke/link, uniqueness-based idempotency, optimistic concurrency on
  session/caregiver status transitions, transactional blacklist write.
- **Out:** distributed locking (single service, pilot volume — not needed).

## Decisões técnicas

- Idempotency keys from DB constraints (data-model): global username PK,
  `(caregiver_id, patient_id)` unique, `patient_session.token_jti` unique.
- Revoke is naturally idempotent on the `revoked` terminal state (SPEC-02).
- Audit + blacklist write share the use case's transaction boundary (doc 04).

## Implementação

- `RevokeSession`: guard on current status; if already `revoked`, return `204` without a
  second blacklist row or audit.
- `LinkPatient`: rely on unique constraint; translate violation to `409 link-exists`.
- Status transitions (`active → deactivated`, `active → revoked`) use optimistic locking
  (`@Version`) so two concurrent revokes resolve to a single terminal write.

## Casos de borda

- Two concurrent `RevokeSession` calls → exactly one blacklist entry, one audit; the loser
  observes `revoked` and returns `204`.
- Retry of `ProvisionSession` (client timeout) → a new session row (not deduplicated);
  caller may revoke the stray one. (Documented limitation; provision is not idempotent by
  design — each call is an explicit grant.)

## Critérios de aceite (EARS)

- WHEN `RevokeSession` targets an already-`revoked` session, THE SYSTEM SHALL return `204` and SHALL NOT create a second blacklist entry or audit record.
- WHILE two revoke requests race on the same session, THE SYSTEM SHALL commit exactly one terminal transition (optimistic lock).
- IF a duplicate link insert occurs, THEN THE SYSTEM SHALL translate the unique violation to `409`.
- THE SYSTEM SHALL write the revoke state change, the blacklist entry and (for access-ending actions) commit them atomically within one transaction.
