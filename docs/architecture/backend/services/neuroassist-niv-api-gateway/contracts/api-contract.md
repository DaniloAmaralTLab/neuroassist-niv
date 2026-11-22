# GWY — API Contract (Edge Surface)

> GWY exposes **no business resources of its own**. Its "API surface" is the
> **route table** (path predicate → `lb://<service>` target), the **anonymous
> allow-list**, the **header contract** it enforces on every forwarded request, the
> **error model** it returns when it short-circuits, and its own Actuator
> **health** endpoint. It **routes, never composes** (ADR-001): no aggregation, no
> body transformation, no domain endpoint.
>
> EARS invariants per the local ADRs (`adr/ADR-001`..`ADR-007`) and the domain
> invariants `INV-G1..G6` declared in `03-initial-domain-framing.md`. Guide:
> `docs/architecture/backend/standards/ears-notation.md`.

## 1. Nature of the surface

GWY authors no REST contract by hand. The surface is a declarative Spring Cloud
Gateway route table plus a global filter chain, configured in `application.yml` and
a small set of filter/config classes. Clients address the **business** path
(`/acs/**`, `/pat/**`, …); the gateway forwards the **full path** with no
`StripPrefix` — each controller already serves under its module base path
(Assumption A1, `_brief.md`).

`THE SYSTEM SHALL expose a declarative route table that forwards each path predicate to its lb:// downstream.`
`THE SYSTEM SHALL author no business REST resource of its own.`
`THE SYSTEM SHALL NOT aggregate, compose, or transform request/response bodies (no BFF).`

## 2. Route table

Each route matches a path predicate and forwards to a Eureka logical id by
`lb://`. **No prefix stripping** — the full path is forwarded. Ports are the
downstreams' own `server.port` (for reference / discovery sanity only; routing is
by logical name, not port).

| # | Path predicate | Downstream (`lb://`) | Port (verified) | Access class | Rate-limit class | Timeout/breaker |
|---|---|---|---|---|---|---|
| R1 | `/acs/**` | `lb://acs-service` | 8081 | authenticated **+ public subset** (§3) | login bucket on `POST /acs/auth/login` | per-route (§ integration) |
| R2 | `/pat/**` | `lb://pat-service` | 8082 | authenticated | — | per-route |
| R3 | `/hist/**` | `lb://hist-service` | 8083 | authenticated | — | per-route |
| R4 | `/edge/**` | `lb://edge-service` | 8084 | authenticated **+ public subset** (§3) | pairing bucket on pairing-claim | per-route |
| R5 | `/conv/**` | `lb://conv-service` | 8085 | authenticated | — | per-route |
| R6 | `/evnt/**` | `lb://evnt-service` | 8086 | authenticated | — | per-route |
| R7 | `/gest/**` | `lb://gest-service` | 8088 | authenticated | — | per-route |
| R8 | `/trn/**` | `lb://trn-service` | **8089 (CONFIRMED — G2 closed: trn-service/src/main/resources/application.yml `server.port=8089`)** | authenticated | — | per-route |

- **R8 `/trn/**` is CONFIRMED:** `trn-service` `server.port=8089` verified against
  `backend/services/trn-service/src/main/resources/application.yml` (Gap G2 closed).
- **Not fronted:** **REG** (`:8761`), **MIG** (no web port) — infrastructure; and
  **DASH** — `dash-service` has no backend (dash ADR-001-dash-has-no-backend-service).
  GWY declares **no** route for any of them.

`WHEN a request path matches a route predicate, THE SYSTEM SHALL forward it by lb:// to that logical downstream, preserving the full path.`
`THE SYSTEM SHALL route only to the eight business services (ACS, PAT, HIST, EDGE, CONV, EVNT, GEST, TRN).`
`THE SYSTEM SHALL NOT declare a route to REG, MIG, or DASH.`
`THE SYSTEM SHALL NOT strip any path prefix before forwarding.`

## 3. Anonymous allow-list (public paths)

Every route is **deny-by-default** (INV-G2): the edge JWT check (§5, SPEC-03) runs
before any `lb://` call, except for the explicit public paths below, which bypass it.

| Public path | Method | Why anonymous |
|---|---|---|
| `/acs/auth/login` | `POST` | credential exchange — no token exists yet (ACS §0.2) |
| `/acs/.well-known/jwks.json` | `GET` | ACS public signing keys (needed to verify tokens) |
| `/edge/.well-known/jwks.json` | `GET` | EDGE public signing keys (second issuer, ADR-002) |
| `/edge/devices/pair` | `POST` | **(CONFIRMED — G3 closed: edge-service/contracts/api-contract.md)** code-authenticated via `X-Pairing-Code`, public at the gateway, rate-limited (pairing bucket). |
| `/edge/actuator/health` | `GET` | EDGE liveness probe |
| `/actuator/health` | `GET` | the gateway's **own** liveness (§6) |

- **G3 closed:** EDGE exact paths confirmed against `edge-service/contracts/api-contract.md`:
  `POST /edge/devices/pair` (code-authenticated, `X-Pairing-Code`, rate-limited),
  `GET /edge/.well-known/jwks.json` (public), `GET /edge/health` (public).
  Allow-list is now authoritative.
- The allow-list is **exact-path**, not prefix: `/acs/**` is protected even though
  `/acs/auth/login` and `/acs/.well-known/jwks.json` under it are public.

`THE SYSTEM SHALL bypass the edge JWT check only for the exact paths on the anonymous allow-list.`
`IF a request targets any path outside the anonymous allow-list, THEN THE SYSTEM SHALL require a token that passes the edge check before any lb:// call.`
`WHERE a public path is a prefix of a protected route, THE SYSTEM SHALL still protect every non-allow-listed path under that route.`

## 4. The gateway's own endpoints

GWY exposes only operational endpoints — no business endpoint.

| Path | Purpose | Exposure |
|---|---|---|
| `/actuator/health` | liveness of the gateway process | anonymous (allow-listed) |
| `/actuator/prometheus` | gateway metrics (routes, latencies, 4xx/5xx, breaker state) | platform-internal |

Other Actuator endpoints that could echo config, routes with secrets, or env are
**not** publicly exposed (ADR-007).

`THE SYSTEM SHALL expose /actuator/health for liveness and /actuator/prometheus for metrics, and SHALL NOT expose actuator endpoints that could echo configuration or secrets.`

## 5. Header contract

The gateway rewrites a small, fixed set of headers on every forwarded request and
on the response.

| Header | Inbound handling | Forwarded downstream | On response |
|---|---|---|---|
| `X-Correlation-Id` | preserved if present; **generated if absent** (ADR-007, INV-G4) | always present | **echoed** |
| `X-Tenant-Id` (and tenant-ish variants) | **stripped** — never trusted from the client (ADR-003, INV-G3) | never forwarded | n/a |
| `Authorization: Bearer <jwt>` | read for the coarse edge check (§ SPEC-03); **not** consumed/rewritten | **forwarded unchanged** to the resource server | n/a |
| CORS headers (`Origin`, preflight) | admitted per the allow-list (ADR-004, SPEC-06) | n/a (browser concern) | `Access-Control-*` set; `X-Correlation-Id` exposed |

`WHEN a request lacks X-Correlation-Id, THE SYSTEM SHALL generate one, forward it downstream, and echo it on the response.` (INV-G4)
`WHEN a request carries an X-Correlation-Id, THE SYSTEM SHALL preserve it rather than overwrite it.`
`THE SYSTEM SHALL strip any client-supplied X-Tenant-Id (and tenant-context header variant) before forwarding.` (INV-G3)
`THE SYSTEM SHALL forward the Authorization bearer token unchanged to the resource server (the edge check never consumes or rewrites it).`

## 6. Error model

When GWY short-circuits (it does not reach, or chooses not to reach, a downstream),
it returns a **PHI-free JSON** body. The shape follows RFC 7807 ProblemDetail, and
carries the correlation id in a field and in the echoed header; it **never** carries
a request body, query value, token content, or any identifier.

```json
{
  "type": "https://neuroassist.niv/errors/<slug>",
  "title": "<short reason>",
  "status": 401,
  "detail": "<generic, PHI-free reason>",
  "correlationId": "<X-Correlation-Id>"
}
```

| Status | When | Source |
|---|---|---|
| `401 Unauthorized` | missing/invalid/expired/wrong-issuer token on a protected route (edge check fails) | GWY edge check (SPEC-03) |
| `403 Forbidden` | reserved — GWY does **not** make RBAC decisions; a 403 at the edge only occurs for CORS-rejected or structurally forbidden requests. Business `403` comes from the resource server, forwarded verbatim. | downstream (forwarded) / CORS |
| `429 Too Many Requests` | login or pairing rate-limit threshold exceeded (ADR-005) | GWY rate limiter (SPEC-06) |
| `502 Bad Gateway` | downstream returned an unusable/invalid response | GWY proxy |
| `503 Service Unavailable` | no healthy `lb://` instance (discovery empty) or breaker **open** fallback (ADR-006) | GWY resilience |
| `504 Gateway Timeout` | downstream exceeded the per-route response timeout (ADR-006) | GWY resilience |

`IF the edge check fails on a protected route, THEN THE SYSTEM SHALL return 401 with a PHI-free ProblemDetail body and SHALL NOT call any downstream.`
`IF the login or pairing rate-limit threshold is exceeded, THEN THE SYSTEM SHALL return 429 and SHALL NOT call the downstream.`
`IF a downstream times out, THEN THE SYSTEM SHALL return 504; IF its circuit breaker is open or no healthy instance exists, THEN THE SYSTEM SHALL return 503.`
`IF a downstream returns an unusable response, THEN THE SYSTEM SHALL return 502.`
`THE SYSTEM SHALL ensure no error body or log line produced at the edge contains a request body, query value, token content, or identifier.` (INV-G1)
`THE SYSTEM SHALL NOT make any RBAC/authorization decision; an under-privileged-but-valid token is admitted at the edge and a 403, if any, is the resource server's, forwarded verbatim.` (INV-G5)

## 7. Auth model (summary — full posture in SPEC-06 / SPEC-03)

- The edge performs a **coarse, stateless** JWT check (signature / issuer /
  expiry-when-present) against **two** JWKS (ACS + EDGE — ADR-002, INV-G6).
- An **absent `exp`** is treated as valid (patient-session tokens are non-expiring
  by design — ACS §4.1; Risk R2).
- The check is **advisory, not terminal** (INV-G5): resource servers re-validate,
  enforce `@PreAuthorize`/RBAC and the `jti`-blacklist. GWY does **not** call ACS
  introspect per request.

`THE SYSTEM SHALL accept tokens signed by either the ACS or the EDGE JWKS and SHALL NOT reject an edge.device token for not being ACS-signed.` (INV-G6)
`WHERE a token has no exp claim, THE SYSTEM SHALL treat it as non-expiring for the edge check.`
