<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Module: **EDGE — Edge Device Integration** · Service: `edge-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Stack

Java 21 / Spring Boot 3.5.x, built with Gradle (Kotlin DSL). Persistence via Spring Data
JPA over PostgreSQL; schema migrations owned centrally by MIG (Flyway). Security via Spring
Security resource-server (ACS JWKS) for human endpoints **plus** an EDGE-owned device-token
issuer/verifier for `edge.device` endpoints. Scheduling (`@Scheduled`) drives the heartbeat
watchdog. Inter-service calls are synchronous REST (Feign or `RestClient`); no broker
(`stack.messaging.enabled = false`). Hexagonal per the shared Java ADR
(`../../adr/ADR-001-hexagonal-architecture.md`, key `hexagonal_java`).

## Service Boundary

Single service, single bounded context (ADR-001 local). EDGE is not decomposed into
separate enrollment/token/catalog services: the pairing-code, device-token and
cached-catalog concerns share the `EdgeDevice` lifecycle and its tenant invariants, which
must be enforced together. `Patient` (PAT), `Caregiver`/`PatientSession` (ACS) and gesture
semantics (GEST/PAT) stay outside EDGE and are referenced by id.

## Package Organization

Root package `com.neuroassist.edge` (java layout — shallow hexagonal):

```
src/main/java/com/neuroassist/edge/
+-- api/              REST controllers, DTOs, mappers
|                     - DeviceController (enroll/read/deactivate/revoke/unpair)
|                     - PairingController (/edge/devices/pair — code-bearer)
|                     - HeartbeatController, CatalogController (device token)
+-- application/      use-case services (@Transactional here):
|                     EnrollDevice, PairDevice, RecordHeartbeat, EvaluateLiveness,
|                     RefreshCatalog, RevokeDevice, DeactivateDevice, UnpairDevice
+-- domain/           EdgeDevice aggregate + state machine, PairingCode VO,
|                     CachedCatalog, invariants, and ports (interfaces):
|                     EdgeDeviceRepository, PairingCodeStore, DeviceTokenIssuer,
|                     CommandCatalogSource, CachedCatalogStore, AuditPort, Clock
+-- infrastructure/   adapters: JPA repos, global PairingCodeStore, DeviceTokenIssuer
                      (sign + JWKS), PAT CommandCatalogSource (service-client identity,
                      ETag/304), HIST AuditPort, watchdog scheduler, Spring Security
                      (TenantContextFilter inside the SecurityFilterChain), config
```

Dependency rule (same as the shared ADR): `domain` imports nothing outward; `application`
depends on `domain`; `api` and `infrastructure` depend inward. Inbound port signatures
**never** take `tenantId` — application services call `TenantContextHolder.require()` as
the first line, and `api.*` must not import `infrastructure.security` (ArchUnit RULE-04,
Learning Layer).

## Hub Service Dependencies

None. `ai.hasAi = false`; EDGE depends on no TechLab AI bounded context
(orchestration / knowledge / document_composition / analytics) and performs no P3 hub sync.

## External Integrations

No third-party integrations. Internal sync REST only:

| Target | Purpose | Identity EDGE uses |
|---|---|---|
| **PAT** `GET /pat/patients/{patientId}/commands?status=active` | pull catalog to cache/serve offline (ETag/304) | **service-client** carrying `pat.command.read` — never a patient-session token (PAT INV-PAT-7) |
| **ACS** JWKS (`/acs/.well-known/jwks.json`) | verify caregiver/coordinator JWTs on human endpoints | n/a (public key fetch) |
| **HIST** audit endpoint | record enroll/pair/revoke/deactivate/unpair | service-client (audit) |
| **MIG** | Flyway migrations for EDGE tables | n/a |

The **edge device** is a client *of* EDGE (pairing, heartbeat, catalog), authenticating
with the EDGE-issued `edge.device` token. TLS outside localhost (TECH-006); internal
network only (OPS-002).

## Async vs Sync Decisions

- **All inter-service calls are synchronous REST** — messaging is disabled. Enroll, pair,
  revoke, deactivate and unpair audit to HIST within the request.
- **The heartbeat watchdog is a scheduled in-process job**, not a message consumer: it
  periodically scans `paired` devices and flips connectivity on threshold crossing. No
  broker, no external scheduler.
- **Catalog refresh is request-driven and cache-first**: EDGE serves the cached catalog and
  refreshes from PAT opportunistically with `If-None-Match`; a PAT outage degrades to the
  cache (ADR-004), never a hard failure.
- **Edge→cloud sync is pull/push over REST**, not an outbox. ADR-006 flags an async broker
  (RabbitMQ) only as a *future signal* if a local retry queue saturates; out of MVP scope.
