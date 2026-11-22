# SPEC-01 — API Surface (Edge Surface)

## Objective
Define the surface GWY exposes: the route table (path predicate → `lb://` target),
the anonymous allow-list, the header contract enforced on every forwarded request,
the error model, and the gateway's own health/metrics endpoints. GWY exposes **no
business resource**.

## Scope
**In:** the declarative route table; the exact anonymous allow-list; the header
contract (`X-Correlation-Id`, `X-Tenant-Id` strip, `Authorization` forward); the
PHI-free error model (401/403/429/502/503/504); the gateway's own `/actuator/health`
and `/actuator/prometheus`.
**Out:** business endpoints, RBAC/authorization decisions (resource servers),
token minting/refresh (ACS/EDGE), request aggregation or body transformation (ADR-001).

## Technical decisions
- Surface is a declarative Spring Cloud Gateway route table + global filter chain
  (ADR-001); no hand-written controller.
- **No prefix stripping** — the full path is forwarded; each controller serves under
  its module base path (Assumption A1).
- Deny-by-default (INV-G2): every route runs the edge check except the exact
  anonymous allow-list (api-contract §3).
- Error bodies follow RFC 7807 ProblemDetail and are **PHI-free** (INV-G1, ADR-007).
- Route table, allow-list, header and error contract are authored in
  `contracts/api-contract.md`; this SPEC is their testable invariant surface.

## Implementation
- `spring.cloud.gateway.routes[*]` — eight routes R1..R8 (api-contract §2); R8
  (`/trn/**`) CONFIRMED: `trn-service` port 8089 (Gap G2 closed).
- Global filters: `CorrelationIdFilter`, `TenantHeaderStripFilter`, access-log
  filter; coarse JWT via Spring Security WebFlux (SPEC-03).
- `SecurityConfig` (WebFlux) permits the anonymous allow-list, authenticates the
  rest.
- Actuator exposes `health` + `prometheus` only (ADR-007).

## Edge cases
- A path matching no route predicate → `404` (no route), not forwarded.
- A public path that is a prefix of a protected route (`/acs/**`) → only the exact
  allow-listed paths bypass the check; everything else under the prefix is protected.
- `/trn/**` requested before TRN exists → route resolves to no instance → `503`
  (ADR-006), not a crash.

## Acceptance criteria (EARS)
`THE SYSTEM SHALL expose a declarative route table forwarding each path predicate to its lb:// downstream, preserving the full path.`
`THE SYSTEM SHALL route only to the eight business services and SHALL NOT declare a route to REG, MIG, or DASH.`
`IF a request targets any path outside the anonymous allow-list, THEN THE SYSTEM SHALL require a token that passes the edge check before any lb:// call.` (INV-G2)
`THE SYSTEM SHALL expose /actuator/health and /actuator/prometheus and SHALL NOT expose actuator endpoints that could echo configuration or secrets.`
`THE SYSTEM SHALL return PHI-free RFC 7807 error bodies for every edge short-circuit (401/403/429/502/503/504).` (INV-G1)
`THE SYSTEM SHALL author no business REST resource and SHALL NOT aggregate or transform bodies.` (ADR-001)
