<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Service: `neuroassist-niv-api-gateway` · Module **GWY — API Gateway** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · **Spring Cloud Gateway** (reactive) · **Infrastructure service** · No UI · No database · No tenant schema · Messaging disabled · Eureka client.
> Reduced vision (docs 01–06 exist but are deliberately thin — GWY owns no business domain).

## Intent

GWY is the **single ingress edge** of the NeuroAssist NIV backend: the one address the
caregiver web shell, the patient app and the edge stations call, from which traffic is
routed by logical service name to the correct business service (ACS, PAT, HIST, EDGE, CONV,
EVNT, GEST, TRN). It is pure infrastructure. It owns no patient data, no gesture data, no
PHI, no tenant schema and no domain model. Its job is narrow and operational: discover
downstreams through Eureka, apply a **coarse** stateless JWT check at the edge, strip
spoofable context headers, stamp a correlation id, guard the few anonymous endpoints
(login, both JWKS, pairing, health) and rate-limit the credential-facing ones — then get
out of the way. Authorization, tenant enforcement and audit remain the resource servers'
responsibility; the gateway is a filter, not an authority.

## Problem Statement

The fleet runs several Spring Boot services on distinct ports (ACS 8081, PAT 8082,
HIST 8083, EDGE 8084, CONV 8085, EVNT 8086, GEST 8088, TRN 8089-proposed), discovered via
a standalone Eureka registry (REG `:8761`, `../neuroassist-niv-service-registry/`). Exposing
each service directly to the caregiver shell and to patient/edge clients would scatter CORS,
TLS termination, a first-pass auth check, correlation-id generation and rate limiting across
every service, and would hard-code host:port into the frontend. A sensitive-data product
(ALS/MND patients, LGPD, PHI) needs one controlled, observable, PHI-free front door where
anonymous paths are an explicit allow-list and everything else is rejected without a valid
token before it ever reaches a backend. GWY exists to be that front door — no more, no less.

## Personas

| Persona | Relationship to GWY |
|---|---|
| **Caregiver web shell** (Angular dashboard, `frontend/`) | Primary client — every dashboard call transits the gateway; origin governed by the CORS policy (ADR-004). |
| **Patient app / edge station** | Clients bearing ACS patient-session or EDGE `edge.device` tokens; pairing and login reach the gateway anonymously, everything else with a token. |
| **Business services** (ACS, PAT, HIST, EDGE, CONV, EVNT, GEST, TRN) | Downstream targets, resolved by logical name via Eureka `lb://`; they re-validate the token and enforce RBAC themselves. |
| **Platform / ops operator** | Owns route config, CORS origin list, rate-limit values and the JWKS URIs; reads gateway `/actuator/health`. |

GWY has **no human end-user persona** and **no ACS role** — it is never the authorization
authority and exposes no business endpoint of its own.

## MVP Scope

- **Routing** by path predicate to the eight business services via Eureka `lb://<name>`,
  forwarding the full path (controllers already carry their module base path — no `StripPrefix`).
- **Coarse edge JWT check** on protected routes: signature, issuer and (when present) expiry,
  verified against the **ACS** and **EDGE** JWKS (two trusted issuers — ADR-002). Tolerant of
  the non-expiring patient-session token (absent `exp`).
- **Anonymous allow-list:** `POST /acs/auth/login`, `GET /acs/.well-known/jwks.json`, the EDGE
  pairing-claim endpoint, `GET /edge/.well-known/jwks.json`, EDGE health and `/actuator/health`.
- **Tenant-header stripping:** drop any client-supplied `X-Tenant-Id`; tenant is derived
  downstream from the JWT `tenantId` claim only (ADR-003).
- **Correlation id:** generate `X-Correlation-Id` if absent, forward it downstream and echo it
  on the response (ADR-007).
- **CORS** for the caregiver shell origin, no wildcard-with-credentials (ADR-004).
- **Rate limiting** on login and pairing — in-memory per-instance for the MVP (ADR-005).
- **PHI-free access logs:** method, route template, status, latency, correlation id only
  (ADR-007).
- **Resilience:** per-route connect/response timeouts, a circuit breaker, and retry only on
  idempotent verbs (ADR-006).

## Out of Scope

- Terminating **authorization / RBAC** — stays in each resource server (`@PreAuthorize`,
  shared `../../adr/ADR-001-hexagonal-architecture.md` business layer). The edge check is
  coarse and advisory, never the last line.
- **Token minting / refresh** (ACS and EDGE own issuance) and **blacklist/revocation**
  enforcement (honored downstream by ACS introspect / resource servers — the edge is stateless).
- **BFF composition / response aggregation / body transformation** — the gateway proxies, it
  does not reshape payloads.
- **Distributed rate limiting** across instances (Redis) — deferred; messaging/cache stack is
  disabled for the MVP (ADR-005).
- Routing to **DASH** (no backend — ADR-001-dash-has-no-backend-service) and to **REG/MIG**
  (infrastructure, not fronted).
- Any **schema, entity, migration or tenant data** — GWY owns none.

## Architectural Principles

1. **Edge, not authority.** The gateway filters and routes; it never becomes the place where
   authorization is decided. Defense in depth — the coarse check never replaces downstream RBAC.
2. **No PHI, ever.** Only method / path-template / status / latency / correlation id are
   logged; bodies, query values and token contents never touch a gateway log line.
3. **Deny by default at the edge.** Everything requires a valid token except an explicit,
   short anonymous allow-list.
4. **Trust the issuers, not the client.** Validate signatures against the ACS and EDGE JWKS;
   strip and re-derive any context a client could spoof (tenant).
5. **Match the fleet, do not move it.** Route by Eureka logical name against the ports and
   base paths the services already expose; the gateway adapts to them.
6. **Stay thin.** Resilience and rate-limit values are config, not code; the gateway carries
   no domain and no persistence.

## Success Signals

- A caregiver-shell request with a valid ACS token reaches the correct downstream by logical
  name, correlation-stamped, with the client-supplied `X-Tenant-Id` (if any) stripped.
- A patient-session request (non-expiring token, no `exp`) is **not** rejected by the edge
  expiry check.
- An `edge.device`-token request validates at the edge against the **EDGE** JWKS (not only ACS).
- `POST /acs/auth/login`, both JWKS, pairing and health succeed with no token; every other
  path without a valid token is rejected `401` before any backend is called.
- Gateway access logs contain no PHI, no bodies and no token contents — only the metadata set.
- Login/pairing rate limits return `429` past the configured threshold; normal traffic is
  unaffected.
- No patient, gesture or tenant data is ever observable in GWY (it stores nothing).
