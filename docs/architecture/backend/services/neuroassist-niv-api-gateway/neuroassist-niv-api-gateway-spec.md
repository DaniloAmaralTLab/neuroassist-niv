---
module: GWY
service: neuroassist-niv-api-gateway
package: com.neuroassist.gateway
bounded_context: gateway
classification: infrastructure
hasUi: false
isInfrastructure: true
persistence: none
messaging: none
stage: specs
generatedBy: /be-architect-specs
sourceVision:
  - _brief.md
  - 01-architectural-vision.md
  - 02-architecture-blueprint.md
  - 04-backend-architecture-direction.md
  - 05-persistence-model.md
  - 06-risks-gaps-assumptions.md
adrRefs:
  - adr/ADR-001-service-boundary-single-gateway.md
  - adr/ADR-002-edge-jwt-validation-defense-in-depth.md
  - adr/ADR-003-tenant-header-handling.md
  - adr/ADR-004-cors-policy-caregiver-shell.md
  - adr/ADR-005-rate-limiting-login-pairing.md
  - adr/ADR-006-routing-and-resilience.md
  - adr/ADR-007-observability-correlation-and-phi-free-logs.md
  - ../../adr/ADR-001-hexagonal-architecture.md (project-wide hexagonal — context only, NOT applied; GWY is a declarative reactive proxy, not a layered domain service)
  - ../../adr/ADR-002-modular-monolith.md (project-wide — context)
  - ../../adr/ADR-003-multi-tenancy.md (project-wide multi-tenancy — applies only as "strip client tenant header"; GWY parses no claim)
---

# GWY — neuroassist-niv-api-gateway — Specs Entry Point

> GWY is an **infrastructure / platform service** (`isInfrastructure: true`,
> `hasUi: false`). It is the single **Spring Cloud Gateway** (reactive / WebFlux /
> Netty) ingress in front of the NeuroAssist NIV service fleet: it routes
> caregiver-web-shell and patient/edge traffic to the right backend by logical name
> (`lb://`), performs a coarse edge JWT check against **two** JWKS issuers (ACS and
> EDGE), strips spoofable context headers, emits a correlation id, enforces CORS and
> login/pairing rate limits, and ships PHI-free access logs — while owning **no
> business domain, no schema, no messaging, no tenant concept, no PHI**. The spec
> set below is adapted to that nature: domain-shaped SPECs (data model, messaging)
> are present but explicitly marked **Not Applicable** with the recorded rationale,
> so the backlog and scaffold commands do not infer a domain model, a schema, or a
> broker wiring that does not exist.

## What the gateway does (one paragraph)

It is the controlled edge of NeuroAssist NIV. Every browser (caregiver Angular
shell) and client (patient app, edge station) call transits GWY, which forwards it
by path predicate to one of the **eight** business services (ACS, PAT, HIST, EDGE,
CONV, EVNT, GEST, TRN) resolved through Eureka (REG `:8761`) as `lb://<service>`.
Before forwarding, a global filter chain runs: CORS admission for the caregiver
shell origin (ADR-004); an `X-Correlation-Id` generated-if-absent and propagated
(ADR-007, INV-G4); a strip of any client-supplied `X-Tenant-Id` (ADR-003, INV-G3);
and — for every path outside the explicit anonymous allow-list — a coarse, stateless
JWT edge check that verifies **signature / issuer / expiry-when-present** against
**both** the ACS and the EDGE JWKS (ADR-002, INV-G2 / INV-G6). The edge check is
**advisory, never terminal** (INV-G5): resource servers still re-validate, enforce
`@PreAuthorize`/RBAC and the `jti`-blacklist. In-memory per-instance rate limits
protect `POST /acs/auth/login` and the EDGE pairing-claim endpoint (ADR-005);
per-route timeouts, a resilience4j circuit breaker and idempotent-only retry isolate
a slow or dead downstream (ADR-006). Access logs carry only method, route template,
status, latency and correlation id — **no PHI** (ADR-007, INV-G1). GWY **routes,
never composes**: no BFF aggregation, no body transformation, no domain endpoint, no
database. It fronts **only** the eight business services — never REG, MIG
(infrastructure) or DASH (no backend).

## Spec map

| Artifact | Purpose | Status |
|---|---|---|
| `contracts/api-contract.md` | Route table, public-path allow-list, gateway's own endpoints, header contract, error model (EARS) | authoritative |
| `contracts/data-model.md` | Persistence model | **N/A** — gateway owns no schema (recorded) |
| `contracts/event-contracts.md` | Events | **N/A** — messaging disabled platform-wide; GWY publishes/consumes nothing (recorded) |
| `contracts/hub-integration.md` | GWY as the edge; Eureka client; no hub/AI call | authoritative |
| `contracts/integration-contracts.md` | Eight downstreams, two JWKS issuers, Eureka `lb://`, CORS allow-list, rate-limit buckets, breaker/timeouts per route | authoritative |
| `contracts/techlab-ai-integration.md` | TechLab AI dependency | **N/A** — `ai.hasAi = false`; GWY consumes no AI capability (recorded) |
| `events/event-catalog.md` | Event catalog | empty by design (recorded) |
| `spec/backend/SPEC-01-api-surface.md` | Edge surface: route table, allow-list, header & error contract (EARS) | authoritative |
| `spec/backend/SPEC-02-routing-and-resilience.md` | Core: `lb://` routing, timeouts, circuit breaker, idempotent-only retry (EARS) | authoritative |
| `spec/backend/SPEC-03-edge-jwt-two-issuers.md` | Sub-feature: coarse two-issuer JWT edge check + non-expiring token tolerance (EARS) | authoritative |
| `spec/backend/SPEC-04-data-model-migrations.md` | Data model + migrations | **N/A** (recorded) |
| `spec/backend/SPEC-05-idempotency-concurrency.md` | Correlation-id idempotency, retry-safety, stateless concurrency (EARS) | authoritative |
| `spec/backend/SPEC-06-security.md` | Edge auth posture, CORS, rate limit, tenant strip, PHI-free, advisory-not-terminal (EARS) | authoritative |
| `spec/backend/SPEC-07-observability-health.md` | Correlation propagation, PHI-free logs, health/metrics (EARS) | authoritative |
| `spec/backend/SPEC-08-bdd-test-scenarios.md` | BDD narrative + reusable steps | authoritative |
| `spec/backend/SPEC-09-messaging-architecture.md` | Messaging | **N/A** (recorded) |
| `spec/backend/SPEC-10-integrations.md` | Downstreams + JWKS + Eureka + CORS + rate-limit + breaker config (EARS) | authoritative |
| `tests/cucumber/routing.feature` | Path-predicate routing to `lb://` targets Gherkin | authoritative |
| `tests/cucumber/public-vs-authenticated.feature` | Anonymous allow-list vs deny-by-default Gherkin | authoritative |
| `tests/cucumber/rate-limit-429.feature` | Login/pairing throttling → 429 Gherkin | authoritative |
| `tests/cucumber/correlation-id.feature` | Generate-if-absent / preserve / echo Gherkin | authoritative |
| `tests/cucumber/tenant-header-stripping.feature` | `X-Tenant-Id` strip Gherkin | authoritative |
| `tests/cucumber/cors-preflight.feature` | CORS preflight + allow-list Gherkin | authoritative |
| `diagrams/c4-context.puml` | Context: gateway + clients + fleet + JWKS issuers + REG | authoritative |
| `diagrams/c4-container.puml` | Container: Netty gateway + filter chain + Eureka client | authoritative |
| `diagrams/c4-component.puml` | Component: filters + config (reactive WebFlux layout) | authoritative |
| `setup-local.md` | HTTP port 8080 + env vars + run/test commands | authoritative |
| `runbook.md` | Operational runbook (routes, JWKS, CORS, rate limit, breaker) | authoritative |
| `generator-config.yml` | Scaffold inputs: `type: gateway`, port 8080, `bounded_context: gateway` | authoritative |

## EARS notation

Testable invariants in this spec set use EARS (D-057). Authoring guide:
`docs/architecture/backend/standards/ears-notation.md`. Domain invariants are
declared **once** in `03-initial-domain-framing.md` (`INV-G1..G6`) and cited here
without redeclaration.

## Next action

-> /be-architect-backlog neuroassist-niv GWY
