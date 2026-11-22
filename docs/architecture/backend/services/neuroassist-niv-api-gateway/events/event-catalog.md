# GWY — Event Catalog

> **Empty by design.** Messaging is disabled platform-wide
> (`stack.messaging.enabled = false`) and GWY owns no domain event — it publishes
> and consumes nothing (see `contracts/event-contracts.md`). Inter-module relations
> are synchronous HTTP forwarding only.

| Event | Type | Payload | Known consumers |
|---|---|---|---|
| _(none)_ | — | — | — |

## Note on operational signals

GWY emits **PHI-free access/lifecycle log lines** (request routed / request
rejected at edge) and metrics (routes, latencies, 4xx/5xx, breaker state) to the
platform observability stack (Elasticsearch). These are log/telemetry records,
**not** domain events, and are described in
`spec/backend/SPEC-07-observability-health.md`, not here.
