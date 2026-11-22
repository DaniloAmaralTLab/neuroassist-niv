<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Service: `neuroassist-niv-api-gateway` · Module **GWY — API Gateway** · Infrastructure · **Spring Cloud Gateway** · No DB · No UI · Eureka client.

## System Boundary

Inside the boundary: route table (path predicate → `lb://<service>`), a global filter chain
(correlation id, tenant-header strip, coarse JWT edge check, access logging), the anonymous
allow-list, CORS config, rate-limit config and per-route resilience config. Outside the
boundary: all business logic, all persistence, all authorization *decisions*, token issuance
and revocation, and audit — these live in the resource servers and in ACS/EDGE. GWY holds no
aggregate and no schema; it is a stateless reactive proxy whose entire configuration is route
and filter declaration.

## External Actors and Systems

| Actor / system | Nature | Interaction with GWY |
|---|---|---|
| **Caregiver web shell** (Angular) | human-driven client | HTTPS calls to `/acs`, `/pat`, `/hist`, `/evnt`, `/gest`, `/conv`, `/trn`; bears an ACS caregiver token; origin allow-listed by CORS. |
| **Patient app** | client (patient-session token) | login/anonymous bootstrap then `/conv`, `/gest`; token is **non-expiring**. |
| **Edge station** | non-human (`edge.device` token) | pairing-claim (anonymous), then `/edge`, `/evnt` with the EDGE-issued token. |
| **REG — Eureka** (`:8761`) | infrastructure | GWY is a **Eureka client**; resolves every `lb://` target. `EUREKA_URI` default `http://localhost:8761/eureka`. |
| **ACS** `/acs/.well-known/jwks.json` | key source | public key set for caregiver / patient-session signatures. |
| **EDGE** `/edge/.well-known/jwks.json` | key source | public key set for `edge.device` signatures (ADR-002 lists GWY as a trusting resource server). |
| Business services (ACS, PAT, HIST, EDGE, CONV, EVNT, GEST, TRN) | downstream | proxied targets; each re-validates the token and enforces RBAC. |

Not actors for GWY: **DASH** (no backend), **MIG** (no web port), third-party APIs,
message brokers (messaging disabled), TechLab AI hub (`ai.hasAi = false`).

## End-to-End Flows

**Golden path — authenticated caregiver call.**
1. Caregiver shell sends `GET /hist/events?...` with `Authorization: Bearer <acs-jwt>` and no
   (or spoofed) `X-Tenant-Id`.
2. CORS filter admits the known origin; correlation filter sets `X-Correlation-Id` if absent.
3. Tenant-strip filter removes any inbound `X-Tenant-Id`.
4. Edge JWT filter verifies the signature against the ACS JWKS, checks issuer and `exp`
   (present here) → valid.
5. Route predicate `/hist/**` → `lb://hist-service`; Eureka resolves the instance; request is
   proxied with the full path and the correlation id.
6. `hist-service` re-validates the token, derives tenant from `tenantId`, enforces
   `@PreAuthorize`, returns the response; GWY echoes `X-Correlation-Id`.

**Patient-session path — non-expiring token.** Same as golden, except the token has **no**
`exp`; the edge expiry check tolerates its absence (ADR-002) and does not reject.

**Edge-device path — second issuer.** An `edge.device` token is verified against the **EDGE**
JWKS (not ACS); the route forwards to `lb://edge-service` / `lb://evnt-service`.

**Anonymous path.** `POST /acs/auth/login`, both JWKS, the EDGE pairing-claim endpoint, EDGE
health and `/actuator/health` skip the JWT filter; login and pairing additionally pass the
rate-limit filter (ADR-005).

**Rejection path.** A protected route with a missing/invalid/wrong-issuer token is rejected
`401` at the edge, before any `lb://` call; the rejection log carries method, path template,
status and correlation id only.

## Internal Boundaries

GWY is **not hexagonally layered** — it has no domain, application or infrastructure adapter
to separate (shared `../../adr/ADR-001-hexagonal-architecture.md` governs the business
services, not this proxy). The whole service is a bootstrap class plus declarative config:

```
src/main/java/com/neuroassist/gateway/
+-- GatewayApplication.java        @SpringBootApplication @EnableDiscoveryClient
+-- filter/                        global filters: correlation-id, tenant-strip,
                                   coarse JWT edge check, PHI-free access log

src/main/resources/
+-- application.yml                spring.cloud.gateway.routes[*] (Path -> lb://<svc>),
                                   security (JWKS URIs, anonymous allow-list),
                                   globalcors, resilience4j (timeouts/CB), rate limits
```

The **scaffold** phase owns the actual `GatewayApplication`, filters and `application.yml`;
this vision phase produces no code.

## Cross-cutting Concerns

- **Security (coarse edge check — ADR-002).** Stateless validation of signature / issuer /
  expiry against the ACS **and** EDGE JWKS. Deny-by-default with an explicit anonymous
  allow-list. The edge check is **advisory, not terminal**: resource servers re-validate and
  own RBAC and the `jti`-blacklist/revocation check (gateway is stateless, does not call
  introspect per request).
- **Multi-tenancy (ADR-003).** `X-Tenant-Id` is stripped at the edge; tenant is derived
  downstream from the `tenantId` claim (`../acs-service/contracts/api-contract.md` §0.2).
  GWY propagates no tenant context of its own.
- **Observability (ADR-007).** `X-Correlation-Id` generate-if-absent → forward → echo. Access
  logs are **PHI-free**: method, path template, status, latency, correlation id — never
  bodies, query values or token contents. `/actuator/health` exposed for liveness.
- **Resilience (ADR-006).** Per-route connect/response timeouts, a resilience4j circuit
  breaker per downstream, and retry limited to idempotent verbs (never `POST`/`PATCH`).
- **CORS (ADR-004).** Explicit caregiver-shell origin(s); no wildcard origin combined with
  credentials.
- **Rate limiting (ADR-005).** In-memory per-instance limiter on `POST /acs/auth/login` and
  the EDGE pairing-claim endpoint; `429` past threshold.
