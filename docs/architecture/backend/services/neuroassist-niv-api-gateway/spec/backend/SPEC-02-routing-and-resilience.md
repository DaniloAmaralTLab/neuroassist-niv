# SPEC-02 — Routing and Resilience (Core)

## Objective
Specify the core behavior of the gateway: forward each path predicate to its
`lb://` downstream resolved through Eureka, and isolate a slow or dead downstream
with per-route timeouts, a circuit breaker and idempotent-only retry.

## Scope
**In:** `lb://` routing for the eight business services; no prefix stripping;
per-route connect/response timeouts; resilience4j circuit breaker per downstream;
retry restricted to idempotent verbs; PHI-free fallback responses.
**Out:** the edge JWT check (SPEC-03); CORS/rate limit (SPEC-06); any BFF
aggregation or body transformation (ADR-001).

## Technical decisions (ADR-006)
- Route by **Eureka `lb://<service>`**, never static host:port — topology changes
  (ports/hosts/instances) need no gateway change.
- Forward the **full path** (no `StripPrefix`, Assumption A1).
- Each route has a **connect + response timeout**; a resilience4j **circuit
  breaker** per downstream with a fast PHI-free fallback.
- **Retry only idempotent verbs** (`GET`); never `POST/PATCH/DELETE`-with-effects,
  and never login / pairing / event-report (Risk R8).
- Timeout / breaker / retry values are **configuration**
  (`integration-contracts.md` §6), tuned per environment.

## Implementation
- `spring.cloud.gateway.routes[*]` with `uri: lb://<service>` and a `Path=` predicate.
- Per-route `resilience4j` filter (circuit breaker) + Netty client timeouts.
- Retry filter configured with `methods: GET` only.
- Breaker fallback returns a PHI-free `503` ProblemDetail (api-contract §6).
- Depends on a live REG for `lb://` resolution; degrades on the client-side registry
  cache when REG blips (doc 06 Critical dependency).

## Edge cases
- Downstream slow past the response timeout → `504` (not a hung edge connection).
- Downstream instance pool empty (REG returned nothing, or all unhealthy) → `503`.
- Breaker open for one route → that route returns `503` fallback while other routes
  stay healthy (isolation).
- A `GET` that fails transiently → retried; a `POST /acs/auth/login` that fails →
  **not** retried (no double login — Risk R8).
- REG unreachable but the target was previously cached → routing continues on the
  client-side cache.

## Acceptance criteria (EARS)
`WHEN a request path matches a route predicate, THE SYSTEM SHALL forward it by lb:// to that logical downstream, preserving the full path.`
`THE SYSTEM SHALL apply a per-route connect and response timeout; IF the response timeout is exceeded, THEN THE SYSTEM SHALL return 504.`
`WHILE a route's circuit breaker is open, THE SYSTEM SHALL return a fast PHI-free 503 fallback rather than call the downstream.`
`IF no healthy instance exists for an lb:// target, THEN THE SYSTEM SHALL return 503.`
`THE SYSTEM SHALL retry only idempotent verbs and SHALL NEVER auto-retry login, pairing, or event-report requests.` (Risk R8)
`IF REG is unreachable, THEN THE SYSTEM SHALL resolve from its client-side registry cache and SHALL degrade routing only for never-cached targets.`
`THE SYSTEM SHALL NOT strip any path prefix before forwarding.` (Assumption A1)
