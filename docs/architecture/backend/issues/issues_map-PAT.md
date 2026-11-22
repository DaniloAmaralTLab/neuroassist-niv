# Issues Map -- PAT (Patients and Command Catalog)

> Module: **PAT** · Service: `pat-service` · Stack: Java 21 / Spring Boot · Multi-tenant (schema-per-tenant)
> Generated: 2026-11-19 by `/be-architect-backlog neuroassist-niv PAT`

## Functional issues (PAT-001..PAT-026)

| Issue | Title | Priority | Status |
|---|---|---|---|
| PAT-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | P1 | INTACT |
| PAT-002 | Domain layer — Patient aggregate (entity, value objects, invariants INV-PAT-1/2) | P1 | INTACT |
| PAT-003 | Domain layer — Command entity (CalibrationWindow, GestureComposition, invariants INV-PAT-3/4/5) | P1 | INTACT |
| PAT-004 | Domain layer — GestureType aggregate (global vocabulary, INV-PAT-6, append-only) | P1 | INTACT |
| PAT-005 | API layer — PatientController + DTOs (register, list, get, deactivate, activate) | P1 | INTACT |
| PAT-006 | Application layer — RegisterPatient use case (+ PatientRegistered audit to HIST) | P2 | INTACT |
| PAT-007 | Application layer — CreateCommand use case (validate window + gesture composition, CommandCalibrated anchor) | P2 | INTACT |
| PAT-008 | Application layer — CalibrateCommand use case (re-validate, optimistic lock @Version, no-op no audit) | P2 | INTACT |
| PAT-009 | Application layer — RetireCommand + GestureTypeService (register, list, get; idempotent retire) | P2 | INTACT |
| PAT-010 | API layer — CommandController + GestureTypeController + DTOs (all 13 endpoints, ETag/304) | P2 | INTACT |
| PAT-011 | Infrastructure — JPA entities Patient + Command + repositories (schema-per-tenant routing) | P3 | INTACT |
| PAT-012 | Infrastructure — GestureType JPA entity + global schema routing (neuroassist_global) | P3 | INTACT |
| PAT-013 | Flyway migration scripts V0020-V0022 (global gesture_type + seed; per-tenant patient + command) | P3 | INTACT |
| PAT-014 | Infrastructure — ACS integration adapter (TokenValidationPort — JWKS cache + AcsIntrospectionPort) | P4 | INTACT |
| PAT-015 | Infrastructure — HistAuditPort adapter (sync REST POST /audit, 502 on failure in prod) | P4 | INTACT |
| PAT-016 | Cross-cutting — TenantContextHolder + schema-per-tenant DataSource routing (JWT tenantId claim) | P4 | INTACT |
| PAT-017 | Security — RoleAuthorityPolicy (single source of truth) + Spring Security resource server config | P5 | INTACT |
| PAT-018 | Security — patient-session token rejection 403 (INV-PAT-7) + cross-tenant 404 guard (INV-PAT-1/2) | P5 | INTACT |
| PAT-019 | Observability — Actuator health/readiness + Micrometer metrics (pat_command_calibrated_total, etc.) | P7 | INTACT |
| PAT-020 | Observability — X-Correlation-Id propagation + structured logging (PHI minimization) | P7 | INTACT |
| PAT-021 | BDD setup — EmbeddedPostgres + Cucumber wiring (application-test.yml, step-definition base) | P8 | INTACT |
| PAT-022 | BDD — patient-registration.feature step definitions (SPEC-01/02, INV-PAT-1/2/7) | P8 | INTACT |
| PAT-023 | BDD — command-calibration.feature step definitions (SPEC-02, INV-PAT-3/4/5) | P8 | INTACT |
| PAT-024 | BDD — catalog-distribution-and-authority.feature step definitions (SPEC-03/06, ADR-004, INV-PAT-6/7) | P8 | INTACT |
| PAT-025 | Hardening — ACS JWKS cache + introspection Resilience4j circuit breaker + graceful fallback | P9 | INTACT |
| PAT-026 | Durable audit retry for PatientDeactivated (HIST ADR-005 commit+durable-retry) | P9 | INTACT |

## Integration issues (INT-PAT-001..INT-PAT-006)

| Issue | Title | Priority | Status |
|---|---|---|---|
| INT-PAT-001 | ACS service-client token minting — confirm authority-grant path with ACS at scaffold | P4 | INTACT |
| INT-PAT-002 | HIST failure policy — confirm hard 502 vs enqueue-and-retry against hist-service contract | P4 | INTACT |
| INT-PAT-003 | MIG registry — promote PAT V0020-V0022 reserved range into the MIG service docs | P3 | INTACT |
| INT-PAT-004 | GEST/EDGE catalog pull contract — verify ETag/304 consumer integration (SPEC-03, ADR-004) | P4 | INTACT |
| INT-PAT-005 | LGPD erasure strategy — deferred decision for PAT soft-delete vs HIST immutability | P9 | INTACT |
| INT-PAT-006 | HIST audit: base URL + /hist path + hist.audit.record token | P4 | INTACT |

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (api surface) | PAT-001, PAT-005, PAT-010, PAT-017 |
| SPEC-02 (command calibration) | PAT-002, PAT-003, PAT-006, PAT-007, PAT-008, PAT-009 |
| SPEC-03 (catalog distribution, ADR-004) | PAT-004, PAT-010, PAT-012, PAT-024, INT-PAT-004 |
| SPEC-04 (data model, migrations) | PAT-011, PAT-012, PAT-013, INT-PAT-003 |
| SPEC-05 (idempotency, concurrency) | PAT-006, PAT-008, PAT-009 |
| SPEC-06 (security) | PAT-005, PAT-017, PAT-018, INT-PAT-001 |
| SPEC-07 (observability) | PAT-019, PAT-020 |
| SPEC-08 (BDD) | PAT-021, PAT-022, PAT-023, PAT-024 |
| SPEC-09 (messaging disabled) | PAT-015, PAT-026 (HIST ADR-005 durable retry) |
| SPEC-10 (integrations) | PAT-014, PAT-015, PAT-016, PAT-025, PAT-026, INT-PAT-001, INT-PAT-002, INT-PAT-006 |

## By priority

| Priority | Issues |
|---|---|
| P1 | PAT-001, PAT-002, PAT-003, PAT-004, PAT-005 |
| P2 | PAT-006, PAT-007, PAT-008, PAT-009, PAT-010 |
| P3 | PAT-011, PAT-012, PAT-013, INT-PAT-003 |
| P4 | PAT-014, PAT-015, PAT-016, INT-PAT-001, INT-PAT-002, INT-PAT-004, INT-PAT-006 |
| P5 | PAT-017, PAT-018 |
| P7 | PAT-019, PAT-020 |
| P8 | PAT-021, PAT-022, PAT-023, PAT-024 |
| P9 | PAT-025, PAT-026, INT-PAT-005 |

## By module layer

| Layer | Issues |
|---|---|
| `domain` | PAT-002, PAT-003, PAT-004 |
| `application` | PAT-006, PAT-007, PAT-008, PAT-009 |
| `api` | PAT-005, PAT-010, PAT-017, PAT-018 |
| `infrastructure/persistence` | PAT-011, PAT-012, PAT-013 |
| `infrastructure/auth` | PAT-014, PAT-016, PAT-017, PAT-025 |
| `infrastructure/audit` | PAT-015, PAT-026 |
| `infrastructure/multitenancy` | PAT-016 |
| `infrastructure/metrics` | PAT-019 |
| `infrastructure/logging` | PAT-020 |
| scaffold/cross-cutting | PAT-001 |
| BDD | PAT-021, PAT-022, PAT-023, PAT-024 |
| integration / cross-module | INT-PAT-001, INT-PAT-002, INT-PAT-003, INT-PAT-004, INT-PAT-005, INT-PAT-006 |
