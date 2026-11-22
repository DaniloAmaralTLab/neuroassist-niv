# GWY — Integration Contracts

> GWY integrates with **no external SaaS / AI / messaging / datastore** (doc 04
> §External Integrations). Its couplings are all platform-internal: the eight
> business services it fronts (downstream), the **two JWKS issuers** it verifies
> tokens against, the Eureka registry (REG) it discovers through, and the
> observability stack it logs to. This document is the authoritative source for the
> **configuration keys** the scaffold must wire — route targets, JWKS URIs, CORS
> allow-list, rate-limit buckets, and per-route resilience.

## 1. Downstream business services (sync HTTP, `lb://`)

| Route | Logical id (`lb://`) | Port | Status |
|---|---|---|---|
| `/acs/**` | `acs-service` | 8081 | verified |
| `/pat/**` | `pat-service` | 8082 | verified |
| `/hist/**` | `hist-service` | 8083 | verified |
| `/edge/**` | `edge-service` | 8084 | verified |
| `/conv/**` | `conv-service` | 8085 | verified |
| `/evnt/**` | `evnt-service` | 8086 | verified |
| `/gest/**` | `gest-service` | 8088 | verified |
| `/trn/**` | `trn-service` | **8089 — CONFIRMED (G2 closed: trn-service/src/main/resources/application.yml)** | verified |

`THE SYSTEM SHALL route each of the eight business paths to its logical downstream by lb://, resolved through Eureka.`
`THE SYSTEM SHALL route /trn/** to lb://trn-service on port 8089 (CONFIRMED — Gap G2 closed).`

## 2. Two JWKS issuers (edge token verification — ADR-002)

The edge check trusts **both** issuers. A misconfiguration that wires only one
breaks the other's clients (Risk R1 — if only ACS is wired, every `edge.device`
request is rejected).

| Issuer | JWKS URI (config key) | Signs | Notes |
|---|---|---|---|
| **ACS** | `gateway.jwks.acs-uri` → `/acs/.well-known/jwks.json` | caregiver + **patient-session** tokens | patient-session tokens have **no `exp`** (ACS §4.1) |
| **EDGE** | `gateway.jwks.edge-uri` → `/edge/.well-known/jwks.json` | `edge.device` tokens | EDGE ADR-002 names GWY as a trusting resource server |

Verification rules (full spec: SPEC-03):
- Accept a token whose signature validates against **either** JWKS (multi-issuer
  trust fabric, INV-G6).
- Validate `exp` **only when the claim is present**; an absent `exp` is valid
  (patient-session non-expiring, Risk R2).
- The tenant claim name on the token is **`tenantId`** (camelCase, ACS contract) —
  but GWY **does not parse it**; it only strips the inbound `X-Tenant-Id` header
  (ADR-003). Claim name recorded here for downstream reference, not for GWY to read.
- Revocation (`jti`-blacklist) is **not** checked at the edge — honored downstream
  (INV-G5).

`THE SYSTEM SHALL verify the JWT signature against both the ACS and the EDGE JWKS and SHALL admit a token signed by either.` (INV-G6)
`WHERE a token lacks an exp claim, THE SYSTEM SHALL treat it as valid for the edge check (patient-session tokens are non-expiring).`
`THE SYSTEM SHALL NOT parse the tenantId claim and SHALL NOT enforce the jti-blacklist at the edge.`

## 3. Eureka (`lb://`) discovery config — ADR-006

| Config key | Value / default |
|---|---|
| `eureka.client.service-url.defaultZone` | `${EUREKA_URI:http://localhost:8761/eureka}` |
| `eureka.instance.prefer-ip-address` | `true` |
| `eureka.instance.instance-id` | `${spring.application.name}:${server.port}` |
| `spring.cloud.gateway.discovery.locator.enabled` | `false` (routes are declared explicitly, not auto-located) |

`THE SYSTEM SHALL resolve lb:// targets exclusively through the Eureka defaultZone and SHALL declare routes explicitly (no discovery auto-locator).`
`IF REG is unreachable, THEN THE SYSTEM SHALL resolve from its client-side registry cache and SHALL degrade routing only for targets it has never cached.`

## 4. CORS allow-list — ADR-004

| Config key | Value |
|---|---|
| `gateway.cors.allowed-origins` | explicit caregiver-shell origin(s) per env (dev / pilot / prod) — **never `*`** with credentials (A3) |
| `gateway.cors.allowed-methods` | `GET, POST, DELETE, OPTIONS` |
| `gateway.cors.allowed-headers` | `Authorization, X-Correlation-Id, Content-Type` |
| `gateway.cors.exposed-headers` | `X-Correlation-Id` |
| `gateway.cors.allow-credentials` | `true` (paired only with the concrete origin list) |

`THE SYSTEM SHALL allow CORS only from the configured caregiver-shell origin list and SHALL NOT pair a wildcard origin with credentials.` (Risk R6)
`WHEN a browser sends a CORS preflight (OPTIONS) from an allowed origin, THE SYSTEM SHALL answer it at the edge without forwarding to a downstream.`

## 5. Rate-limit buckets — ADR-005 (in-memory, per-instance)

| Bucket | Applies to | Config keys | Default (Gap G4 — tune per env) |
|---|---|---|---|
| **login** | `POST /acs/auth/login` | `gateway.ratelimit.login.capacity`, `.refill-per-minute` | e.g. 5/min/key (proposed) |
| **pairing** | EDGE pairing-claim endpoint | `gateway.ratelimit.pairing.capacity`, `.refill-per-minute` | e.g. 10/min/key (proposed) |

- Keyed by client IP, plus a secondary key where available (username prefix for
  login, pairing-code prefix for pairing) to reduce shared-NAT over-throttling.
- Thresholds are **configuration**, not hard-coded (ADR-005). The *values* are a
  specs proposal (Gap G4); the *mechanism and endpoints* are fixed.
- No Redis / no distributed counter in the MVP (messaging/cache stack disabled).

`WHEN requests to POST /acs/auth/login or the EDGE pairing-claim exceed the configured bucket, THE SYSTEM SHALL return 429 Too Many Requests and SHALL NOT call the downstream.`
`THE SYSTEM SHALL read rate-limit thresholds from configuration, not from code.`
`THE SYSTEM SHALL NOT rate-limit any route other than login and pairing at the edge in this phase.`

## 6. Per-route resilience (circuit breaker + timeouts + retry) — ADR-006

| Config key | Meaning | Default (tune per env) |
|---|---|---|
| `gateway.resilience.<route>.connect-timeout` | TCP connect timeout | e.g. 2s |
| `gateway.resilience.<route>.response-timeout` | response read timeout → **504** on exceed | e.g. 5s (longer for TRN/CONV if needed) |
| `resilience4j.circuitbreaker.instances.<route>.*` | breaker per downstream → **503** fallback when open | standard sliding window |
| `gateway.resilience.<route>.retry.methods` | idempotent verbs only (`GET`) | **never** `POST/PATCH/DELETE`-with-effects |

- Retry is **idempotent-only** — never on login, pairing or event-report (Risk R8).
- The breaker fallback response is **fast and PHI-free** (INV-G1).

`THE SYSTEM SHALL apply a per-route connect and response timeout; IF the response timeout is exceeded, THEN THE SYSTEM SHALL return 504.`
`WHILE a route's circuit breaker is open, THE SYSTEM SHALL return a fast PHI-free 503 fallback rather than call the downstream.`
`THE SYSTEM SHALL retry only idempotent verbs and SHALL NEVER auto-retry login, pairing, or event-report requests.` (Risk R8)

## 7. Framework gap — the generated gateway config does NOT ship this wiring

> **Important for the backlog/scaffold.** The current gateway templates
> (`code/java/security-config-gateway.java.j2`, `code/yaml/application-gateway.yml.j2`)
> emit a **minimal** config that this contract must be wired onto by hand:
>
> - `application-gateway.yml.j2` ships `spring.cloud.gateway.routes: []` (empty, with
>   a `TODO[SCAFFOLD]`) and a **single** `spring.security.oauth2.resourceserver.jwt.issuer-uri`
>   pointing at a Keycloak realm — **not** the two `jwk-set-uri` sources this project
>   needs, and **not** `jwk-set-uri` at all.
> - `security-config-gateway.java.j2` is WebFlux (`@EnableWebFluxSecurity`, correct —
>   **not** the servlet `@EnableMethodSecurity`), but `permitAll` covers only
>   `/actuator/health` + `/actuator/prometheus`; it does **not** read the
>   `public_paths` from `generator-config.yml`, and wires a single `jwt(jwt -> {})`.
>
> The backlog must therefore produce explicit issues to: (a) populate the eight
> routes (§1), (b) replace the single `issuer-uri` with **two `jwk-set-uri`** (ACS +
> EDGE, §2) and a multi-issuer `ReactiveAuthenticationManagerResolver`, (c) wire the
> anonymous allow-list (api-contract §3), (d) add CORS (§4), rate limit (§5), and
> resilience (§6), and (e) **prove** the authz boundary with a 401/403 test
> (lesson D-642 — authz must be PROVEN, see SPEC-03/SPEC-06).

## 8. Explicitly absent integrations

| Integration class | Present? | Why |
|---|---|---|
| PostgreSQL / datastore | No | no business or tenant state (doc 05) |
| Messaging / broker | No | messaging disabled platform-wide; not an event participant (doc 04) |
| TechLab AI | No | `ai.hasAi = false` (`_brief.md` §7) |
| External SaaS / legacy | No | no outbound third-party call (`_brief.md` §6, doc 04) |

`THE SYSTEM SHALL integrate only with the eight business services (downstream), REG, the two JWKS issuers, and the observability stack.`
