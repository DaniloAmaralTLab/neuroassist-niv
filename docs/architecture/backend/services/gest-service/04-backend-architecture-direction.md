<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Module: **GEST — Gesture Detection (Edge)** · Service: `gest-service` · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled (sync REST)

## Stack
- **Language/runtime:** Java 21.
- **Framework:** Spring Boot (Web, Security as an OAuth2 resource server, Data JPA, Actuator).
- **Build/deps:** Gradle (Kotlin DSL), module `:gest-service`.
- **Migrations:** Flyway — but against the **global** schema (`neuroassist_global`), coordinated by
  the centralized `MIG` migrations module (local ADR-003), not a per-tenant schema.
- **Persistence:** PostgreSQL, global schema.
- **Transport:** synchronous REST only — `stack.messaging.enabled = false` (no broker).

## Service Boundary
A **single, thin service** (local ADR-001: single-service, not decomposed). Its entire reason to
exist is the detection-engine capability registry — the INV-PAT-6 truth. Two application services,
each mapped to exactly **one** contract path root (D-640):

| Application service | Path root | Resource (D-641) |
|---|---|---|
| `EngineVersionService` | `/gest/engines` | `engine` |
| `CapabilityService` | `/gest/capabilities` | `capability` |

The permission `resource` differs from the service name `gest` in both cases (`engine`,
`capability`), so authorities are declared as `gest.engine.*` / `gest.capability.*` and the
`RoleAuthorityPolicy` records the resource explicitly (D-641). The service does **not** expand to own
detection, catalog, device or event concerns.

## Package Organization
Java root package `com.neuroassist.gest`:

```
src/main/java/com/neuroassist/gest/
+-- api/              REST controllers (EngineController, CapabilityController), DTOs, mappers
+-- application/      EngineVersionService, CapabilityService (@Transactional use cases)
+-- domain/           EngineVersion, EngineCapability, SupportStatus (VO), ports (interfaces)
+-- infrastructure/   JPA adapters (global schema), ACS JWKS security config,
                      PatGestureTypeClient (Feign, code validation), HIST audit adapter
```

Dependency rule (shared `../../adr/ADR-001-hexagonal-architecture.md`, key `hexagonal_java`):
`domain` imports nothing outward; `application` depends on `domain`; `api` and `infrastructure`
depend inward. The hexagonal ADR is referenced by its resolved filename, never as a literal number.

## Hub Service Dependencies
- **ACS** (required, sync) — JWKS to validate caregiver + patient-session tokens; introspection on
  write (revoke-sensitive) paths. GEST mints nothing.
- **PAT** (required at write time, sync) — `GET /pat/gesture-types` to confirm a `gestureTypeCode`
  exists before declaring a capability (INV-GEST-1). Not on the read-hot path.
- **HIST** (required, sync) — audit each GEST write with the shared envelope.
- **PAT / DASH are consumers of GEST**, not dependencies: they read `/gest/capabilities` to resolve
  INV-PAT-6 support truth. GEST does not call them back.
- **EDGE / EVNT** — **no dependency in either direction.** GEST neither manages devices (EDGE) nor
  ingests events (EVNT); the detection→event path bypasses GEST entirely.

## External Integrations
None external to the platform. No third-party API, no model hosting (model bundles are frontend
assets under prototype-to-production). GEST's only outbound calls are intra-platform sync REST to
ACS/PAT/HIST.

## Async vs Sync Decisions
- **All sync REST.** Messaging is disabled project-wide; there is no outbox or broker.
- The registry is **read-mostly and advisory**; writes are rare (per engine release) and admin-driven,
  so there is no latency or throughput pressure that would justify async.
- Consumers (PAT/DASH/station) **pull** the registry on demand and may cache via `ETag` (ADR-004
  pattern). No push, no eventing from GEST to other modules.
