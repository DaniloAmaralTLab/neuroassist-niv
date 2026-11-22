# SPEC-10 — Integrations

## Objective
Specify GWY's integrations: the eight downstream business services, the two JWKS
issuers, Eureka (REG) discovery, the caregiver-shell CORS origins, and the
observability stack. GWY has **no external SaaS / AI / messaging / datastore**
integration.

## Scope
**In:** downstream routing targets (`lb://`); ACS + EDGE JWKS; Eureka client config;
CORS allow-list; rate-limit buckets; per-route resilience config; observability
logs/metrics.
**Out:** external SaaS/legacy, TechLab AI, broker, datastore — all absent.

## Technical decisions
- Downstreams resolved by **Eureka `lb://`** (ADR-006); `/trn/**` CONFIRMED: `trn-service`
  port 8089 (Gap G2 closed).
- **Two JWKS issuers** trusted (ACS + EDGE, ADR-002); authoritative config keys in
  `contracts/integration-contracts.md` §2.
- CORS origins (§4), rate-limit buckets (§5), and per-route breaker/timeout (§6) are
  all **configuration**, not code.
- **Framework gap (integration-contracts §7):** the generated gateway config ships
  empty routes and a single Keycloak `issuer-uri` — the scaffold must wire the
  routes, the two `jwk-set-uri`, the allow-list, CORS, rate limit and resilience by
  hand, and prove authz with a 401/403 test (D-642).

## Implementation
- Inbound: browser/patient/edge clients call GWY; GWY forwards to the eight services.
- Upstream reads: REG (`lb://` resolution), ACS JWKS, EDGE JWKS.
- Outbound: PHI-free logs/metrics → Elasticsearch (best-effort).
- Resilience: per-route timeout + breaker + idempotent-only retry (SPEC-02).

## Edge cases
- REG briefly unreachable → `lb://` resolves on the client-side cache; never-cached
  targets fail until REG returns.
- One JWKS unreachable → cached keys used until refresh; a cold miss on a rotated key
  fails verification until refresh (Assumption A2).
- TRN not yet deployed → `/trn/**` resolves to no instance → `503` (not a crash).
- Observability stack down → GWY keeps routing; logging is best-effort.

## Acceptance criteria (EARS)
`THE SYSTEM SHALL integrate only with the eight business services (downstream), REG, the ACS and EDGE JWKS issuers, and the observability stack.`
`THE SYSTEM SHALL resolve lb:// targets through the Eureka defaultZone; /trn/** routes to lb://trn-service on port 8089 (CONFIRMED).`
`THE SYSTEM SHALL read CORS origins, rate-limit thresholds, and per-route resilience values from configuration, not from code.`
`THE SYSTEM SHALL NOT integrate with any external SaaS, AI, datastore, or messaging system.`
`IF the observability stack is unavailable, THEN THE SYSTEM SHALL continue routing and the edge check.`
