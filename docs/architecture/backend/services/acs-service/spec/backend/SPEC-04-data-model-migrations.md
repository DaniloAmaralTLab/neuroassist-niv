# SPEC-04 — Data model and migrations

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical DDL: `../../contracts/data-model.md`.

## Objetivo

Specify the persistence schema (global + per-tenant) and the centralized Flyway migration
plan, so `be-migration-generator.py` and `be-entity-generator.py` consume an unambiguous
contract.

## Escopo

- **In:** six tables (data-model §2), schema-per-tenant routing, reserved migration ranges,
  data lifecycle, CHECK constraints.
- **Out:** PAT and EDGE schemas (owned elsewhere); the physical placement reconciliation
  (data-model §2.2 TODO[architect]).

## Decisões técnicas

- Schema-per-tenant — `../../../adr/ADR-003-multi-tenancy.md`. Global:
  `tenant`, `caregiver_identity_lookup`, `jwt_blacklist`. Per-tenant (`t_<tenantId>`):
  `caregiver`, `caregiver_patient_link`, `patient_session`.
- Centralized Flyway applied by MIG; ACS authors scripts in reserved range `V0010`+.
- UUID PKs (`gen_random_uuid()`), `timestamptz`, enum-as-varchar+CHECK (data-model §1).

## Implementação

The `` ```sql `` blocks in data-model §2 are canonical. Routing is by the `-- schema:`
first-line comment: `global` → `neuroassist_global`; `tenant` → the `t_<tenantId>`
template applied to each tenant. Migration ranges: data-model §5.

## Casos de borda

- Non-expiring session → `jwt_blacklist.token_expires_at = NULL` (retained indefinitely).
- `patient_session` revocation consistency enforced by `chk_session_revoked_consistency`.
- Cross-service ids (`patient_id`, `device_id`) have no FK (service boundary).

## Critérios de aceite (EARS)

- THE SYSTEM SHALL persist global entities in `neuroassist_global` and tenant entities in `t_<tenantId>` per data-model §4.
- IF an insert into `caregiver` omits `tenant_id`, THEN THE SYSTEM SHALL reject it (INV-1).
- IF a `patient_session` is marked `revoked` without `revoked_by`/`revoked_at`, THEN THE SYSTEM SHALL reject it (INV-4).
- IF a duplicate `(caregiver_id, patient_id)` link is inserted, THEN THE SYSTEM SHALL reject it.
- THE SYSTEM SHALL author Flyway scripts in the reserved `V0010`+ range and SHALL NOT run Flyway at service start (MIG applies centrally).
