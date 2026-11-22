# SPEC-06 — Security

## Objective
Specify the gateway's security posture: the coarse edge auth boundary (deny-by-default
+ advisory-not-terminal), CORS for the caregiver shell, in-memory rate limiting for
login/pairing, client-tenant-header stripping, and PHI-free behavior.

## Scope
**In:** deny-by-default edge auth with the anonymous allow-list; two-issuer trust
(cross-ref SPEC-03); CORS allow-list (ADR-004); rate limiting login+pairing
(ADR-005); tenant-header stripping (ADR-003); PHI-free posture (ADR-007); the
WebFlux (reactive) security wiring.
**Out:** RBAC / `@PreAuthorize` and revocation enforcement (resource servers,
INV-G5); token minting/refresh (ACS/EDGE); the detailed JWT mechanics (SPEC-03).

## Technical decisions
- **Deny-by-default (INV-G2):** every route except the exact anonymous allow-list
  (api-contract §3) requires a token that passes the edge check.
- **Advisory, not terminal (INV-G5):** the edge check never substitutes for
  `@PreAuthorize`, the `jti`-blacklist, or any RBAC decision — those stay in the
  resource servers. GWY returns `403` only for CORS-rejected or structurally
  forbidden requests; a business `403` is the resource server's, forwarded verbatim.
- **CORS (ADR-004):** explicit caregiver-shell origin allow-list, never `*` with
  credentials; methods `GET/POST/DELETE/OPTIONS`; `Authorization` +
  `X-Correlation-Id` allowed; `X-Correlation-Id` exposed; preflight answered at the
  edge.
- **Rate limit (ADR-005):** in-memory per-instance token bucket on
  `POST /acs/auth/login` and the EDGE pairing-claim → `429`. Thresholds are config
  (Gap G4). No Redis in the MVP.
- **Tenant strip (ADR-003, INV-G3):** strip any inbound `X-Tenant-Id` (and variant);
  GWY injects no tenant header and parses no `tenantId` claim.
- **PHI-free (ADR-007, INV-G1):** no body, query value, token content or identifier
  in any log line or error body.
- **Reactive wiring:** `@EnableWebFluxSecurity` + `SecurityWebFilterChain`
  (**not** servlet `@EnableMethodSecurity`). Authz is PROVEN by a 401/403 test
  (D-642) — see SPEC-03 acceptance.

## Implementation
- `SecurityConfig` (WebFlux): allow-list `permitAll`, `anyExchange().authenticated()`,
  `oauth2ResourceServer(jwt)` with a two-issuer resolver (SPEC-03).
- `CorsConfig`: `CorsWebFilter` with the configured origin list (`integration-contracts.md` §4).
- `RateLimitConfig`: per-key token buckets for the login and pairing buckets.
- `TenantHeaderStripFilter`: removes `X-Tenant-Id` (and tenant-ish variants) before
  forwarding.
- Access-log format restricted to method, route template, status, latency,
  correlation id (SPEC-07).

## Edge cases
- Protected route without a token → `401`; with a valid token of insufficient role →
  admitted at the edge, `403` from the resource server (INV-G5).
- Browser call from a non-allow-listed origin → CORS-blocked (no `Access-Control-Allow-Origin`).
- Wildcard-with-credentials misconfig → structurally prevented by config (Risk R6).
- Burst of logins from one IP past the threshold → `429` (Risk — credential stuffing).
- Client sends `X-Tenant-Id: t_other` → stripped; downstream derives tenant from the
  signed claim, never the header (Risk R5).
- A developer adds body logging at the edge → caught by the PHI-free log-format
  assertion (SPEC-07).

## Acceptance criteria (EARS)
`IF a request targets a protected route without a token that passes the edge check, THEN THE SYSTEM SHALL return 401 and SHALL NOT call any downstream.` (INV-G2)
`THE SYSTEM SHALL NOT make any RBAC/authorization decision; a valid-but-under-privileged token is admitted at the edge and any 403 is the resource server's, forwarded verbatim.` (INV-G5)
`THE SYSTEM SHALL allow CORS only from the configured caregiver-shell origin list and SHALL NOT pair a wildcard origin with credentials.` (ADR-004, Risk R6)
`WHEN requests to POST /acs/auth/login or the EDGE pairing-claim exceed the configured bucket, THE SYSTEM SHALL return 429 and SHALL NOT call the downstream.` (ADR-005)
`THE SYSTEM SHALL strip any client-supplied X-Tenant-Id (and variant) and SHALL NOT inject, read, or forward tenant context.` (INV-G3, Risk R5)
`THE SYSTEM SHALL ensure no log line or error body contains a request body, query value, token content, or identifier.` (INV-G1)
`THE SYSTEM SHALL be proven by an automated test returning 401 on a protected route without a valid token (authz PROVEN — D-642).`
