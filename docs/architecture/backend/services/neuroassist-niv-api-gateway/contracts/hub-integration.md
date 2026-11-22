# GWY — Hub / Platform Integration

> GWY is the **edge** of the platform, not a hub dependent. It calls **no** TechLab
> AI capability (`ai.hasAi = false`) and publishes/consumes **no** event
> (messaging disabled). Its only couplings are platform infrastructure: it is a
> **Eureka client** of REG (to resolve `lb://` targets), it fetches the **ACS and
> EDGE JWKS** for the edge check, and it forwards synchronous HTTP to the eight
> business services. This document records those couplings and the edge contract
> GWY offers its clients.

## 1. GWY as the fleet edge

| Aspect | Value |
|---|---|
| Role | Single controlled ingress; reverse proxy by path predicate → `lb://<service>` |
| Mode | Synchronous HTTP forwarding (reactive/Netty internally); membership resolved via Eureka |
| Direction | Clients call GWY; GWY calls the eight business services + reads REG/JWKS |
| Failure mode for a client | If a downstream is slow/dead, the breaker/timeout returns 503/504 (ADR-006); if REG is briefly unreachable, `lb://` resolution degrades on the client-side cache |

`THE SYSTEM SHALL forward caregiver-shell and patient/edge traffic by path to the correct business service resolved via Eureka.`
`THE SYSTEM SHALL call no hub service and no TechLab AI bounded context.`

## 2. Upstream dependencies (what GWY calls / reads)

| Dependency | Logical id / endpoint | Purpose | On failure |
|---|---|---|---|
| **REG** (Eureka) | `${EUREKA_URI:http://localhost:8761/eureka}` | resolve `lb://<service>` to instances | `lb://` degrades on client-side cache; new routes fail until REG returns (doc 06 Critical dep) |
| **ACS JWKS** | `/acs/.well-known/jwks.json` | signing keys for ACS-issued tokens (issuer 1) | cached keys used until refresh; a cold miss on a rotated key fails verification until refresh |
| **EDGE JWKS** | `/edge/.well-known/jwks.json` | signing keys for `edge.device` tokens (issuer 2, ADR-002) | idem |
| **Eight business services** | `lb://{acs,pat,hist,edge,conv,evnt,gest,trn}-service` | the proxied downstreams | per-route breaker/timeout (ADR-006) |

> GWY **registers** with REG like any other client (`neuroassist-niv-api-gateway`
> logical id) and is the **most discovery-dependent** client in the fleet (it
> resolves every `lb://` target). See REG `contracts/hub-integration.md` §2.

`THE SYSTEM SHALL register with REG as a Eureka client and resolve every lb:// route target through REG.`
`THE SYSTEM SHALL fetch and cache the ACS and EDGE JWKS and SHALL handle key rotation for both.`

## 3. TechLab AI

None. GWY consumes no TechLab AI bounded context (orchestration,
document_composition, knowledge, analytics) — `ai.hasAi = false`. See
`contracts/techlab-ai-integration.md`.

`THE SYSTEM SHALL NOT call any TechLab AI bounded context.`

## 4. Header / context propagation

GWY carries **no** business request context of its own. It propagates a
correlation id and strips the client tenant header, but it never reads, derives, or
forwards a tenant context — tenant is derived downstream from the signed `tenantId`
claim, not at the edge (ADR-003, INV-G3).

`WHEN a request lacks X-Correlation-Id, THE SYSTEM SHALL generate one, forward it to the downstream, and echo it on the response.` (INV-G4)
`THE SYSTEM SHALL strip any client-supplied tenant header and SHALL NOT read, derive, or forward tenant context.` (INV-G3)
`THE SYSTEM SHALL never log, store, or forward PHI — only method, route template, status, latency, and correlation id appear in its own logs.` (INV-G1)
