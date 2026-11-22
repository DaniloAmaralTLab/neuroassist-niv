# Issues Map — HIST (hist-service)

> Generated 2026-11-20 by /be-architect-backlog neuroassist-niv HIST

## Summary

| Count | Detail |
|---|---|
| Functional issues | 21 (HIST-001..HIST-021) |
| Integration issues | 7 (INT-HIST-001..INT-HIST-007) |
| **Total** | **28** |

## By Priority

| Priority | Issues |
|---|---|
| P1 | HIST-001, HIST-002, HIST-003 |
| P2 | HIST-004, HIST-005 |
| P3 | HIST-006, HIST-007, HIST-008, HIST-009, INT-HIST-005 |
| P4 | HIST-010, INT-HIST-001 |
| P5 | HIST-011, HIST-012, INT-HIST-003, INT-HIST-004 |
| P6 | HIST-013, HIST-014, HIST-015, INT-HIST-002 |
| P7 | HIST-016, HIST-019 |
| P8 | HIST-017, HIST-018, HIST-020 |
| P9 | HIST-021, INT-HIST-006, INT-HIST-007 |

## By Layer (hexagonal)

### api (controllers, DTOs, filters)
- HIST-002 — AuditController + POST /hist/audit
- HIST-013 — PatientHistoryController + GET /hist/patients/{id}/history
- HIST-016 — OperatorAuditController + GET /hist/audit
- HIST-017 — SubjectErasureController + POST /hist/subjects/{id}/erasure
- HIST-003 — EnvelopeReconciliationAdapter (api/adapter)

### application (use cases, services, mappers)
- HIST-004 — AppendAuditRecord use case
- HIST-005 — AuditScopeRouter + AuditService facade
- HIST-010 — IdempotencyKey derivation (domain model, used by application)
- HIST-013 — QueryPatientHistory use case
- HIST-014 — HistoryEntryMapper (G-HIST-1..5)
- HIST-015 — ComputePeriodSummary use case (G-HIST-4)
- HIST-016 — QueryAuditTrail use case
- HIST-017 — SubjectErasureService + RequestSubjectErasure use case
- HIST-018 — Retention policy seeding (via MIG)

### domain (models, ports)
- HIST-004 — AuditRecord domain model + AuditTrailPort
- HIST-005 — AuditTrailGlobalPort
- HIST-010 — IdempotencyKey domain model
- HIST-012 — AcsLinkScopePort (caregiver link verification)
- HIST-014 — HistoryEntry domain model

### infrastructure (JPA, security, config)
- HIST-001 — Hexagonal scaffold + build.gradle.kts
- HIST-006 — Flyway V0060-V0064 DDL
- HIST-007 — Flyway V0065 index
- HIST-008 — DB grants enforcement
- HIST-009 — JPA entities + adapters (AuditRecord, AuditRecordGlobal)
- HIST-011 — SecurityConfig + TenantContextFilter
- HIST-012 — ServiceClientIdentityResolver + AcsLinkScopeAdapter
- HIST-017 — AuditSubjectKeyJpaEntity + adapter
- HIST-019 — ObservabilityConfig + CorrelationIdFilter
- HIST-020 — CucumberSpringContext + CucumberIT
- HIST-021 — HexagonalArchitectureTest + GlobalExceptionHandler hardening

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (api surface) | HIST-001, HIST-002, HIST-016 |
| SPEC-02 (audit append) | HIST-004, HIST-005 |
| SPEC-03 (caregiver history) | HIST-013, HIST-014, HIST-015 |
| SPEC-04 (data model/migrations) | HIST-006, HIST-007, HIST-008, HIST-009 |
| SPEC-05 (idempotency) | HIST-010 |
| SPEC-06 (security) | HIST-011, HIST-012, HIST-021 |
| SPEC-07 (observability) | HIST-016, HIST-019, HIST-021 |
| SPEC-08 (BDD) | HIST-020 |
| SPEC-09 (messaging/durable retry) | HIST-021, INT-HIST-004 |
| SPEC-10 (integrations) | INT-HIST-001, INT-HIST-002, INT-HIST-003, INT-HIST-005 |
| SPEC-11 (retention/erasure) | HIST-017, HIST-018, INT-HIST-007 |

## Integration Issues Detail

| Issue | Owner | Priority | Blocking |
|---|---|---|---|
| INT-HIST-001 | ACS | P4 | HIST ingest unblocked only with correct tokens |
| INT-HIST-002 | EVNT | P6 | G-HIST-1/G-HIST-3 fields absent until EVNT amends |
| INT-HIST-003 | All 5 producers | P5 | URL misconfiguration → 404 on all ingest calls |
| INT-HIST-004 | ACS/PAT/EDGE/EVNT | P5 | Eventual consistency for 16 W1 facts |
| INT-HIST-005 | MIG | P3 | Tables must exist before HIST can start |
| INT-HIST-006 | GEST | P9 | Doc-only; non-blocking |
| INT-HIST-007 | Owner + counsel | P9 | Non-blocking for MVP; blocks future sweep job |

## Full Issue List

| ID | Title | Kind | Priority | Status |
|---|---|---|---|---|
| HIST-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | BE | P1 | INTACT |
| HIST-002 | AuditController + request/response DTOs + POST /hist/audit API layer (authority hist.audit.record) | BE | P1 | INTACT |
| HIST-003 | EnvelopeReconciliationAdapter — GEST normalisation (divergences 1-7) + DetectionLapseResolved disambiguation by (source, subjectType) | BE | P1 | INTACT |
| HIST-004 | AppendAuditRecord use case — INV-HIST-2..5 validation, scope routing (tenant vs global ADR-004), unknown-action flagging (INV-HIST-4) | BE | P2 | INTACT |
| HIST-005 | AuditScopeRouter + AuditService facade — tenant-scoped vs global-schema routing; AuditService.record (ingest) entry point | BE | P2 | INTACT |
| HIST-006 | Flyway V0060-V0064 — audit_record (tenant), audit_subject_key (tenant), audit_record_global (global), audit_retention_policy (global), audit_source (global); reserved hash columns (ADR-002 Option B additive) | BE | P3 | INTACT |
| HIST-007 | Flyway V0065 — additive index ix_audit_record_patient_time (caregiver-timeline read + G-HIST-4) | BE | P3 | INTACT |
| HIST-008 | DB grants enforcement — INSERT/SELECT only on audit_record + audit_record_global; INSERT/SELECT/DELETE on audit_subject_key; revoke UPDATE/DELETE (ADR-002, INV-HIST-1) | BE | P3 | INTACT |
| HIST-009 | JPA entities AuditRecord + AuditRecordGlobal — INSERT-only adapters + schema-per-tenant routing via TenantContextHolder | BE | P3 | INTACT |
| HIST-010 | Idempotency key derivation — explicit idempotencyKey wins; composite fallback; INSERT ON CONFLICT DO NOTHING → 201/200; concurrent-insert serialized (ADR-003 Option C) | BE | P4 | INTACT |
| HIST-011 | SecurityConfig — OAuth2 resource-server + @EnableMethodSecurity + JwtGrantedAuthoritiesConverter + TenantContextFilter (Learning: security:tenant-filter:wrong-order) | BE | P5 | INTACT |
| HIST-012 | Service-client identity derivation (source from JWT) + ACS link scoping for caregiver reads (403 on scope violation) | BE | P5 | INTACT |
| HIST-013 | PatientHistoryService + QueryPatientHistory use case — keyset pagination, period/range resolution, 400 on partial from/to | BE | P6 | INTACT |
| HIST-014 | Structured entry projection G-HIST-1..5 — subjectId, relatedEventId, commandId/commandLabel/urgency, confirmation fold, channel + maskedTarget, outcome enum | BE | P6 | INTACT |
| HIST-015 | First-page period summary G-HIST-4 — whole-period aggregate via ix_audit_record_patient_time; absent on cursor pages | BE | P6 | INTACT |
| HIST-016 | Operator GET /hist/audit — AuditService.query with filters; authority hist.audit.read; cross-tenant operator path (ADR-004) | BE | P7 | INTACT |
| HIST-017 | SubjectErasureService + POST /hist/subjects/{id}/erasure — crypto-shred (delete key, retain audit row ADR-002); 202/200/404 | BE | P8 | INTACT |
| HIST-018 | Retention policy table seeding — 6 fact classes with nullable periods; legal hold; no sweep in MVP (ADR-006 Option C) | BE | P8 | INTACT |
| HIST-019 | Observability — Actuator health/readiness; Micrometer counters+timers; structured logging; X-Correlation-Id | BE | P7 | INTACT |
| HIST-020 | BDD wire-up — CucumberSpringContext + CucumberIT (DRY-RUN until scaffold); do NOT add new glue (5 files, 80 patterns, 0 dups) | BE | P8 | INTACT |
| HIST-021 | Hardening — SLO >=99.9% HA hints; GlobalExceptionHandler; ArchUnit RULE-01..08; backlog alert contract (16 W1 facts) | BE | P9 | INTACT |
| INT-HIST-001 | ACS mint service-client JWTs (hist.audit.record per producer) + operator tokens (hist.audit.read + hist.erasure.create) | BE | P4 | INTACT |
| INT-HIST-002 | EVNT payload amendment — commandLabel on EventGenerated + maskedTarget on EscalationAttempted; HIST passes through verbatim | BE | P6 | INTACT |
| INT-HIST-003 | Producer base-URL config — HIST_BASE_URL includes /hist prefix; config-only | BE | P5 | INTACT |
| INT-HIST-004 | Producer commit+durable-retry (16 W1 facts) — durable outbox per producer; closes 5 upstream TODO[architect] | BE | P5 | INTACT |
| INT-HIST-005 | MIG applies Flyway V0060-V0069 — global + tenant schemas; new-tenant provisioning | BE | P3 | INTACT |
| INT-HIST-006 | GEST doc amendment — divergence #8; GEST cites ADR-005; drop best-effort note; doc-only | BE | P9 | INTACT |
| INT-HIST-007 | Retention periods — owner + counsel set retention_days + lawful_basis_ref per fact class; non-blocking for MVP | BE | P9 | INTACT |
