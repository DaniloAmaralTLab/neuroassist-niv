# Plan — EVNT (Events and Alarms)

> Service: `evnt-service` · Project: NeuroAssist NIV · Port: 8086
> Stack: Java 21 / Spring Boot · Hexagonal (ADR-001-hexagonal-architecture.md) · Multi-tenant (ADR-003)
> Messaging: disabled · SAFETY-1: in-scope (ADR-005 / SPEC-11 out-of-band escalation)
> Generated: 2026-11-20

---

## Status das prioridades

- P1 — pendente (scaffold + domain)
- P2 — pendente (ingest golden path)
- P3 — pendente (persistence + migrations)
- P4 — pendente (external integrations)
- P5 — pendente (security + multi-tenancy)
- P6 — pendente (SAFETY-1 escalation)
- P7 — pendente (read surface + push subscriptions)
- P8 — pendente (observability + health)
- P9 — pendente (BDD end-to-end)

---

## 0. Leitura executiva

### Papel do serviço

EVNT turns a recognized gesture report from the edge station into a structured, auditable `Event`
and orchestrates delivery to the right caregiver — full-screen alarm for `emergency`, discreet
notice for `routine`. Detection is GEST/EDGE; EVNT owns what happens after: event generation,
active-alarm query, confirmation, feedback, and (SAFETY-1) out-of-band escalation via Web Push →
SMS → voice when the caregiver tab is backgrounded.

EVNT plays **two security roles**: EDGE resource server on the ingest path (`edge.device` token);
ACS resource server on all caregiver paths. It makes no outbound message-broker calls (messaging
disabled); all integrations are synchronous REST (PAT, ACS, EDGE, HIST). Tenant context derives
exclusively from the JWT `tenantId` claim (INV-EVNT-1).

### MVP scope

- Ingest a gesture report → one `Event` per `(deviceId, reportId)` (idempotent — INV-EVNT-4)
- Snapshot `urgency` + `commandLabel` from PAT at generation (ADR-004 — never re-read)
- Active-alarm query for dashboard polling (SPEC-03; 3s poll interval server-advertised)
- Confirm an emergency alarm (INV-EVNT-5); record feedback verdict (two independent axes)
- **SAFETY-1 (ADR-005):** Web Push (Tier 0, `T+0`), SMS (Tier 1, `T+30s`), voice (Tier 2, `T+90s`)
  driven by an in-process `@Scheduled` sweep; telephony tiers feature-flagged off by default

### Diagnóstico inicial

- 3 tables: `event` (single aggregate, partial index active-alarm), `push_subscription`
  (VAPID Web Push, tenant-scoped), `escalation_attempt` (audit + idempotency guard ESC-4)
- Flyway V0040–V0044 (5 scripts; extended from V0042 to V0044 for SAFETY-1 — data-model §4)
- 4 outbound services: EDGE (JWKS+introspect), PAT (command snapshot), ACS (JWKS+links), HIST (audit)
- 3 open cross-module INT issues: INT-EVNT-ACS-001 (phone), INT-EVNT-002 (service-client), INT-EVNT-003 (HIST policy)
- 1 operational blocker for telephony: INT-EVNT-005 (AWS prerequisites)
- Learning pitfall: domain verbs `ingest`/`confirm`/`record` must be registered in `_OP_VERB_TO_ACTION`
  before scaffold (D-531)

---

## 1. Estratégia geral

### Objetivo macro

Deliver a fully testable, security-hardened `evnt-service` where every emergency event reliably
reaches at least one caregiver channel — foreground polling when available, Web Push / SMS / voice
when backgrounded — with a complete, idempotent audit trail to HIST.

### Ordem das prioridades

| P | Título | Motivo |
|---|---|---|
| P1 | Scaffold + domain aggregate | Prerequisite for all subsequent work; unblocks parallelism |
| P2 | Ingest golden path | Anchor use case — EventGenerated drives the entire module |
| P3 | Persistence + migrations | Tables must exist before integration tests can run |
| P4 | External integrations | PAT/ACS/EDGE/HIST clients needed for P2 integration tests to pass end-to-end |
| P5 | Security + multi-tenancy | Dual resource server wired after clients exist; needed for real auth in BDD |
| P6 | SAFETY-1 escalation | Life-safety feature; depends on persistence + integrations |
| P7 | Read surface + push subscriptions | DASH consumer path; depends on persistence + security |
| P8 | Observability + health | Operational readiness; independent of business logic |
| P9 | BDD end-to-end | Full vertical slice; requires all prior priorities |

---

## 2. Plano por prioridade

### Prioridade 1 — Scaffold + domain aggregate

Status: pendente

#### Objetivo / Resultado esperado

A compilable `:evnt-service` Gradle module with the four hexagonal layers and a pure `Event`
domain aggregate that encodes all invariants (Urgency, Feedback, confirm/feedback mutable axes,
INV-EVNT-2/4/5) with no JPA or Spring dependency.

#### Issues vinculadas
- EVNT-001 (hexagonal skeleton + build)
- EVNT-002 (Event aggregate + enums + EventRepository port)

#### Specs cobertas
- evnt-service-spec.md, ADR-001-hexagonal-architecture.md, data-model.md §2.1, SPEC-02, SPEC-05

#### Sequencia de execucao
- Fase 1: EVNT-001 — Gradle module + four layer packages + EvntServiceApplication
- Fase 2: EVNT-002 — Event, Urgency, Feedback, EventRepository port + domain unit tests

#### Criterios de aceite
- `./gradlew :evnt-service:compileJava` exits 0
- ArchUnit layer rules pass on empty skeleton
- `Event.confirm()` on routine event throws `NotConfirmableException`

#### Riscos
- Domain verb `ingest`/`confirm`/`record` not in `_OP_VERB_TO_ACTION` → register before scaffold (D-531 learning pitfall)

#### Instrucao para implementador

Create the Gradle module first (EVNT-001) before writing any domain class. The module must be
registered in `settings.gradle.kts`. ArchUnit rules from ADR-001-hexagonal-architecture.md apply
from the first compilation. No JPA, no Spring in the `domain` package — pure Java only.

---

### Prioridade 2 — Ingest golden path

Status: pendente

#### Objetivo / Resultado esperado

`POST /evnt/gesture-reports` works end-to-end with stubbed dependencies: validates edge.device
token, calls PAT for urgency+label snapshot, persists Event, responds 201; replay returns 200.
`POST .../confirmation` and `POST .../feedback` use cases implemented with idempotency and audit.

#### Issues vinculadas
- EVNT-003 (GestureReportController)
- EVNT-004 (IngestGestureReportUseCase)
- EVNT-005 (ConfirmAlarmUseCase)
- EVNT-006 (RecordFeedbackUseCase)

#### Specs cobertas
- SPEC-01 §2/4/5, SPEC-02, SPEC-05, event-contracts §1.2 (EventGenerated/AlarmConfirmed/FeedbackRecorded)

#### Sequencia de execucao
- Fase 1: EVNT-004 — IngestGestureReportUseCase (domain logic, unit-tested with mocks)
- Fase 2: EVNT-003 — GestureReportController (wire use case, DTOs, bean validation)
- Fase 3: EVNT-005 — ConfirmAlarmUseCase + EventConfirmationController
- Fase 4: EVNT-006 — RecordFeedbackUseCase + EventFeedbackController

#### Criterios de aceite
- Ingest 201 + idempotent replay 200 (unit tests pass)
- PAT 404 → 404 command-not-found, PAT 503 → 503 catalog-unavailable
- Confirm routine → 409; second confirm → 200 same confirmedAt, no second audit
- Same feedback → 200, no second audit; changed feedback → 200, one audit

#### Riscos
- EVNT-004 depends on EVNT-008 (persistence) and EVNT-012 (PAT client) for real integration — unit tests with mocks sufficient at P2

#### Instrucao para implementador

Write IngestGestureReportUseCase (EVNT-004) before the controller (EVNT-003). The use case depends
only on ports (EventRepository, PatCommandPort, AuditPort) — implement with mocks first, wire real
adapters in P3/P4. Keep the controller thin: validation + delegation only. All PAT-unavailability
paths are fail-closed (ADR-004): never create an Event when PAT is unreachable.

---

### Prioridade 3 — Persistence + migrations

Status: pendente

#### Objetivo / Resultado esperado

Five Flyway scripts (V0040–V0044) that match data-model.md exactly; JPA adapters for `event`,
`push_subscription`, `escalation_attempt` with correct constraint handling and tenant routing.

#### Issues vinculadas
- EVNT-007 (Flyway V0040–V0044)
- EVNT-008 (Event JPA entity + adapter)
- EVNT-009 (PushSubscription JPA entity + adapter)
- EVNT-010 (EscalationAttempt JPA entity + adapter)
- INT-EVNT-004 (MIG range registration)

#### Specs cobertas
- SPEC-04 (data model), data-model.md §2.1–2.3

#### Sequencia de execucao
- Fase 1: EVNT-007 — author migration scripts, validate against data-model.md SQL blocks
- Fase 2: EVNT-008 — Event JPA + adapter (Testcontainers integration test)
- Fase 3: EVNT-009 — PushSubscription JPA + adapter
- Fase 4: EVNT-010 — EscalationAttempt JPA + adapter
- Fase 5: INT-EVNT-004 — register with MIG (parallel, no EVNT code change)

#### Criterios de aceite
- All 5 migration scripts apply cleanly to a fresh schema (Testcontainers validates)
- `uq_event_device_report` duplicate → idempotent 200 path (not a 409 to the caller)
- `uq_escalation_tier` duplicate → no-op (ESC-4)
- Active-alarm query uses partial index (EXPLAIN shows `ix_event_active_alarm`)

#### Riscos
- Multi-tenancy schema routing: use Hibernate `CurrentTenantIdentifierResolver` or Flyway schema migration in MIG context — verify which approach the project ADR-003 mandates

#### Instrucao para implementador

EVNT-007 (migrations) must be authored before the JPA integration tests in EVNT-008/009/010 can
run against a real PostgreSQL container. All migration scripts must reproduce the exact SQL from
data-model.md (copy, do not rewrite). CucumberSpringContext in P9 reuses the same PostgreSQLContainer
singleton (learning pitfall: H2 incompatible with multi-tenancy JPA config).

---

### Prioridade 4 — External integrations

Status: pendente

#### Objetivo / Resultado esperado

Four Feign/HTTP adapters (EdgeTokenValidatorAdapter, PatCommandFeignClient, AcsCaregiverFeignClient,
HistAuditFeignClient) tested with WireMock; three cross-module INT issues unblocked.

#### Issues vinculadas
- EVNT-011 (EdgeTokenValidatorAdapter)
- EVNT-012 (PatCommandFeignClient)
- EVNT-013 (AcsClient)
- EVNT-014 (HistAuditFeignClient)
- INT-EVNT-ACS-001 (ACS expose caregiver phone)
- INT-EVNT-002 (ACS service-client minting path)
- INT-EVNT-003 (HIST failure policy)

#### Specs cobertas
- SPEC-10 (integrations), SPEC-06 (security), integration-contracts.md §1–4

#### Sequencia de execucao
- Fase 1: EVNT-011 — EdgeTokenValidatorAdapter (EDGE JWKS + introspection)
- Fase 2: EVNT-012 — PatCommandFeignClient (service-client token; blocked on INT-EVNT-002)
- Fase 3: EVNT-013 — AcsClient (JWKS + links; also needed by EscalationSweep for ESC-3)
- Fase 4: EVNT-014 — HistAuditFeignClient (audit sink; policy from INT-EVNT-003)
- Parallel: INT-EVNT-002, INT-EVNT-003, INT-EVNT-ACS-001 (tracked cross-module)

#### Criterios de aceite
- EDGE introspect outage → passes (best-effort, logged), no 401
- PAT 404 → command-not-found propagated correctly
- ACS links outage with no cache → 403 (fail-closed, never widen scope)
- HIST 5xx → 502 on prod (pending INT-EVNT-003 decision)

#### Riscos
- INT-EVNT-002 (service-client minting) must be resolved before EVNT-012/EVNT-014 can be tested with a real ACS; WireMock stubs cover unit testing but not end-to-end

#### Instrucao para implementador

EVNT-011 (EdgeTokenValidator) depends only on a public EDGE JWKS endpoint — implement it
independently of the other clients. For EVNT-012/014, stub the ACS token endpoint in WireMock
while INT-EVNT-002 is in-flight. Use short-TTL caching for JWKS and links (ACS cache) with
explicit TTL configuration from `EscalationProperties` or a separate `SecurityProperties` bean.

---

### Prioridade 5 — Security + multi-tenancy

Status: pendente

#### Objetivo / Resultado esperado

Dual-resource-server Spring Security config: EDGE path uses `EdgeTokenValidatorAdapter`; ACS
paths use ACS JWKS. `TenantContextHolder` injects `tenantId` into every Hibernate session for
schema-per-tenant routing. `RoleAuthorityPolicy` declares all nine authority constants.

#### Issues vinculadas
- EVNT-015 (EvntSecurityConfig + TenantContextHolder + RoleAuthorityPolicy)

#### Specs cobertas
- SPEC-06 (INV-EVNT-1/6/7), ADR-001-hexagonal-architecture.md, ADR-003-multi-tenancy.md

#### Sequencia de execucao
- Fase única: EVNT-015

#### Criterios de aceite
- Edge token on caregiver path → 401; caregiver token on device path → 401 (INV-EVNT-6)
- X-Tenant-Id header ignored; tenantId from JWT only (INV-EVNT-1)
- Nine authority constants declared in RoleAuthorityPolicy

#### Riscos
- Domain verbs `ingest`/`confirm`/`record` must be registered in `_OP_VERB_TO_ACTION` before scaffold
  generates controller `@PreAuthorize` strings (D-531 — register at this stage)

#### Instrucao para implementador

EVNT-015 depends on EVNT-011 (EdgeTokenValidatorAdapter) and EVNT-013 (AcsJwksClient) being
wired into the Spring Security filter chain. The `TenantContextHolder` must set the Hibernate
multi-tenancy schema before any JPA operation runs; wire it as a `HandlerInterceptor` or Hibernate
`CurrentTenantIdentifierResolver`. Verify that `GET /evnt/health` is exempt from token requirements.

---

### Prioridade 6 — SAFETY-1 escalation

Status: pendente

#### Objetivo / Resultado esperado

A complete, tested escalation engine: EscalationPolicy (ESC-1..7 tier ladder), EscalationSweep
(@Scheduled), three channel adapters (Web Push / SMS / Voice), all feature-flagged with telephony
off by default and all audited to HIST via EscalationAttempted.

#### Issues vinculadas
- EVNT-016 (EscalationPolicy domain service)
- EVNT-017 (EscalationSweep @Scheduled)
- EVNT-018 (WebPushAdapter + EmergencyNotificationPort)
- EVNT-019 (AwsSmsAdapter — SMS_ENABLED=false)
- EVNT-020 (AwsVoiceAdapter — VOICE_ENABLED=false)
- EVNT-021 (escalation config / EscalationProperties)
- INT-EVNT-005 (AWS prerequisites — operational, no code)

#### Specs cobertas
- SPEC-11 (all ESC rules), ADR-005, data-model.md §2.2–2.3, event-contracts §1.2 (EscalationAttempted)

#### Sequencia de execucao
- Fase 1: EVNT-021 — EscalationProperties + application.yml config (prerequisite for VAPID keys and timings)
- Fase 2: EVNT-016 — EscalationPolicy (pure domain, unit-tested)
- Fase 3: EVNT-018 — WebPushAdapter + EmergencyNotificationPort interface (Tier 0 operational first)
- Fase 4: EVNT-019 — AwsSmsAdapter (disabled flag wired; real AWS deferred to INT-EVNT-005)
- Fase 5: EVNT-020 — AwsVoiceAdapter (disabled flag wired)
- Fase 6: EVNT-017 — EscalationSweep wiring all components
- Parallel: INT-EVNT-005 (operational — no EVNT code change until prerequisites confirmed)

#### Criterios de aceite
- Tier 0 Web Push fires at T+0 for all linked caregivers (ESC-2/3)
- Confirmed event → no further tier starts (ESC-1)
- Double sweep → no duplicate attempt row (ESC-4, uq_escalation_tier)
- channel-disabled (SMS/Voice off) → recorded `failed channel-disabled`, never silent (ESC-5)
- EscalationAttempted audited to HIST for every attempt (ESC-7)
- VAPID keys absent → startup failure with descriptive error

#### Riscos
- INT-EVNT-ACS-001 (caregiver phone) blocks Tiers 1–2 real delivery; Tier 0 fully operational without it
- INT-EVNT-005 (AWS prerequisites) blocks enabling SMS/Voice — telephony stays feature-flagged off until confirmed

#### Instrucao para implementador

Build P6 bottom-up: EscalationProperties → EscalationPolicy → WebPushAdapter → SMS/Voice adapters →
EscalationSweep. The EscalationPolicy must be a pure domain service (no Spring, no I/O). The sweep
uses the `ix_event_active_alarm` partial index — ensure EVNT-008 is deployed before testing sweep
performance. Keep telephony adapters always-disabled in test profiles; use WireMock for the VAPID
push endpoint. Register domain verbs `ingest`/`confirm`/`record` in `_OP_VERB_TO_ACTION` (D-531)
before scaffold generates the EscalationSweep wiring code.

---

### Prioridade 7 — Read surface + push subscriptions

Status: pendente

#### Objetivo / Resultado esperado

Four read endpoints (GET active-alarm, GET events list, GET event by id, GET escalation-attempts)
and two push-subscription endpoints (POST/DELETE) with correct ACS link scoping and masked
destinations.

#### Issues vinculadas
- EVNT-022 (PatientEventController + EscalationAttemptController read surface)
- EVNT-023 (PushSubscriptionController + use cases)

#### Specs cobertas
- SPEC-01 §3/3.4/6, api-contract §3/6, INV-EVNT-7

#### Sequencia de execucao
- Fase 1: EVNT-022 — read surface (GET endpoints, link scoping, pagination)
- Fase 2: EVNT-023 — push subscription CRUD (POST idempotent, DELETE anti-enum)

#### Criterios de aceite
- Unlinked patientId/eventId → 404 (never discloses existence — INV-EVNT-7)
- Escalation-attempts response masks phone last digits
- Push subscription idempotent re-register → 200 OK, no new row
- DELETE not-owned subscription → 404

#### Riscos
- Read scoping relies on EVNT-013 (ACS links cache) being wired — confirm cache TTL is appropriate
  to avoid stale link data showing data to unlinked caregivers

#### Instrucao para implementador

EVNT-022 is the last endpoint group before BDD. The active-alarm endpoint must return
`pollIntervalSeconds` (from `EVNT_ACTIVE_ALARM_POLL_SECONDS`) and `serverTime` on every response —
including the null-alarm case. The escalation-attempts controller masks the last significant digits
of `channel_target` before serializing; this masking belongs in the response DTO, not in the
repository.

---

### Prioridade 8 — Observability + health

Status: pendente

#### Objetivo / Resultado esperado

`GET /evnt/health` (public, DB-only readiness), MDC logging with tenantId + correlationId,
Micrometer escalation metrics counter.

#### Issues vinculadas
- EVNT-024 (EvntHealthIndicator + MdcFilter + metrics)

#### Specs cobertas
- SPEC-07 (observability), api-contract §7

#### Sequencia de execucao
- Fase única: EVNT-024

#### Criterios de aceite
- GET /evnt/health → 200 when DB up, 503 when DB down
- PAT/ACS/HIST/EDGE down does NOT cause 503 (per-dep detail only)
- MDC carries tenantId + correlationId on every request log line
- evnt.escalation.attempts counter incremented per attempt

#### Riscos
Nenhum significativo.

#### Instrucao para implementador

The health indicator checks the DB connection via a minimal JDBC `SELECT 1`. Do NOT add PAT/ACS
readiness to the overall status — these are reported as detail only (SPEC-07). Wire `MdcFilter`
as a `OncePerRequestFilter` before the security filter chain so it covers unauthenticated paths too.

---

### Prioridade 9 — BDD end-to-end

Status: pendente

#### Objetivo / Resultado esperado

Three Cucumber feature files covering: (a) gesture-report ingest, (b) confirmation/feedback/
escalation trail/push lifecycle, (c) SAFETY-1 escalation tier ladder (ESC-4, ESC-5, ESC-1).
All pass against real PostgreSQL Testcontainer.

#### Issues vinculadas
- EVNT-025 (BDD ingest + EDGE token)
- EVNT-026 (BDD confirm + feedback + read + push)
- EVNT-027 (BDD out-of-band escalation)

#### Specs cobertas
- SPEC-08 (BDD scenarios), SPEC-11

#### Sequencia de execucao
- Fase 1: EVNT-025 — CucumberSpringContext + ingest feature (foundation for all BDD)
- Fase 2: EVNT-026 — confirmation/feedback/subscription features (reuses context)
- Fase 3: EVNT-027 — escalation features (most complex, requires EVNT-016/017/018)

#### Criterios de aceite
- All BDD scenarios use real PostgreSQL Testcontainer (no H2 — pitfall P8-EVNT-022)
- ingest, confirmation, feedback, escalation features each have ≥ 5 scenarios
- EscalationSweep triggered directly in tests (not via scheduler timer)
- `./gradlew :evnt-service:test` exits 0

#### Riscos
- CucumberSpringContext must include singleton `PostgreSQLContainer` with `@DynamicPropertySource` for datasource URL — without it Spring context uses H2 which is incompatible with multi-tenancy JPA config (learning pitfall from D-531)

#### Instrucao para implementador

EVNT-025 establishes the `CucumberSpringContext` with `PostgreSQLContainer` — do this first before
the other two BDD issues. The escalation BDD scenarios (EVNT-027) should trigger `EscalationSweep.sweep()`
directly (not via `@Scheduled`) to control timing deterministically. WireMock for VAPID push endpoint
must respond with both 200 (sent) and 410 (endpoint-gone) in different scenario branches.

---

## 3. Dependências externas

| Dependência | Bloqueia | Status |
|---|---|---|
| ACS service-client minting path | EVNT-012, EVNT-013, EVNT-014 | INT-EVNT-002 (open) |
| ACS caregiver phone/consent | EVNT-019, EVNT-020 | INT-EVNT-ACS-001 (open) |
| HIST failure policy | EVNT-014 | INT-EVNT-003 (open) |
| MIG range V0040–V0044 | Integration testing | INT-EVNT-004 (open) |
| AWS End User Messaging prerequisites | EVNT-019, EVNT-020 (enable) | INT-EVNT-005 (operational) |

---

## 4. Restrições arquiteturais (Java stack)

- ArchUnit RULE-01..08 (CLAUDE.md generated project): `api` → `application` → `domain`; `infrastructure` → `domain` only; `domain` → no Spring/JPA; `@Transactional` only in `application.service`
- Domain verbs `ingest`/`confirm`/`record` must be registered in `_OP_VERB_TO_ACTION` before scaffold (D-531 learning pitfall)
- Multi-tenant schema routing via `TenantContextHolder` → Hibernate `CurrentTenantIdentifierResolver`; no `SET search_path` in application code
- All AWS End User Messaging resources in the **project-selected Region only** — no cross-Region (CLAUDE.md constraint)
- No Lambda@Edge; no CloudFormation StackSets; no cross-Region replication (CLAUDE.md)
- BDD: PostgreSQL Testcontainer (singleton) always; never H2 for EVNT tests

---

## 5. Referências

- docs/architecture/backend/services/evnt-service/01-architectural-vision.md
- docs/architecture/backend/services/evnt-service/06-risks-gaps-assumptions.md
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md
- docs/architecture/backend/services/evnt-service/contracts/data-model.md
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md
- docs/architecture/backend/services/evnt-service/spec/backend/SPEC-01..11
- docs/architecture/backend/services/evnt-service/adr/ADR-001..005
- docs/architecture/backend/services/evnt-service/generator-config.yml
- docs/architecture/backend/issues/issues_map-EVNT.md
- docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md
- docs/architecture/backend/adr/ADR-003-multi-tenancy.md
