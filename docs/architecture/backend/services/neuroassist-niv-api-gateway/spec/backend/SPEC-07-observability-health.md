# SPEC-07 — Observability and Health

## Objective
Specify the gateway's observability: correlation-id propagation across the fleet,
**PHI-free** access logs, metrics, and liveness/readiness — the single most
dangerous PHI surface in the system, handled so no patient data ever leaks.

## Scope
**In:** `X-Correlation-Id` generate-if-absent / preserve / forward / echo; MDC
keying; PHI-free access-log format; gateway metrics; health/readiness endpoints.
**Out:** business audit (owned by HIST at the resource servers); distributed tracing
backend config (platform); any body/param logging (forbidden).

## Technical decisions (ADR-007)
- **Correlation id (INV-G4):** generate an `X-Correlation-Id` if absent, forward it
  downstream, echo it on the response, and use it as the MDC key for the gateway's
  own log lines. An inbound id is **preserved**, not overwritten.
- **PHI-free logs (INV-G1):** access logs contain **only** HTTP method, **route
  template** (`/hist/**`, not the concrete URI with ids/query values), status,
  latency, correlation id. **Never** request/response bodies, query-parameter
  values, identifier-bearing path variables, `Authorization`/token contents, or any
  PHI-carrying header.
- Log the **route template**, not the concrete path — a log line alone cannot
  identify which record was touched (intentional; the identifying detail lives in
  HIST's audited trail, not at the edge).
- Health is exposed (`/actuator/health`); actuator endpoints that could echo
  config/secrets are **not** publicly exposed.

## Implementation
- `CorrelationIdFilter` (global, high precedence): read-or-generate, set MDC,
  forward header, add to response + exposed CORS headers.
- Access-log filter emits the fixed PHI-free field set; a log-scrub assertion/test
  guards the format.
- Metrics via Micrometer → `/actuator/prometheus`: per-route request count, latency,
  4xx/5xx, breaker state, rate-limit rejections.
- Liveness `/actuator/health`; readiness reflects JWKS reachability + Eureka
  registration.

## Edge cases
- Inbound request already carries `X-Correlation-Id` → preserved and threaded, not
  regenerated.
- A downstream HIST audit call → carries the same correlation id end to end.
- A developer adds a `log.info(request body)` at the edge → rejected by the PHI-free
  log-format assertion (Risk R4).
- JWKS unreachable at startup → readiness reports not-ready until a key set is
  fetched; liveness stays up.

## Acceptance criteria (EARS)
`WHEN a request lacks X-Correlation-Id, THE SYSTEM SHALL generate one, forward it downstream, and echo it on the response.` (INV-G4)
`WHEN a request carries an X-Correlation-Id, THE SYSTEM SHALL preserve it rather than overwrite it.`
`THE SYSTEM SHALL log only method, route template, status, latency, and correlation id.` (INV-G1)
`THE SYSTEM SHALL NOT log any request/response body, query value, identifier, or token content.` (INV-G1, Risk R4)
`THE SYSTEM SHALL log the route template (e.g. /hist/**), NOT the concrete URI with identifiers or query values.`
`THE SYSTEM SHALL expose liveness, readiness, and Prometheus metrics, and SHALL NOT publicly expose actuator endpoints that could echo configuration or secrets.`
`WHILE the gateway cannot reach any JWKS issuer, THE SYSTEM SHALL report readiness as not-ready.`
