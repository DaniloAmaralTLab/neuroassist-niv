# MIG — Event Contracts

> **Not Applicable — messaging is disabled platform-wide; MIG publishes and consumes
> nothing (recorded decision).**
>
> The project has `stack.messaging.enabled = false` (no broker in NeuroAssist NIV).
> Independently of that, MIG is infrastructure that owns **no domain event** (doc 04
> §"Async vs Sync", `_brief.md` §7-8, `03-initial-domain-framing.md` §Domain Events).
> MIG coordinates with every other module purely through the **shared database and
> the `migration_range_registry`**, never at runtime and never over a broker.
>
> This file is intentionally empty of event definitions so the backlog/scaffold do
> not wire a producer or consumer into the migrator job.

## Events published

None. The only lifecycle signal is **operational** — *"migrations applied"* (global
+ N tenants at version V) — surfaced as a **job exit status / log line** and as rows
in `flyway_schema_history` per schema, not as a broker event or a NeuroAssist domain
contract.

## Events consumed

None.

## Idempotency / versioning

Not applicable — there are no events and no broker. Migration-level idempotency (a
re-run against an up-to-date database is a no-op; a repeated version is not
re-applied) is covered in `spec/backend/SPEC-05-idempotency-concurrency.md`.

## Invariants

`THE SYSTEM SHALL NOT produce any event to a broker.`
`THE SYSTEM SHALL NOT consume any event from a broker.`
`THE SYSTEM SHALL coordinate with other modules only through the shared database and the migration_range_registry, never at runtime.`
