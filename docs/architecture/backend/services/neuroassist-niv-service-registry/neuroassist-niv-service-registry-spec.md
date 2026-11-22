---
module: REG
service: neuroassist-niv-service-registry
package: com.neuroassist.registry
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
adrRefs:
  - adr/ADR-001-eureka-registry-topology.md
  - adr/ADR-002-service-boundary-registry-only.md
  - ../../adr/ADR-001-hexagonal-architecture.md (project-wide hexagonal — context only, not applied)
  - ../../adr/ADR-002-modular-monolith.md (project-wide — context)
  - ../../adr/ADR-003-multi-tenancy.md (project-wide multi-tenancy — not applicable, no tenant concept)
---

# REG — neuroassist-niv-service-registry — Specs Entry Point

> REG is an **infrastructure / platform service** (`isInfrastructure: true`,
> `hasUi: false`). It is the Spring Cloud Netflix **Eureka server**: every
> NeuroAssist NIV service registers here and resolves peers here. It is **not** a
> hexagonal domain service: no business domain, no PostgreSQL schema, no messaging
> participation, no tenant concept, **no PHI**. The spec set below is adapted to
> that nature — domain-shaped SPECs (data model, messaging) are present but
> explicitly marked **Not Applicable** with the recorded rationale, so the backlog
> and scaffold commands do not infer a domain model, a schema, or a broker wiring
> that does not exist.

## What the registry does (one paragraph)

It is the service-discovery backbone of NeuroAssist NIV. Every business service
(ACS, PAT, EDGE, EVNT, CONV, GEST, HIST, TRN) and the API gateway (GWY) registers
with REG on startup, renews its lease by heartbeat while healthy, and resolves
peers through it by stable logical name for sync REST (Feign / `RestClient`). The
services are **already** Eureka clients — every `application.yml` carries
`eureka.client.service-url.defaultZone = ${EUREKA_URI:http://localhost:8761/eureka}`
— so REG owns and formalises the `:8761` address they already expect. REG keeps a
live, health-aware map of the fleet: only instances that keep renewing and report
`UP` are advertised, and stale instances are evicted (self-preservation **disabled
in dev** for honest, fast convergence on a small trusted LAN — ADR-001). It
**discovers, never routes** (ADR-002): it answers "where is service X?" and never
proxies business traffic, makes no auth decision, owns no database, and emits no
domain event. **No patient, gesture or tenant data ever transits REG** (INV-REG-1).

## Spec map

| Artifact | Purpose | Status |
|---|---|---|
| `contracts/api-contract.md` | Eureka protocol surface, lease/eviction, self-preservation, dashboard/health (EARS) | authoritative |
| `contracts/data-model.md` | Persistence model | **N/A** — registry owns no schema (recorded) |
| `contracts/event-contracts.md` | Events | **N/A** — messaging disabled platform-wide; REG publishes/consumes nothing (recorded) |
| `contracts/hub-integration.md` | REG as discovery backbone; Eureka clients; no outbound calls | authoritative |
| `contracts/integration-contracts.md` | In-fleet Eureka clients + observability; absent integrations | authoritative |
| `contracts/techlab-ai-integration.md` | TechLab AI dependency | **N/A** — `ai.hasAi = false`; REG consumes no AI capability (recorded) |
| `events/event-catalog.md` | Event catalog | empty by design (recorded) |
| `spec/backend/SPEC-01-api-surface.md` | Registry surface invariants (EARS) | authoritative |
| `spec/backend/SPEC-02-registry-core.md` | Core: registration, lease, eviction, discovery (EARS) | authoritative |
| `spec/backend/SPEC-03-self-preservation-and-ha.md` | Sub-feature: self-preservation tuning + HA posture (EARS) | authoritative |
| `spec/backend/SPEC-04-data-model-migrations.md` | Data model + migrations | **N/A** (recorded) |
| `spec/backend/SPEC-05-idempotency-concurrency.md` | Registration/heartbeat idempotency + lease concurrency (EARS) | authoritative |
| `spec/backend/SPEC-06-security.md` | Internal plane, no authn/authz, no PHI, dashboard hardening (EARS) | authoritative |
| `spec/backend/SPEC-07-observability-health.md` | Lifecycle logs, metrics, health/readiness (EARS) | authoritative |
| `spec/backend/SPEC-08-bdd-test-scenarios.md` | BDD narrative + reusable steps | authoritative |
| `spec/backend/SPEC-09-messaging-architecture.md` | Messaging | **N/A** (recorded) |
| `spec/backend/SPEC-10-integrations.md` | Eureka clients + observability integration (EARS) | authoritative |
| `tests/cucumber/service-registration.feature` | Registration + lease Gherkin | authoritative |
| `tests/cucumber/eviction-and-self-preservation.feature` | Eviction + self-preservation Gherkin | authoritative |
| `tests/cucumber/discovery-resolution.feature` | Discovery resolution Gherkin | authoritative |
| `diagrams/c4-context.puml` | Context: registry + clients + operator | authoritative |
| `diagrams/c4-container.puml` | Container: Eureka server + in-memory lease registry | authoritative |
| `diagrams/c4-component.puml` | Component: bootstrap + registry core + dashboard + config | authoritative |
| `setup-local.md` | HTTP port + env vars + run/test commands | authoritative |
| `runbook.md` | Operational runbook (membership, status override, self-preservation, HA criteria) | authoritative |

## EARS notation

Testable invariants in this spec set use EARS (D-057). Authoring guide:
`docs/architecture/backend/standards/ears-notation.md`. Domain invariants are
declared once in `03-initial-domain-framing.md` (`INV-REG-1..4`) and cited here
without redeclaration.

## Next action

-> /be-architect-backlog neuroassist-niv REG
