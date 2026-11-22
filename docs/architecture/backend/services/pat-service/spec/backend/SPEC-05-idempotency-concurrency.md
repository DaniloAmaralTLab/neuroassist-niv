# SPEC-05 — Idempotency and concurrency

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Specify idempotent semantics for the state-changing use cases and the concurrency control for
concurrent calibration of the same command.

## Escopo

- **In:** idempotency of deactivate/reactivate/retire/register-gesture-type; optimistic
  concurrency on `command` updates; the catalog ETag as a cache-coherence token.
- **Out:** distributed locking (not needed — writes are caregiver-paced, low volume, doc 04).

## Decisões técnicas

- **Idempotency** is state-based (no client idempotency key needed in MVP): a transition to a
  state already held is a no-op success with no second audit (event-contracts §3).
- **Optimistic concurrency** on `command`: a JPA `@Version` column guards concurrent
  calibrations; the loser retries. (`@Version` is an entity concern; the DDL stays as
  data-model §2.3 — the generator adds the version column from the entity contract.)
- **ETag** is derived from the catalog version signature (SPEC-03); it is a read-cache token,
  not a write precondition in the MVP (no `If-Match` on PATCH yet).

## Implementação

| Use case | Idempotency key | Semantics |
|---|---|---|
| DeactivatePatient | `patient.id` | re-deactivate of `inactive` → `204`, no second audit |
| ReactivatePatient | `patient.id` | reactivate of `active` → `200`, no second audit |
| RetireCommand | `command.id` | re-retire of `retired` → `204`, no second `CommandRetired` |
| RegisterGestureType | global `code` | duplicate `code` → `409`, no second audit |
| CreateCommand | `command.id` (server-assigned) | no client-side dedup; each call creates a new command |
| CalibrateCommand | `command.id` + `@Version` | concurrent calibrate → optimistic lock; a no-op change emits no audit |

## Casos de borda

- Two caregivers calibrate the same command concurrently → one commits, the other gets a
  version conflict and retries on the fresh row.
- A `304` served from a stale edge cache is acceptable within the edge's own staleness bound
  (EDGE owns it, ADR-004); PAT always computes the ETag from live state.

## Critérios de aceite (EARS)

- WHEN a transition is requested to a state the resource already holds, THE SYSTEM SHALL respond success and SHALL NOT emit a second audit action.
- WHEN two concurrent `CalibrateCommand` calls target the same command, THE SYSTEM SHALL serialize them via optimistic versioning and SHALL reject the stale write so the caller retries on current state.
- IF a `CalibrateCommand` changes no field, THEN THE SYSTEM SHALL respond `200` without auditing a `CommandCalibrated`.
