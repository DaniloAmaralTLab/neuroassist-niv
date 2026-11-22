# Plan — HIST (hist-service)

> Generated 2026-11-20 by /be-architect-backlog neuroassist-niv HIST

## Status das prioridades

- P1 -- pendente
- P2 -- pendente
- P3 -- pendente
- P4 -- pendente
- P5 -- pendente
- P6 -- pendente
- P7 -- pendente
- P8 -- pendente
- P9 -- pendente

---

## 0. Leitura executiva

### Papel do servico

`hist-service` is the authoritative append-only audit trail for the neuroassist-niv platform.
It receives synchronous audit-record writes from all 5 upstream producers (ACS, PAT, EDGE, EVNT,
GEST) via `POST /hist/audit`, persists them in schema-per-tenant tables, and exposes:
- A caregiver-facing patient timeline (`GET /hist/patients/{patientId}/history`)
- A compliance-operator full-trail query (`GET /hist/audit`)
- A data-subject erasure endpoint (`POST /hist/subjects/{subjectId}/erasure`)

### MVP scope

The MVP delivers: (1) the ingest endpoint (all 36 facts, 5 producers, failure-policy ADR-005
20+16 split), (2) the caregiver timeline with structured G-HIST-1..5 projection and G-HIST-4
first-page summary, (3) the operator audit query, (4) crypto-shred erasure (ADR-006), and
(5) the security/observability hardening required for >=99.9% SLO.

### Diagnostic initial

No prior HIST skeleton exists (greenfield service). All 36 facts are documented in
`event-contracts.md`. The 5 upstream producers have TODO[architect] markers for the
commit+durable-retry path (16 facts) — INT-HIST-004 closes them. The GEST envelope diverges
in 7 structural points handled by `EnvelopeReconciliationAdapter` (HIST-003). The caregiver
FE timeline HIST-FE-001..005 (fe-architect-backlog) are parallel FE issues.

---

## 1. Estrategia geral

### Objetivo macro

Deliver a production-ready, immutable, multi-tenant audit trail with schema-per-tenant isolation,
crypto-shred erasure, keyset-paginated caregiver timeline, and a synchronous ingest API secured
by service-client JWTs.

### Ordem das prioridades

| P | Titulo | Motivo |
|---|---|---|
| P1 | API scaffold + ingest controller + envelope adapter | Unblocks all producers; exposes the POST /hist/audit contract |
| P2 | AppendAuditRecord use case + AuditService | Business logic golden path: scope routing + unknown-action flagging |
| P3 | Flyway DDL + DB grants + JPA entities + MIG integration | Persistence foundation; MIG must run before HIST can start in staging |
| P4 | Idempotency + ACS token issuance | Deduplication is a correctness gate for the 20 hard-502 producers |
| P5 | SecurityConfig + link scoping + producer base-URL + durable retry | Auth layer + producer-side commit+retry (16 W1 facts) |
| P6 | Caregiver timeline (QueryPatientHistory + G-HIST-1..5 + G-HIST-4) + EVNT payload amendment | Full FE-facing read path |
| P7 | Operator audit query + observability | Compliance + SLO instrumentation |
| P8 | Erasure + retention seeding + BDD wire-up | LGPD/GDPR + test harness |
| P9 | Hardening + GEST doc amendment + retention legal action | HA hints, ArchUnit, non-blocking items |

---

## 2. Plano por prioridade

### Prioridade 1 — API scaffold + ingest controller + envelope adapter
Status: pendente

#### Objetivo / Resultado esperado
`hist-service` builds and deploys with an empty Spring context. `POST /hist/audit` is callable
by authenticated service-clients (even without DB, returns `503 Service Unavailable` gracefully).
Envelope normalization for GEST divergences 1-7 and DetectionLapseResolved disambiguation are
in place before any domain logic.

#### Issues vinculadas
- HIST-001 (hexagonal scaffold)
- HIST-002 (AuditController + DTOs)
- HIST-003 (EnvelopeReconciliationAdapter)

#### Specs cobertas
- SPEC-01 (api surface)
- event-contracts.md §2 (GEST divergences 1-7, DetectionLapseResolved disambiguation §5)

#### Sequencia de execucao
- Fase 1: HIST-001 — scaffold, build.gradle.kts, integrationTest task
- Fase 2: HIST-002 — AuditController + DTOs + GlobalExceptionHandler skeleton
- Fase 3: HIST-003 — EnvelopeReconciliationAdapter

#### Criterios de aceite
- `./gradlew :hist-service:compileJava` exits 0
- `POST /hist/audit` with mock service-client token reaches `AuditController.record`
- GEST envelope with divergences 1-7 passes normalization without exception

#### Riscos
Envelope normalization is complex (7 divergence rules + disambiguation). Start with a
comprehensive unit test per divergence case before wiring into the controller.

#### Instrucao para implementador
Read `event-contracts.md §2` fully before implementing HIST-003. The 7 divergences are
normalization rules (not validation/rejection). Divergence #8 is doc-only (INT-HIST-006).

---

### Prioridade 2 — AppendAuditRecord use case + AuditService
Status: pendente

#### Objetivo / Resultado esperado
The ingest golden path: scope routing (tenant schema vs global schema for GEST facts),
INV-HIST-2..5 validation, unknown-action flagging, and the AuditService facade are operational.

#### Issues vinculadas
- HIST-004 (AppendAuditRecord use case)
- HIST-005 (AuditScopeRouter + AuditService)

#### Specs cobertas
- SPEC-02 (audit append)
- ADR-004 (tenant isolation — scope routing)

#### Sequencia de execucao
- Fase 1: HIST-004 — domain model + use case
- Fase 2: HIST-005 — AuditService + AuditScopeRouter

#### Criterios de aceite
- Envelope with tenantId → routed to tenant store; without tenantId + GEST source → global store; without tenantId + non-GEST → 400
- Unknown action/payloadVersion → `flagged = true`, stored, `201` (never `422`)
- `./gradlew :hist-service:test` exits 0

#### Riscos
Scope routing decision tree has 3 branches; each must have an explicit unit test to prevent
accidental cross-schema writes.

#### Instrucao para implementador
`TenantContextHolder.require()` is the first line in any tenant-scoped write method. Never
read `tenantId` from the envelope inside a tenant-scoped adapter — the schema is the boundary.

---

### Prioridade 3 — Flyway DDL + DB grants + JPA entities + MIG integration
Status: pendente

#### Objetivo / Resultado esperado
5 Flyway scripts (V0060-V0064) create the schema; V0065 adds the caregiver-timeline index.
DB grants enforce immutability (INSERT/SELECT only on audit tables). JPA entities are
INSERT-only adapters. MIG ingests the scripts and applies them to the shared DB.

#### Issues vinculadas
- HIST-006 (Flyway V0060-V0064)
- HIST-007 (Flyway V0065)
- HIST-008 (DB grants)
- HIST-009 (JPA entities + adapters)
- INT-HIST-005 (MIG applies migrations)

#### Specs cobertas
- SPEC-04 (data model)
- ADR-002 (append-only — DB grants)
- ADR-004 (schema-per-tenant)

#### Sequencia de execucao
- Fase 1: HIST-006 (DDL — tables)
- Fase 2: HIST-007 (DDL — index)
- Fase 3: HIST-008 (grants in DDL scripts)
- Fase 4: HIST-009 (JPA)
- Fase 5: INT-HIST-005 (MIG ingests V0060-V0065)

#### Criterios de aceite
- `ddl-auto=validate` IT against test-container Postgres confirms entity-table alignment
- Attempt to UPDATE an audit_record row via JDBC raises PSQLException (permission denied)
- `./gradlew :hist-service:integrationTest` exits 0

#### Riscos
`AuditRecordJpaEntity` must NOT map `tenant_id` as a Java field (schema is the isolation
boundary). Mapping it accidentally creates a stray column error at validation time.

#### Instrucao para implementador
Run `./gradlew :hist-service:integrationTest` with `spring.jpa.hibernate.ddl-auto=validate`
in `application-test.yml` immediately after adding each entity — catch schema drift early.

---

### Prioridade 4 — Idempotency + ACS token issuance
Status: pendente

#### Objetivo / Resultado esperado
Duplicate `POST /hist/audit` requests with the same key return `200` with the original record
(no second row). ACS issues service-client tokens with `hist.audit.record` to all 5 producers.

#### Issues vinculadas
- HIST-010 (IdempotencyKey + ON CONFLICT)
- INT-HIST-001 (ACS token-issuance amendment)

#### Specs cobertas
- SPEC-05 (idempotency)
- SPEC-06 (security — authority table)
- ADR-003 (hybrid idempotency — Option C)

#### Sequencia de execucao
- Fase 1: HIST-010 — IdempotencyKey + adapter ON CONFLICT logic
- Fase 2: INT-HIST-001 — ACS config amendment (can run in parallel with HIST-010)

#### Criterios de aceite
- Concurrent duplicate inserts → exactly one row (UNIQUE constraint serializes)
- Service-client token with `hist.audit.record` → `201` on HIST; operator token without it → `403`

#### Riscos
ON CONFLICT DO NOTHING with RETURNING can return 0 rows on conflict. The adapter must
detect this case and SELECT the existing row to return `{replay: true}`.

---

### Prioridade 5 — SecurityConfig + link scoping + producer base-URL + durable retry
Status: pendente

#### Objetivo / Resultado esperado
JWT validation, TenantContextFilter (correct order), ACS link scope checker, all 5 producers
configured with correct base-URL, and 16 W1 facts protected by durable outbox retry.

#### Issues vinculadas
- HIST-011 (SecurityConfig + TenantContextFilter)
- HIST-012 (ServiceClientIdentityResolver + ACS link scoping)
- INT-HIST-003 (producer base-URL config)
- INT-HIST-004 (producer commit+durable-retry)

#### Specs cobertas
- SPEC-06 (security)
- ADR-005 (failure policy — commit+durable-retry)
- ADR-003 (idempotencyKey on retry)

#### Sequencia de execucao
- Fase 1: HIST-011 (SecurityConfig) — HIST side
- Fase 2: HIST-012 (identity + link scoping) — HIST side
- Fase 3: INT-HIST-003 (base-URL config) — producer side, parallel
- Fase 4: INT-HIST-004 (durable retry) — producer side

#### Criterios de aceite
- TenantContextFilter registered after BearerTokenAuthenticationFilter (IT: tenant extracted from token; not from request param)
- Caregiver linked to patientId → 200; not linked → 403 (ACS link scope, AcsLinkScopeAdapter IT)
- Each producer base-URL includes /hist; smoke test: POST reaches AuditController
- 16 W1 facts commit+retry: on HIST failure, outbox row persisted; retry produces 200 replay on HIST

#### Riscos
TenantContextFilter wrong order is a known Learning pitfall. Verify FilterRegistrationBean
`setEnabled(false)` is present — otherwise the filter is registered twice by the servlet container
and executes before JWT processing on the second registration.

#### Instrucao para implementador
See HIST-011 AC-3 and AC-4 for the exact registration pattern. Test with an IT that calls the
endpoint without a JWT and confirms the filter is not hit (401 precedes it).

---

### Prioridade 6 — Caregiver timeline + EVNT payload amendment
Status: pendente

#### Objetivo / Resultado esperado
`GET /hist/patients/{patientId}/history` returns a structured, paginated timeline with G-HIST-1..5
fields and G-HIST-4 first-page summary. `commandLabel` and `maskedTarget` are present once EVNT
amends its audit payloads (INT-HIST-002).

#### Issues vinculadas
- HIST-013 (PatientHistoryService + QueryPatientHistory)
- HIST-014 (HistoryEntryMapper G-HIST-1..5)
- HIST-015 (ComputePeriodSummary G-HIST-4)
- INT-HIST-002 (EVNT payload amendment — commandLabel + maskedTarget)

#### Specs cobertas
- SPEC-03 (caregiver history)
- api-contract.md §2 (G-HIST-1..5 field table, G-HIST-4 period summary)

#### Sequencia de execucao
- Fase 1: HIST-013 (QueryPatientHistory — keyset pagination + window resolution)
- Fase 2: HIST-014 (HistoryEntryMapper — G-HIST-1..5)
- Fase 3: HIST-015 (ComputePeriodSummary — G-HIST-4; first-page only)
- Fase 4: INT-HIST-002 (EVNT amends payloads — parallel with HIST-015)

#### Criterios de aceite
- GET /hist/patients/{id}/history returns timeline ordered newest-first; nextCursor present when more records
- G-HIST-4 summary present on page 1 (no cursor); absent on page 2+ (cursor present)
- commandLabel absent when EVNT hasn't sent it (backward-compatible, no empty string)
- Both EDGE and EVNT DetectionLapseResolved appear as distinct entries when both present in window

#### Riscos
G-HIST-4 summary must aggregate over the **whole window**, not just the returned page.
Using LIMIT/OFFSET instead of a separate COUNT query causes incorrect summary counts.

---

### Prioridade 7 — Operator audit query + observability
Status: pendente

#### Objetivo / Resultado esperado
Compliance operators can query the full audit trail with filter combinations. Micrometer metrics
and X-Correlation-Id are wired across all endpoints. Health/readiness reflects PostgreSQL state.

#### Issues vinculadas
- HIST-016 (OperatorAuditController + QueryAuditTrail)
- HIST-019 (ObservabilityConfig + CorrelationIdFilter)

#### Specs cobertas
- SPEC-01 (api surface — operator trail)
- SPEC-07 (observability + health)

#### Sequencia de execucao
- Fase 1: HIST-016 (operator query endpoint)
- Fase 2: HIST-019 (observability — can run in parallel)

#### Criterios de aceite
- GET /hist/audit?correlationId=X returns all records across producers ordered by occurredAt ASC
- GET /hist/audit?flagged=true returns only flagged records
- /actuator/health/readiness returns DOWN when PostgreSQL unreachable
- hist.audit.appended counter incremented on each successful ingest

---

### Prioridade 8 — Erasure + retention seeding + BDD wire-up
Status: pendente

#### Objetivo / Resultado esperado
Data-subject erasure (crypto-shred) is operational. Retention policy rows are seeded with
NULL periods (legal TODO). BDD suite runs with --dry-run (pending step implementations).

#### Issues vinculadas
- HIST-017 (SubjectErasureService + POST /hist/subjects/{id}/erasure)
- HIST-018 (retention policy seeding)
- HIST-020 (BDD wire-up)

#### Specs cobertas
- SPEC-11 (retention + erasure)
- ADR-002 (erasure never touches audit rows)
- ADR-006 (crypto-shred + retention frame)

#### Sequencia de execucao
- Fase 1: HIST-018 (V0063 seed) — depends only on HIST-006
- Fase 2: HIST-017 (erasure service + controller)
- Fase 3: HIST-020 (CucumberIT --dry-run)

#### Criterios de aceite
- POST /hist/subjects/{id}/erasure → 202 SHREDDED; repeat → 200; unknown subject → 404
- Audit row count unchanged after erasure (append-only preserved, only key deleted)
- ./gradlew :hist-service:integrationTest exits 0 with --dry-run

---

### Prioridade 9 — Hardening + GEST doc amendment + retention legal action
Status: pendente

#### Objetivo / Resultado esperado
HA deployment hints, ArchUnit enforcement, GlobalExceptionHandler hardening, GEST docs aligned
to ADR-005, and retention period legal action triggered (non-blocking).

#### Issues vinculadas
- HIST-021 (hardening)
- INT-HIST-006 (GEST doc amendment)
- INT-HIST-007 (retention periods — owner TODO)

#### Specs cobertas
- SPEC-06 (security — SLO >=99.9%)
- ADR-001 (hexagonal architecture — ArchUnit)
- ADR-005 (GEST hard-502)
- ADR-006 (retention frame)

#### Sequencia de execucao
- Fase 1: HIST-021 (ArchUnit + GlobalExceptionHandler + HA hints + backlog-alert docs)
- Fase 2: INT-HIST-006 (GEST doc-only — parallel)
- Fase 3: INT-HIST-007 (owner action item — parallel, external timeline)

#### Criterios de aceite
- HexagonalArchitectureTest RULE-01..08 passes
- AccessDeniedException → 403 (not 500) confirmed by IT
- GEST event-contracts.md cites ADR-005; no best-effort language
- audit_retention_policy seeded (HIST-018); INT-HIST-007 owner TODO acknowledged

---

## 3. Dependencias externas

| Dependency | Needed by | Type |
|---|---|---|
| ACS JWKS endpoint | HIST-011 (JWT validation) | Runtime |
| ACS service-client tokens (hist.audit.record) | INT-HIST-001 | Config |
| PostgreSQL (schema-per-tenant) | HIST-006..HIST-010 | Infrastructure |
| MIG migration run | INT-HIST-005 | Deployment |
| All 5 producers (hist.base-url config) | INT-HIST-003 | Config |
| EVNT commandLabel/maskedTarget amendment | INT-HIST-002 | Upstream code |
| Legal counsel (retention periods) | INT-HIST-007 | External / legal |

---

## 4. Restricoes arquiteturais

- ArchUnit RULE-01..08 enforced (HIST-021): domain has no Spring/JPA imports; `@Transactional` only in `application.service`; `api` imports no `infrastructure`
- DB grants (HIST-008): INSERT/SELECT only on audit tables; DELETE only on `audit_subject_key` (erasure path); no UPDATE/DELETE elsewhere
- Append-only invariant (ADR-002): no `repository.findById().modify()` on `AuditRecord`; adapter uses `save(newEntity)` only
- TenantContextFilter registered AFTER `BearerTokenAuthenticationFilter` (HIST-011); `FilterRegistrationBean.setEnabled(false)` mandatory
- `GlobalExceptionHandler` overrides `handleMethodArgumentNotValid()` from `ResponseEntityExceptionHandler` parent class — not `@ExceptionHandler(MethodArgumentNotValidException.class)` (would cause ambiguous handler in Spring Boot 3.x)
- Personal payload fields (LGPD): never log them; never project them in `HistoryEntry` after erasure
- `commandLabel` and `maskedTarget`: pass through verbatim when present; omit (not null-string) when absent

---

## 5. Referencias

- `docs/architecture/backend/services/hist-service/contracts/api-contract.md`
- `docs/architecture/backend/services/hist-service/contracts/data-model.md`
- `docs/architecture/backend/services/hist-service/contracts/event-contracts.md`
- `docs/architecture/backend/services/hist-service/generator-config.yml`
- `docs/architecture/backend/services/hist-service/adr/ADR-002-audit-immutability-guarantee.md`
- `docs/architecture/backend/services/hist-service/adr/ADR-003-audit-ingest-idempotency.md`
- `docs/architecture/backend/services/hist-service/adr/ADR-004-tenant-isolation-of-audit.md`
- `docs/architecture/backend/services/hist-service/adr/ADR-005-audit-write-failure-policy.md`
- `docs/architecture/backend/services/hist-service/adr/ADR-006-retention-vs-erasure.md`
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`
- `docs/architecture/backend/issues/issues_map-HIST.md`
