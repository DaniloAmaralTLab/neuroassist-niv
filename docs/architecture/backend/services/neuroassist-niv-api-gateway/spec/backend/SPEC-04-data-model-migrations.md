# SPEC-04 — Data Model + Migrations

## Status
**Not Applicable (recorded).** See `contracts/data-model.md`.

## Objective
Record that GWY owns **no database, no schema, and no Flyway migration**.

## Scope
**In:** the explicit decision that the gateway is stateless of business data and
contributes nothing to the centralized migrations service (MIG).
**Out:** any table, entity, DDL block, or Flyway version range — none exist.

## Technical decisions
- GWY is a single gateway-only service (ADR-001) with no domain and no persistence
  (doc 05). Its only runtime state is the in-memory route table, cached JWKS,
  rate-limit buckets and breaker state — all ephemeral and rebuildable.
- `contracts/data-model.md` deliberately contains **no `sql` blocks**;
  `be-migration-generator.py` / `be-entity-generator.py` extract nothing for GWY,
  by design.
- MIG (`neuroassist-niv-migrations`) must **not** allocate a schema for the gateway.

## Acceptance criteria (EARS)
`THE SYSTEM SHALL own no database schema and SHALL contribute no Flyway migration.`
`THE SYSTEM SHALL hold all runtime state (route table, JWKS cache, rate-limit buckets, breaker state) in memory only.`
`WHEN the gateway restarts, THE SYSTEM SHALL rebuild its state from configuration and JWKS fetch, not from a datastore.`
