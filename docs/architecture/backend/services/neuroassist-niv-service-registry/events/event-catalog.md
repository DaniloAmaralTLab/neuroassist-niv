# REG — Event Catalog

> **Empty by design.** Messaging is disabled platform-wide
> (`stack.messaging.enabled = false`) and REG owns no domain event — it publishes
> and consumes nothing (see `contracts/event-contracts.md`). Inter-module relations
> are registration + discovery over HTTP only.

| Event | Type | Payload | Known consumers |
|---|---|---|---|
| _(none)_ | — | — | — |

## Note on lifecycle signals

REG emits **registration / renewal / eviction lifecycle logs** and access logs to
the platform observability stack (Elasticsearch). These are log/telemetry records,
**not** domain events, and are described in
`spec/backend/SPEC-07-observability-health.md`, not here.
