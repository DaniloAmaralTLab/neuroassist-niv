# ACS — Integration Contracts

> Service: `acs-service` · Module **ACS — Caregivers and Access** · Project: NeuroAssist NIV
> EARS guide: `../../../standards/ears-notation.md`.

## 1. External systems

**None in the MVP.** ACS uses **framework-native** username/password authentication (Spring
Security as authorization server). There is no third-party IdP, no external OAuth/SSO, no
external PII processor, and no message broker (doc 04 §External Integrations). Deployment is
internal-network only (OPS-002); TLS is mandatory outside localhost (TECH-006).

## 2. Intra-project integrations (synchronous REST)

All relationships are synchronous REST over the internal network; messaging is disabled.

### 2.1 ACS → HIST (`hist-service`) — audit sink

| Aspect | Value |
|---|---|
| Direction | outbound (ACS is client) |
| Transport | Feign/REST `POST {hist.baseUrl}/audit` |
| Auth | internal service token (ACS-issued service JWT) carrying `hist.audit.record` (hist-service api-contract §1) |
| Payload | audit envelope — see `event-contracts.md` §1.1 |
| Discovery | Eureka (REG) service id `hist-service` |
| Base URL | `hist.base-url` / `HIST_BASE_URL` resolves to the HIST root **including** `/hist` (dev `http://localhost:8083/hist`; via REG `lb://hist-service/hist`) — D-640 |

EARS:

- WHEN ACS commits a state-changing use case, THE SYSTEM SHALL call HIST `/audit` synchronously within the request.
- IF HIST is unreachable for a commit+durable-retry action, THEN THE SYSTEM SHALL commit the access change locally and enqueue the audit for idempotent durable retry (event-contracts §1.2, ADR-005).
- THE producer config `hist.base-url` SHALL include the `/hist` segment so the literal call `POST {hist.baseUrl}/audit` reaches `/hist/audit` (D-640, hist-service integration-contracts §1), and the service-client JWT SHALL carry `hist.audit.record`. Config/token tracked by **INT-ACS-006**.

### 2.2 All resource servers → ACS — token validation

ACS is the authorization server every other module trusts.

| Aspect | Value |
|---|---|
| Direction | inbound (ACS is provider) |
| Surface | `GET /acs/.well-known/jwks.json` (signature verification) and `POST /acs/auth/introspect` (blacklist-aware validation) |
| Consumers | GWY, PAT, EVNT, GEST, EDGE, HIST, DASH, CONV, TRN |

EARS:

- WHEN a resource server verifies an ACS-issued JWT via JWKS, THE SYSTEM SHALL serve the active public key(s) so the signature validates.
- WHERE a resource server needs revocation-aware validation, THE SYSTEM SHALL expose `/acs/auth/introspect` returning `active:false` for a blacklisted `jti`.

### 2.3 ACS → MIG (`neuroassist-niv-migrations`) — schema ownership

ACS **authors** its Flyway scripts (data-model §5) but does **not** run Flyway at start;
MIG applies them across `neuroassist_global` and every `t_<tenantId>` schema. New tenant
onboarding triggers provisioning of the `t_<tenantId>` schema through the same centralized
path.

### 2.4 Referenced-by-id (no call, no FK)

- **PAT (`pat-service`)** — owns `Patient`; ACS stores `patient_id` on links and sessions.
- **EDGE (`edge-service`)** — owns the device identity; ACS stores `device_id` on sessions
  and validates (but does not mint) edge device tokens.

## 3. Resilience strategy

| Dependency | Timeout | Retry | Circuit breaker | Fallback |
|---|---|---|---|---|
| HIST (audit, hard-502 facts — ADR-005) | 2s | none (fail request) | open after 5 consecutive failures | roll back use case → `502 audit-unavailable` |
| HIST (audit, commit+durable-retry facts — ADR-005) | 2s | durable queue + backoff | n/a | commit locally, enqueue idempotent audit retry |
| JWKS / introspect consumers | — | client-side cache of JWKS (resource servers) | n/a | cached keys |

EARS:

- IF the HIST circuit breaker is open, THEN THE SYSTEM SHALL fail hard-502 actions fast with `502` and SHALL continue to serve commit+durable-retry actions (revocation/login never blocked — ADR-005, SEC-001).
- THE SYSTEM SHALL apply a 2-second timeout to every outbound HIST call.
