# Plan -- ACS (Caregivers and Access)

> Module: **ACS** · Service: `acs-service` · Stack: Java 21 / Spring Boot · Multi-tenant (schema-per-tenant)
> Generated: 2026-11-19 by `/be-architect-backlog neuroassist-niv ACS`

---

## Status das prioridades

| Priority | Title | Status |
|---|---|---|
| P1 | Scaffold + hexagonal foundation | pendente |
| P2 | Domain orchestration (all use cases) | pendente |
| P3 | Persistence + Flyway migrations | pendente |
| P4 | External integrations (HIST, MIG, PAT, EDGE) | pendente |
| P5 | Security + multi-tenancy | pendente |
| P7 | Observability + health | pendente |
| P8 | BDD end-to-end | pendente |
| P9 | Hardening + ArchUnit | pendente |

---

## 0. Executive summary

### Role of the service

ACS (`acs-service`, port 8081) is the **trust anchor** of the NeuroAssist NIV platform.
It is the only service that issues and validates JWTs. All other services (resource
servers) delegate token validation to ACS via JWKS or introspect. It manages:

- Caregiver identity (registration, deactivation, login)
- Patient–caregiver link management
- Patient session lifecycle (provision → revoke) with non-expiring JWTs
- Tenant onboarding (platform-ops only)
- JWT blacklist for revocation

### MVP scope

One platform instance. All caregivers and tenants in the same PostgreSQL cluster.
Schema-per-tenant isolation: `neuroassist_global` (tenants + caregiver_identity_lookup +
jwt_blacklist) + `t_<tenantId>` per tenant (caregiver, caregiver_patient_link,
patient_session). No broker. Audit events sent synchronously to HIST
(access-ending events protected by async retry queue — SEC-001).

### Initial diagnostics

Gaps from architectural review:

- Revocation correctness: blacklist write and state change must be atomic (INV-4); async
  HIST audit is secondary and must not block state change (SEC-001).
- Authority string consistency: `RoleAuthorityPolicy` is the single source of truth —
  controllers, BDD step definitions and all tests must import from it (INV-7).
- Non-expiring patient session tokens: `exp` claim deliberately absent; revocation is
  the only invalidation path (ADR-003).
- TenantContextFilter placement: must be inside `SecurityFilterChain` (not a plain
  `OncePerRequestFilter`) to run after JWT extraction by the resource server filter.

---

## 1. General strategy

### Macro objective

Deliver a working, fully-tested `acs-service` that can issue and validate tokens,
manage caregiver and patient-session lifecycle, and audit all domain actions to HIST —
ready for integration with GWY, PAT and EDGE in subsequent module phases.

### Priority order

| P | Title | Rationale |
|---|---|---|
| P1 | Scaffold + hexagonal foundation | Build succeeds; layer structure enforced before any business code |
| P2 | Domain orchestration | Golden paths working in memory; use cases complete before persistence |
| P3 | Persistence + migrations | JPA entities + Flyway; all use cases now backed by real PostgreSQL |
| P4 | External integrations | HIST audit; MIG schema trigger; PAT/EDGE identity references |
| P5 | Security + multi-tenancy | SecurityConfig + JWT RS + TenantContextFilter + blacklist filter |
| P7 | Observability + health | Actuator indicators + structured logging; `P6 skipped — messaging disabled` |
| P8 | BDD scaffold | 46 Cucumber scenarios wired; pending is the goal (P8 is structural) |
| P9 | Hardening | ArchUnit RULE-01..08; async retry queue resilience |

---

## 2. Plan by priority

---

### Priority P1 -- Scaffold + hexagonal foundation

**Status:** pendente

#### Objective

Establish the project skeleton: build script, hexagonal layer structure, controllers
(stub), DTOs, `RoleAuthorityPolicy`, `ProblemDetailFactory`. Service must compile and
all unit tests must pass with zero business logic implemented.

#### Issues

- ACS-001 Hexagonal scaffold + build.gradle.kts with integrationTest split
- ACS-002 Domain model — pure POJOs, enums
- ACS-003 7 outbound port interfaces
- ACS-004 5 controllers + base path /acs + @PreAuthorize
- ACS-005 RoleAuthorityPolicy + DTOs + ProblemDetailFactory
- INT-ACS-005 GWY routing + X-Correlation-Id propagation

#### Specs covered

- SPEC-01 (api surface), SPEC-04 (data model shape), SPEC-06 (security authorities)

#### Execution sequence

1. ACS-001 — scaffold with `integrationTest` source set (D-636 pattern)
2. ACS-002 — domain model (pure POJOs, no JPA)
3. ACS-003 — outbound port interfaces (no tenantId param — schema-per-tenant)
4. ACS-004 — controllers with @PreAuthorize referencing RoleAuthorityPolicy constants
5. ACS-005 — RoleAuthorityPolicy (single source) + DTOs + error model
6. INT-ACS-005 — verify /acs base path consistency

#### Acceptance criteria

- `./gradlew :acs-service:compileJava` exits 0
- `./gradlew :acs-service:test` exits 0
- Grep for `@RequestMapping.*acs-service` → zero hits in `api/`

#### Risks

- Incorrect `@PreAuthorize` authority strings → ACS-005 defines the policy before ACS-004 controllers import it

#### Instructions for implementer

Create packages in order: `domain/` → `application/port/out/` → `api/` (controllers + DTOs).
`RoleAuthorityPolicy` is a final class with public static String constants in `api/`.
Use `ResponseEntity<ProblemDetail>` for all controller exception handlers from day 1.

---

### Priority P2 -- Domain orchestration

**Status:** pendente

#### Objective

All five application services implemented with full use-case logic (authenticated against
in-memory/mock adapters). `PatientSessionService.provision` is the anchor — it fires the
`PatientSessionProvisioned` audit event (via `HistAuditPort` mock).

#### Issues

- ACS-006 AuthService.authenticate
- ACS-007 AuthService introspect + JWKS service
- ACS-008 PatientSessionService.provision (anchor, INV-2, INV-3)
- ACS-009 PatientSessionService.revoke (INV-4, blacklist in same tx)
- ACS-010 CaregiverService register + deactivate
- ACS-011 PatientLinkService link + unlink + listLinks
- ACS-012 TenantService.onboard (platform-ops only, INV-5)

#### Specs covered

- SPEC-01, SPEC-02 (session lifecycle), SPEC-03 (caregiver + links), SPEC-05 (idempotency)

#### Execution sequence

1. ACS-006 — authenticate (tenant resolution INV-6, JWT issuance via mock TokenIssuerPort)
2. ACS-008 — provision (anchor; INV-2, INV-3; audit to mock HistAuditPort)
3. ACS-009 — revoke (INV-4; blacklist in same transaction; retry queue flag)
4. ACS-010 — register + deactivate
5. ACS-011 — link + unlink + listLinks (409 on duplicate)
6. ACS-012 — onboard (INV-5 platform-ops only; trigger mock MigSchemaProvisionPort)
7. ACS-007 — introspect (blacklist-aware) + JWKS service (key serving)

#### Acceptance criteria

- `AuthServiceTest.authenticate_returns_jwt_for_valid_caregiver` passes
- `PatientSessionServiceTest.provision_fires_PatientSessionProvisioned_audit` passes
- `PatientSessionServiceTest.revoke_blacklists_jti_in_same_transaction` passes
- `./gradlew :acs-service:test` exits 0

#### Risks

- INV-4 (revoke + blacklist atomic): transaction boundary must span both the session update and blacklist insert; use `@Transactional` in application service, not in adapter

#### Instructions for implementer

All `@Transactional` goes in application services, never in infrastructure adapters (ArchUnit RULE-05).
Mock adapters (`InMemoryPatientSessionRepository`, `InMemoryJwtBlacklist`, etc.) go in `src/test/java/`
and implement the outbound ports. No Spring context is needed for P2 unit tests.

---

### Priority P3 -- Persistence + Flyway migrations

**Status:** pendente

#### Objective

Replace in-memory mock adapters with real JPA entities and Spring Data repositories.
Two Flyway migrations create the global and per-tenant schemas. All P2 use cases now
backed by real PostgreSQL (tested with Testcontainers or docker compose stack).

#### Issues

- ACS-013 6 JPA entities (global + per-tenant)
- ACS-014 6 repository adapters (findById-before-save pattern)
- ACS-015 Flyway V0010 (global) + V0011 (per-tenant template)

#### Specs covered

- SPEC-04 (data model), data-model.md (§5 migration plan)

#### Execution sequence

1. ACS-015 — Flyway migrations (run against local docker compose stack from setup-local.md)
2. ACS-013 — JPA entities with `Persistable<UUID>` (findById-before-save mandatory — Hibernate bug)
3. ACS-014 — repository adapters; each adapter: `findById(id).isPresent() ? repo.save(...) : ...`

#### Acceptance criteria

- `V0010__acs_global_init.sql` and `V0011__acs_tenant_init.sql` apply cleanly on a fresh schema
- `./gradlew :acs-service:test` exits 0 (all P2 unit tests pass with real entities)
- No cross-schema FK in any `CREATE TABLE` statement (data-model §2.4)

#### Risks

- Hibernate `SimpleJpaRepository.save()` calls `SELECT` before `INSERT` for `Persistable<UUID>` → ACS-014 `findById-before-save` pattern is mandatory

#### Instructions for implementer

JPA entities MUST implement `Persistable<UUID>` and override `isNew()` (return `true` when id was just generated).
Schema-per-tenant: `@Table(schema = "...")` is set dynamically at runtime by `TenantSchemaResolver`.
Global entities (`Tenant`, `CaregiverIdentityLookup`, `JwtBlacklist`) always use schema `neuroassist_global`.

---

### Priority P4 -- External integrations

**Status:** pendente

#### Objective

Wire all external service dependencies: HIST audit (Feign + resilience), MIG schema
provisioning trigger, PAT/EDGE existence checks (by-id-only, INV-2).

#### Issues

- ACS-016 HistClient Feign + HistAuditPortAdapter + circuit breaker + retry queue flag
- INT-ACS-001 ACS → HIST audit integration (envelope contract + WireMock IT)
- INT-ACS-003 MIG schema provisioning trigger
- INT-ACS-004 Cross-module identity references (PAT, EDGE)

#### Specs covered

- integration-contracts.md (§2.1 ACS→HIST, §2.3 ACS→MIG, §2.4 by-id-only)
- event-contracts.md (§1.1 audit envelope, §1.2 failure policy)

#### Execution sequence

1. ACS-016 — HistClient + HistAuditPortAdapter (Feign, Eureka, circuit breaker for grants, retry queue flag for access-ending)
2. INT-ACS-001 — WireMock integration test; validate envelope shape against event-contracts.md §1.1
3. INT-ACS-003 — MigSchemaProvisionPort + adapter; validate rollback on MIG failure
4. INT-ACS-004 — PatientExistsPort + DeviceExistsPort + mock adapters (@ConditionalOnProperty)

#### Acceptance criteria

- `HistClientIT` (WireMock): POST /audit receives correct envelope; 503 for grant → rollback; 503 for access-ending → state committed + enqueued
- `TenantServiceTest`: MIG failure → tenant row NOT saved
- `PatientSessionServiceTest`: patientId not found in tenant → 404 (INV-2)
- `./gradlew :acs-service:integrationTest` exits 0

#### Risks

- Resilience split (grant vs access-ending) is in event-contracts.md §1.2; must be tested explicitly in INT-ACS-001

#### Instructions for implementer

`HistAuditPortAdapter`: circuit breaker is ON for grant actions (PatientSessionProvisioned,
PatientLinked, etc.) — an audit outage during a grant blocks the action (consistent failure).
For access-ending (Revoked, Deactivated): state committed first, audit enqueued in `AuditRetryQueue`.

---

### Priority P5 -- Security + multi-tenancy

**Status:** pendente

#### Objective

Full Spring Security configuration: JWT resource server (JWKS-based), `@EnableMethodSecurity`,
`JwtGrantedAuthoritiesConverter` (reads `permissions` claim — not `scope`), `TenantContextFilter`
inside `SecurityFilterChain`, `BlacklistCheckFilter`, `CorrelationIdFilter`.

#### Issues

- ACS-017 SecurityConfig
- ACS-018 TokenIssuer adapter (JWT minting, no-expiry session tokens)
- ACS-019 TokenBlacklist adapter + BlacklistCheckFilter + CorrelationIdFilter
- INT-ACS-002 Resource server token validation (JWKS round-trip + introspect)

#### Specs covered

- SPEC-06 (security authorities, role→authority mapping), ADR-003 (non-expiring sessions)

#### Execution sequence

1. ACS-018 — TokenIssuer (JWK signing key, `iat` present, `exp` absent for sessions — INV-3)
2. ACS-019 — JwtBlacklist adapter + BlacklistCheckFilter + CorrelationIdFilter (servlet-only)
3. ACS-017 — SecurityConfig (JwtGrantedAuthoritiesConverter reads `permissions` claim; TenantContextFilter inside chain)
4. INT-ACS-002 — round-trip: mint token → validate via JWKS; introspect blacklisted token → `active=false`

#### Acceptance criteria

- `JwtGrantedAuthoritiesConverterTest`: token with `permissions: ["acs.caregiver.create"]` → authority `acs.caregiver.create` (no `SCOPE_` prefix)
- `TenantContextFilterTest`: filter runs AFTER JWT extraction by resource server; `TenantContextHolder.get()` returns tenant from token
- `BlacklistCheckFilterTest`: blacklisted `jti` → 401
- `./gradlew :acs-service:test` exits 0

#### Risks

- `JwtGrantedAuthoritiesConverter` must read `permissions` claim, not `scp`/`scope` → test explicitly with a token that has only `permissions` (no `scope`)

#### Instructions for implementer

`TenantContextFilter` must be added with `http.addFilterAfter(tenantContextFilter, BearerTokenAuthenticationFilter.class)`.
It MUST NOT be declared as a standalone `@Component`/`@Bean` with `@Order` — that would
register it twice (once in SecurityFilterChain and once in the global filter chain).
Declare the bean without `@Component`, inject it, and add it via `addFilterAfter`.

---

### Priority P7 -- Observability + health

**Status:** pendente

> P6 is skipped: `messaging.enabled = false` in project-context.json.

#### Objective

Actuator + custom health indicators + structured JSON logging with `correlationId`/`tenantId`
in every log line. Health indicators guarded by `@ConditionalOnProperty` to avoid test failures.

#### Issues

- ACS-020 GlobalExceptionHandler (ResponseEntity<ProblemDetail> + AccessDeniedException re-throw)
- ACS-021 Actuator + custom health indicators with @ConditionalOnProperty
- ACS-022 MDC correlation + structured logging (CorrelationIdFilter only)

#### Specs covered

- SPEC-07 (observability, structured logging, health)

#### Execution sequence

1. ACS-020 — GlobalExceptionHandler (all handlers return `ResponseEntity<ProblemDetail>`)
2. ACS-021 — Actuator; DatabaseHealthIndicator + HistHealthIndicator with @ConditionalOnProperty; `application-test.yml` disables both
3. ACS-022 — `logback-spring.xml` JSON layout; MDC cleanup in CorrelationIdFilter finally block

#### Acceptance criteria

- `GlobalExceptionHandlerTest`: 403 from @PreAuthorize → 403 (not 500); 404 for entity not found → 404
- `./gradlew :acs-service:test` with no docker stack running → Spring context loads (health indicators disabled)
- Log line contains `correlationId`, `tenantId`, `service: acs-service`

---

### Priority P8 -- BDD scaffold

**Status:** pendente

#### Objective

Wire 46 Cucumber scenarios from SPEC-08 to step definition classes. All scenarios
run as PENDING (not FAILED). `CucumberIT` is in the `integrationTest` source set.

#### Issues

- ACS-023 BDD scaffold (CucumberSpringContext + CucumberIT + step stubs)

#### Specs covered

- SPEC-08 (BDD scenarios)

#### Execution sequence

1. ACS-023 — CucumberSpringContext + CucumberIT + AcsStepDefs + SharedSteps

#### Acceptance criteria

- `./gradlew :acs-service:test --dry-run` reports all 46 scenarios as PENDING
- No step stub has `// TODO:` comment (only `throw new PendingException()`)
- `SharedSteps.buildCaregiverToken(CAREGIVER)` → `RoleAuthorityPolicy.PATIENT_LINK_LINK` (no literal string)

---

### Priority P9 -- Hardening

**Status:** pendente

#### Objective

Async retry queue for access-ending audit failures (SEC-001). ArchUnit RULE-01..08
to enforce hexagonal architecture at build time.

#### Issues

- ACS-024 Async retry queue for HIST access-ending failures
- ACS-025 ArchUnit RULE-01..08 hexagonal enforcement

#### Specs covered

- event-contracts.md §1.2 (failure policy), ADR-001-hexagonal-architecture.md (RULE-01..08)

#### Execution sequence

1. ACS-024 — `AuditRetryQueue` + `AuditRetryScheduler` (@Scheduled, 30s)
2. ACS-025 — `HexagonalArchitectureTest` with 8 named rules; must pass on existing code

#### Acceptance criteria

- `AuditRetryQueueTest`: enqueue + drain on HIST 200; re-enqueue on HIST 503
- `HexagonalArchitectureTest`: all 8 rules pass; adding a Spring import to domain → compile-time rule violation
- `./gradlew :acs-service:test` exits 0

---

## 3. External dependencies

| Service | Direction | Contract |
|---|---|---|
| HIST | ACS → HIST | Feign POST /audit, envelope per event-contracts.md §1.1 |
| MIG | ACS → MIG | Schema provisioning trigger on tenant onboard |
| PAT | ACS → PAT | Existence check by patientId + tenantId |
| EDGE | ACS → EDGE | Existence check by deviceId + tenantId |
| GWY | GWY → ACS | Path=/acs/**, lb://acs-service, X-Correlation-Id injection |
| All resource servers | Resource servers → ACS | JWKS GET /acs/.well-known/jwks.json + POST /acs/auth/introspect |

---

## 4. Architectural constraints (Java/Spring Boot)

- ArchUnit RULE-01: `domain.**` must not import from `org.springframework` or `jakarta.persistence`
- ArchUnit RULE-02: domain entities must have no JPA annotations
- ArchUnit RULE-03: `api/**` and `infrastructure/**` must not be depended on by `domain/**`
- ArchUnit RULE-04: `application/**` must not import `infrastructure/**` (ports only)
- ArchUnit RULE-05: `@Transactional` only in `application.service.**`
- ArchUnit RULE-06: `api/**` must not access `infrastructure/**` directly
- ArchUnit RULE-07: all `@PreAuthorize` in `api/**` must reference `RoleAuthorityPolicy`
- ArchUnit RULE-08: `application.port.out.**` must only contain interfaces
- Schema-per-tenant: no tenantId parameter in outbound port method signatures (D-534)
- Non-expiring patient session JWT (ADR-003): `exp` claim absent; `iat` present
- Flyway runs in MIG service, not in `acs-service` directly

---

## 5. References

| Document | Path |
|---|---|
| ADR-001 Hexagonal architecture | `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md` |
| API contract | `docs/architecture/backend/services/acs-service/contracts/api-contract.md` |
| Data model | `docs/architecture/backend/services/acs-service/contracts/data-model.md` |
| Event contracts | `docs/architecture/backend/services/acs-service/contracts/event-contracts.md` |
| Integration contracts | `docs/architecture/backend/services/acs-service/contracts/integration-contracts.md` |
| SPEC-01 API surface | `docs/architecture/backend/services/acs-service/spec/backend/SPEC-01-api-surface.md` |
| SPEC-02 Session lifecycle | `docs/architecture/backend/services/acs-service/spec/backend/SPEC-02-session-lifecycle.md` |
| SPEC-04 Data model | `docs/architecture/backend/services/acs-service/spec/backend/SPEC-04-data-model-migrations.md` |
| SPEC-06 Security | `docs/architecture/backend/services/acs-service/spec/backend/SPEC-06-security.md` |
| SPEC-07 Observability | `docs/architecture/backend/services/acs-service/spec/backend/SPEC-07-observability.md` |
| SPEC-08 BDD | `docs/architecture/backend/services/acs-service/spec/backend/SPEC-08-bdd-scenarios.md` |
| Issues map | `docs/architecture/backend/issues/issues_map-ACS.md` |
| Generator config | `docs/architecture/backend/services/acs-service/generator-config.yml` |
| Setup local | `docs/architecture/backend/services/acs-service/setup-local.md` |
