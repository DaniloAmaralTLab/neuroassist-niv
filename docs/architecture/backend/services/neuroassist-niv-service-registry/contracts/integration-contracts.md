# REG — Integration Contracts (External Systems)

> REG has **no external SaaS / AI / messaging / datastore integration** — those
> belong to the domain services (doc 04 §External Integrations). Its only couplings
> are platform infrastructure: in-fleet Eureka clients (inbound) and the
> observability stack (outbound logs). REG makes **no outbound** call of its own
> (`_brief.md` §6).

## 1. Eureka clients (inbound registration / discovery)

| Aspect | Value |
|---|---|
| Type | Eureka server protocol (sync HTTP); REG is the server |
| Auth | Platform-internal (network trust); no external credential |
| SLA | Clients tolerate short registry blips via their cached registry |
| Fallback | Clients route on their cached registry and retry; in prod, self-preservation (if enabled) keeps membership during a renewal-rate dip |

`THE SYSTEM SHALL accept registration and discovery from in-fleet clients without an external credential (network-trusted plane).`
`WHERE self-preservation is enabled, WHILE the fleet-wide renewal rate dips transiently, THE SYSTEM SHALL preserve membership rather than evict en masse.`

## 2. Platform observability stack (outbound logs)

| Aspect | Value |
|---|---|
| Type | Structured lifecycle/access logs → Elasticsearch (project search engine) |
| Auth | Platform-internal |
| SLA | Best-effort; logging never blocks the registry |
| Fallback | If the logging stack is unavailable, REG continues serving registrations/discovery |

`THE SYSTEM SHALL emit registration/renewal/eviction lifecycle logs to the platform stack as best-effort.`
`IF the logging stack is unavailable, THEN THE SYSTEM SHALL continue accepting registrations and answering discovery.`

## 3. Explicitly absent integrations

| Integration class | Present? | Why |
|---|---|---|
| PostgreSQL / datastore | No | no business or tenant state (doc 05) |
| Messaging / broker | No | messaging disabled platform-wide; not an event participant (doc 04) |
| TechLab AI | No | `ai.hasAi = false`; consumes no AI capability (`_brief.md` §7) |
| External SaaS | No | talks only to in-fleet Eureka clients (doc 04); no outbound call (`_brief.md` §6) |
| Edge JWKS / auth | No | REG makes no auth decision (that is GWY) |

`THE SYSTEM SHALL integrate only with in-fleet Eureka clients and the platform observability stack.`

## 4. Resilience strategy summary

| Dependency | On failure | Circuit/retry |
|---|---|---|
| Eureka clients (inbound) | clients use cached registry; prod self-preservation (if enabled) holds membership | no eviction during renewal-rate dip when enabled |
| Observability stack | continue serving; logs best-effort | no retry storm |

`THE SYSTEM SHALL keep serving discovery even when its only outbound dependency (logging) is degraded.`
