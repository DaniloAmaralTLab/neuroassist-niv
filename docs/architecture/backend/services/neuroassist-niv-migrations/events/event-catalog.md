# MIG — Event Catalog

> **Empty by design.** Messaging is disabled platform-wide
> (`stack.messaging.enabled = false`) and MIG owns no domain event
> (`03-initial-domain-framing.md` §Domain Events, `contracts/event-contracts.md`).

| Event | Type (published/consumed) | Payload | Known consumers |
|---|---|---|---|
| _(none)_ | — | — | — |

MIG's only lifecycle signal is **operational** — *"migrations applied"* (global + N
tenant schemas at version V) — surfaced as a **job exit code / log line** and as rows
in each schema's `flyway_schema_history`, never as a broker event. See
`spec/backend/SPEC-07-observability-health.md`.
