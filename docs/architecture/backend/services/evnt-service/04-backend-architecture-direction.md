<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> `backend_language = java` (global; no module override — D-550).

## Stack

- **Language / runtime:** Java 21.
- **Framework:** Spring Boot (Spring MVC + Spring Security resource server, Spring Data JPA).
- **Build / deps:** Gradle (Kotlin DSL), module `:evnt-service` in the backend root.
- **Migrations:** Flyway scripts authored by EVNT, applied centrally by MIG
  (`neuroassist-niv-migrations`) to `neuroassist_global` + each `t_<tenantId>`.
- **Discovery / gateway:** Eureka (REG) + Spring Cloud Gateway (GWY), with `*.base-url` fallback.
- **Security:** dual JWT issuer trust — ACS (caregiver tokens) and EDGE (`edge.device` token) —
  via each issuer's JWKS, plus introspection on revoke-sensitive paths.
- **Hexagonal:** per shared ADR `../../adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`).

## Service Boundary

**Single service** (ADR-001 local — default). EVNT is not decomposed: the Event aggregate, the
report-ingestion path and the caregiver read/confirm/feedback paths are one cohesive bounded context
with one datastore. No sub-services, no internal broker.

## Package Organization

Java — root package `com.neuroassist.evnt`:

```
src/main/java/com/neuroassist/evnt/
+-- api/              EventReportController (device path), EventController (caregiver path),
|                     DTOs, mappers
+-- application/      IngestGestureReport, ConfirmAlarm, RecordFeedback, ReadActiveAlarm,
|                     ListPatientEvents  (@Transactional lives here)
+-- domain/           Event (aggregate), Urgency / Feedback / CommandSnapshot / ReportId (VOs),
|                     ports: EventRepository, CommandCatalogPort, CaregiverLinkPort,
|                     DeviceTokenIntrospectionPort, AuditPort
+-- infrastructure/   persistence (JPA, schema-per-tenant), clients (Feign/REST to PAT/ACS/EDGE/HIST),
                      security (dual resource-server config), config
```

Dependency rule: `domain` imports nothing outward; `application` depends on `domain`; the entry
layer (`api`) and `infrastructure` depend inward. The hexagonal shared ADR is the source
(`../../adr/ADR-001-hexagonal-architecture.md`).

## Hub Service Dependencies

EVNT consumes **no** TechLab AI service (`ai.hasAi = false`). Its hub dependencies are the sibling
microservices only:

| Hub service | Why EVNT depends on it |
|---|---|
| **ACS** | trust anchor for caregiver tokens (JWKS + introspection) and the who-to-notify source (caregiver↔patient links). |
| **PAT** | catalog source of truth — resolve the Command's `urgency` + `label` by id at generation. |
| **EDGE** | trust anchor for the inbound `edge.device` report token (JWKS + introspection); EDGE embeds the `evnt.event.ingest` right in that token (G5). |
| **HIST** | append-only audit sink for every state-changing action. |
| **MIG / REG / GWY** | migrations, discovery, gateway (infrastructure). |

## External Integrations

No external third-party systems in the MVP. All integrations are intra-project sync REST:

| Target | Operation | Identity | Resolution |
|---|---|---|---|
| EDGE | `GET /edge/.well-known/jwks.json` | public | validate `edge.device` signature |
| EDGE | `POST /edge/device-tokens/introspect` | service-client | revocation-aware check on ingest |
| PAT | `GET /pat/commands/{commandId}` | ACS service-client JWT (`pat.command.read`) | urgency + label |
| ACS | `GET /acs/.well-known/jwks.json` + `POST /acs/auth/introspect` | public / service-client | validate caregiver tokens |
| ACS | `GET /acs/caregivers/{caregiverId}/links` | caregiver token | who-to-notify scoping |
| HIST | `POST /audit` | service-client | audit |

> **TODO[architect]:** the exact ACS service-client minting path for EVNT's PAT/HIST/EDGE-introspect
> calls (client-credentials vs provisioned service principal) is an ACS concern flagged OPEN by EDGE
> and PAT too; confirm at backlog/scaffold against the live ACS contract. EVNT's side is fixed: a
> cached service-client JWT carrying `pat.command.read`.

## Async vs Sync Decisions

- **All synchronous.** `stack.messaging.enabled = false`; there is no broker, no outbox, no queue.
  Cross-module coupling is HTTP, in the same request boundary (mirrors ACS/PAT/EDGE).
- **EVNT pushes nothing.** Notification "orchestration" is **pull-based**: the caregiver dashboard
  (`evnt-ui` / DASH) polls `GET /evnt/patients/{id}/active-alarm` and the events surface; EVNT does
  not open a socket or call the dashboard. Urgency on the Event lets the client choose full-screen
  alarm vs discreet toast (ADR-003 local).
- **Audit is in-band.** HIST is called synchronously inside the use-case transaction boundary; the
  failure policy (hard `502` vs enqueue) follows the project HIST policy — TODO[architect] at specs.
- **Future signal:** a real-time push transport (SSE/WebSocket) or a broker (ADR-006 shared) would
  reduce alarm latency below the poll interval; explicitly deferred past the MVP (doc 06 Risk).
