<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> Stack resolved: **`java`** (module registry inherits project `stack.backend.language`).

## Stack

- **Language / runtime:** Java 21.
- **Framework:** Spring Boot (Spring Web, Spring Security resource server, Spring Data JPA).
- **Build / deps:** Gradle (Kotlin DSL), multi-module monorepo (`backend/`).
- **Persistence:** PostgreSQL via Spring Data JPA; schema-per-tenant routing.
- **Migrations:** Flyway scripts authored here, applied **centrally** by MIG
  (`neuroassist-niv-migrations`).
- **Discovery / edge:** registered in Eureka (REG); fronted by Spring Cloud Gateway (GWY).
- No broker (messaging disabled); no TechLab AI dependency (`ai.hasAi = false`).

## Service Boundary

Single Spring Boot service (`pat-service`) — see local `adr/ADR-001-service-boundary-single-service.md`.
PAT owns `Patient`, `Command` and the global `GestureType` catalog; all other entities
are referenced by id with no cross-service FK. PAT is an ACS resource server (validates
JWT via JWKS) and never issues tokens. A single service is justified because the three
aggregates share one transactional and tenancy boundary and there is no independent
scaling or availability driver to split them.

## Package Organization

Root package `com.neuroassist.pat` (project `packageBase = com.neuroassist`):

```
src/main/java/com/neuroassist/pat/
+-- api/              REST controllers, request/response DTOs, mappers;
|                     @PreAuthorize strings == RoleAuthorityPolicy constants
+-- application/      use-case services (RegisterPatient, CalibrateCommand,
|                     RetireCommand, ReadCatalog, RegisterGestureType);
|                     @Transactional lives here; HIST audit orchestration
+-- domain/           Patient, Command, GestureType; value objects
|                     (GestureComposition, CalibrationWindow, UrgencyLevel,
|                     Sensitivity); ports (repositories, HistAuditPort,
|                     AcsIntrospectionPort) — no framework imports
+-- infrastructure/   JPA adapters (schema-per-tenant routing), HTTP/Feign
                      clients (HIST, ACS JWKS/introspect), security config
```

Dependency rule (shared `../../adr/ADR-001-hexagonal-architecture.md`, key
`hexagonal_java`): `domain` imports nothing outward; `application` depends on `domain`;
`api` and `infrastructure` depend inward. Migrations live at the service root
(`src/main/resources/db/migration/`, authored here) and are applied by MIG.

## Hub Service Dependencies

No TechLab AI hub integration (P3 sync skipped; `ai.hasAi = false`). PAT has no bounded
TechLab AI capability dependency.

## External Integrations

Internal-network only; no third-party systems in the MVP. Intra-project, all **sync REST**:

| Direction | Peer | Purpose | Auth |
|---|---|---|---|
| PAT → ACS | `acs-service` | JWKS fetch; `/acs/auth/introspect` for revocation-aware validation of sensitive reads | service client |
| PAT → HIST | `hist-service` | audited domain actions (`PatientRegistered`, `CommandCalibrated`, …) | service client, `X-Correlation-Id` echoed |
| PAT → MIG | migrations | PAT-authored Flyway applied centrally | build/ops |
| GEST/EDGE → PAT | catalog read | active command catalog (primitives + calibration) for a patient | caregiver token or detection service client (ADR-004) |
| EVNT → PAT | command read | `urgency` + `label` by command id | service client |
| DASH → PAT | patient + command read | calibration/review UI | caregiver token |
| CONV → PAT | patient read | patient reference by id | caregiver token |

PAT references `Caregiver`/`PatientSession` (ACS), `EdgeDevice` (EDGE) by id only.

## Async vs Sync Decisions

- **All interactions sync REST** — messaging is disabled (`stack.messaging.enabled = false`).
- **Domain actions audited to HIST over sync REST** within the same request (mirrors ACS
  event-catalog). Action names (`PatientRegistered`, `CommandCalibrated`, `CommandRetired`,
  `GestureTypeRegistered`) are chosen to become broker event names unchanged if/when a
  broker is introduced — an explicit future decision, not this phase.
- **Catalog reads are pull** — detection modules fetch the active catalog on demand; PAT
  does not push. Distribution mechanism and its authority model are governed by
  `adr/ADR-004-catalog-distribution.md`.
- **HIST audit is best-effort-but-ordered within the transaction boundary** — the
  calibrate/retire use case audits before returning (consistency over throughput; low
  write volume, caregiver-paced).
