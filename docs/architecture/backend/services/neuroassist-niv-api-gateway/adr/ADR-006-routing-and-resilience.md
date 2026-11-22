<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-006 — Routing via Eureka `lb://` with timeouts, circuit breaker and idempotent-only retry

## Status
aceita

> Orchestrator default (recommendation) — revisable by the owner (recorded without a
> clarifying question in automated mode).

## Contexto
Downstreams run on fixed ports today (ACS 8081 … GEST 8088) but are registered in Eureka
(REG `:8761`, `../neuroassist-niv-service-registry/`). GWY can route either by **static**
`uri: http://host:port` or by **logical name** `lb://<service>` resolved through Eureka +
Spring Cloud LoadBalancer. Static routing re-hard-codes topology into the edge and breaks on
any port/host change; it also precludes multiple instances. Separately, a proxy without
timeouts or a breaker lets a slow/dead downstream exhaust the edge's connections, and a blanket
retry policy can duplicate non-idempotent side effects (a second login, pairing claim or event).

## Decisão
GWY routes by **Eureka `lb://<service>`** for all eight business services, forwarding the full
path (no `StripPrefix` — controllers carry their module base path, Assumption A1). Resilience is
per route: a **connect + response timeout**, a **resilience4j circuit breaker** per downstream
(with a fast, PHI-free fallback response), and **retry only on idempotent verbs** (`GET`) —
**never** on `POST`/`PATCH`/`DELETE`-with-effects, and never on the login, pairing or
event-report endpoints. Timeout/breaker/retry values are configuration.

## Consequências
- Positive: topology changes (ports, hosts, instance count) need no gateway change — the edge
  adapts to the fleet via discovery (matches REG ADR-001).
- Positive: a slow or dead downstream is isolated by the breaker and timeout instead of
  cascading to the edge; load-balancing across future instances is free.
- Positive: no duplicated side effects — non-idempotent calls are never auto-retried (Risk R8).
- Negative / trade-off: routing now depends on a live Eureka registry; if REG is down, `lb://`
  resolution degrades (Critical dependency, see doc 06). Accepted — the clients already depend on
  REG, and the alternative (static URIs) is worse for operability.
- Negative / trade-off: breaker/timeout tuning is an operational task; mis-tuned values cause
  premature trips or slow failure. Mitigated by per-route config and health observation.
