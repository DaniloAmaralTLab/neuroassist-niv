<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV

## Stack

- **Language / framework** — Java 21 / Spring Boot (project default, `stack.backend`).
- **Build** — Gradle (Kotlin DSL), service module `:hist-service`.
- **Persistence** — PostgreSQL via Spring Data JPA; append-only audit table, JSONB payload.
- **Migrations** — Flyway, authored by HIST, applied centrally by
  `neuroassist-niv-migrations` (MIG) across `neuroassist_global` and each `t_<tenantId>`.
- **Security** — Spring Security resource server (JWT via ACS JWKS), service-client auth
  for producer writes.
- **Messaging** — none (`stack.messaging.enabled = false`): all contact is sync REST.

## Service Boundary

**Single service** (`adr/ADR-001-service-boundary-single-service.md`, default). HIST has
two cohesive surfaces (append-only write, patient-scoped read) over one store; no
decomposition is justified at MVP. It is a sink + read model — it holds no business state
beyond the audit trail and never calls producers back.

## Package Organization

Java, package root `com.neuroassist.hist`
(`../../adr/ADR-001-hexagonal-architecture.md`):

```
src/main/java/com/neuroassist/hist/
+-- api/              REST controllers + DTOs for /audit (write) and /history (read),
|                     the envelope-reconciliation adapter (producer shapes -> canonical),
|                     mappers; no infrastructure import (ArchUnit).
+-- application/      use cases: AppendAuditRecord, QueryPatientHistory;
|                     TenantContextHolder.require() first line for tenant-scoped ops;
|                     idempotency orchestration.
+-- domain/           AuditRecord aggregate (immutable), value objects (AuditAction,
|                     ActorRef, SubjectRef, CorrelationId, IdempotencyKey), ports
|                     (AuditTrailPort, HistoryReadPort), invariants.
+-- infrastructure/   JPA append-only persistence + idempotent upsert, global-vs-tenant
                      routing, Spring Security with TenantContextFilter inside the
                      SecurityFilterChain, config.
```

Dependency rule (enforced for all three stacks): `domain` imports nothing outward;
`application` depends on `domain`; `api` and `infrastructure` depend inward.

## Hub Service Dependencies

- **ACS** — identity provider: JWKS / introspection for reader JWT validation; service-
  client identity for producer writes. (HIST is itself the audit hub for the platform.)
- **MIG** — centralized Flyway application.
- No TechLab AI hub dependency (`ai.hasAi = false`).

## External Integrations

| Peer | Direction | Transport | Notes |
|---|---|---|---|
| ACS, PAT, EDGE, EVNT, GEST | Inbound write | sync REST `POST /audit`, TLS outside localhost | Reconciled envelope (doc 03); service-client auth |
| DASH | Inbound read | sync REST `GET /history` | Patient-scoped; caregiver JWT via ACS |
| PostgreSQL | Dependency | JDBC | Append-only store |
| GWY (gateway) | Edge | sync REST | Injects `X-Correlation-Id` when absent |

## Async vs Sync Decisions

- **Everything is synchronous.** Messaging is disabled project-wide; there is no outbox and
  no broker. `POST /audit` is in-band with the producer's request boundary, which is why
  HIST becomes a **synchronous dependency of every write path** — the availability blast
  radius is the explicit subject of `adr/ADR-005-audit-write-failure-policy.md`.
- **If a broker is later introduced** (shared future signal referenced by producers), the
  producers' action names become message names without renaming and `POST /audit` becomes
  a consumer — a separate, explicit future decision, out of scope here.
- **Idempotency** is handled at ingest (composite key upsert,
  `adr/ADR-003-audit-ingest-idempotency.md`) rather than via delivery guarantees, because
  there is no broker to provide them.
