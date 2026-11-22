# GWY — Structured Brief

> Service: `neuroassist-niv-api-gateway` · Module **GWY — API Gateway** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · **Spring Cloud Gateway** · Infrastructure · No UI · No database · No tenant schema · Messaging disabled · Eureka client.
> Source for the following phases (specs, backlog, scaffold). Captured in automated mode
> from the orchestrator input and verified against the services on disk.

| # | Item | Answer |
|---|---|---|
| 1 | Canonical name / prefix | `api-gateway` (service `neuroassist-niv-api-gateway`) / **GWY** |
| 2 | Problem solved | One stable, authenticated **edge** in front of the NeuroAssist NIV service fleet: a single ingress that routes caregiver-web-shell and patient/edge traffic to the right backend by logical name, performs a coarse JWT edge-check, strips spoofable context headers, and emits a correlation id — without owning any business domain. |
| 3 | Primary / secondary persona | **Primary:** the caregiver web shell (Angular dashboard) and the patient/edge clients, whose every call transits the gateway. **Secondary:** the platform/ops operator who owns route config, CORS origins and rate limits. GWY has **no human end-user persona** and no ACS role. |
| 4 | MVP scope (minimum viable) | Reverse-proxy routing by path to the eight business services via Eureka `lb://`; coarse JWT validation (signature/expiry/issuer) against the ACS **and** EDGE JWKS; anonymous allow-list for login, both JWKS, pairing and health; tenant-header stripping; `X-Correlation-Id` generate-if-absent and propagate; CORS for the caregiver shell origin; in-memory rate limit on login/pairing; PHI-free access logs; per-route timeouts + circuit breaker, no retry on non-idempotent verbs. |
| 5 | Out of scope (MVP) | Terminating authorization / RBAC (stays in each resource server via `@PreAuthorize`); token minting or refresh (owned by ACS/EDGE); JWT-blacklist/revocation enforcement (honored downstream, not at the edge); request/response body transformation or aggregation (no BFF composition); distributed rate limiting across instances (Redis); routing to the DASH module (no backend — ADR) and to REG/MIG (infrastructure, not fronted). |
| 6 | Mandatory external integrations | None external. Internal dependencies: **REG** (Eureka) for service discovery; **ACS** `/acs/.well-known/jwks.json` and **EDGE** `/edge/.well-known/jwks.json` for signature-verification key sets. No outbound call to any third-party API or legacy system. |
| 7 | TechLab AI hub dependencies / inter-module events | **None.** `ai.hasAi = false`; `stack.messaging.enabled = false` — GWY depends on no hub service and publishes/consumes no event. It only forwards synchronous HTTP to business services discovered through Eureka. |
| 8 | Domain anchor event | **None — GWY owns no domain.** Its closest operational anchor is *"Request routed"* (a request admitted at the edge, correlation-stamped and proxied to a downstream service); it generates no business/domain event and no audit of its own (audit is owned by HIST at the resource servers). |

## Route table (verified on disk — `server.port` in each `application.yml`)

| Path predicate | Downstream (`lb://`) | Port (verified) | Anonymous paths at the edge |
|---|---|---|---|
| `/acs/**` | `lb://acs-service` | 8081 | `POST /acs/auth/login`, `GET /acs/.well-known/jwks.json` |
| `/pat/**` | `lb://pat-service` | 8082 | — (all require JWT) |
| `/hist/**` | `lb://hist-service` | 8083 | — |
| `/edge/**` | `lb://edge-service` | 8084 | pairing-claim endpoint (`edge.device.pair`), `GET /edge/.well-known/jwks.json`, EDGE health |
| `/conv/**` | `lb://conv-service` | 8085 | — |
| `/evnt/**` | `lb://evnt-service` | 8086 | — |
| `/gest/**` | `lb://gest-service` | 8088 | — |
| `/trn/**` | `lb://trn-service` | **8089 (PROPOSED)** | — |

- **Health endpoints** (`/actuator/health`) and both JWKS documents are anonymous.
- **No prefix stripping:** each controller already serves under its module base path
  (e.g. ACS serves `/acs/**` — per `acs-service/contracts/api-contract.md` §0); the gateway
  forwards the full path (no `StripPrefix`).
- **DASH:** no route — `dash-service` has no backend (ADR-001-dash-has-no-backend-service,
  confirmed in RAG). **REG** (8761) and **MIG** (no web port) are infrastructure and are
  **not** fronted by the gateway.

## Verified facts that shape the decisions

- **Two trusted token issuers, both via JWKS:** ACS mints caregiver / patient-session tokens
  (`acs-service/contracts/api-contract.md` §0.2); EDGE mints `edge.device` tokens and
  publishes its own JWKS — `edge-service/adr/ADR-002` names **GWY** among the resource
  servers that must trust EDGE's key *alongside* ACS's. The edge check therefore validates
  against **both** JWKS, not ACS alone.
- **Tenant claim is `tenantId`** (camelCase) on the issued token — authoritative in the ACS
  contract. `X-Tenant-Id` is never trusted from the client.
- **Patient-session tokens are non-expiring** (no `exp` — ACS §4.1 / ADR-003). Edge expiry
  validation MUST tolerate an absent `exp`, or every patient-session request would be rejected.
- **Revocation is a `jti` blacklist** honored downstream (ACS introspect / resource servers),
  not at the edge — the gateway does a coarse, stateless check only.
