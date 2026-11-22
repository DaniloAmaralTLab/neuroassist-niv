# Issues Map -- ACS (Caregivers and Access)

> Module: **ACS** · Service: `acs-service` · Stack: Java 21 / Spring Boot · Multi-tenant (schema-per-tenant)
> Generated: 2026-11-19 by `/be-architect-backlog neuroassist-niv ACS`

## Functional issues (ACS-001..ACS-026)

| Issue | Title | Layer | Priority | Status |
|---|---|---|---|---|
| ACS-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | P1 | INTACT | BE |
| ACS-002 | Domain model — Caregiver, PatientSession, Tenant, JwtBlacklist aggregates (pure POJOs) | P1 | INTACT | BE |
| ACS-003 | Domain ports — 7 outbound port interfaces | P1 | INTACT | BE |
| ACS-004 | API layer — 5 controllers with base path /acs, @PreAuthorize from RoleAuthorityPolicy (INV-7) | P1 | INTACT | BE |
| ACS-005 | RoleAuthorityPolicy (single source) + DTOs + ProblemDetail error model | P1 | INTACT | BE |
| ACS-006 | AuthService — authenticate (login → tenant resolution INV-6 → JWT issuance) | P2 | INTACT | BE |
| ACS-007 | AuthService — introspect (blacklist-aware) + JWKS endpoint service | P2 | INTACT | BE |
| ACS-008 | PatientSessionService — provision (anchor PatientSessionProvisioned, INV-2, INV-3) | P2 | INTACT | BE |
| ACS-009 | PatientSessionService — revoke (immediate blacklist INV-4, retry fallback for audit) | P2 | INTACT | BE |
| ACS-010 | CaregiverService — register (INV-6) + deactivate (soft) | P2 | INTACT | BE |
| ACS-011 | PatientLinkService — link (idempotent 409) + unlink + listLinks | P2 | INTACT | BE |
| ACS-012 | TenantService — onboard (platform-ops only INV-5) | P2 | INTACT | BE |
| ACS-013 | JPA entities — 6 entities (global + per-tenant, Persistable<UUID>) | P3 | INTACT | BE |
| ACS-014 | Spring Data JPA repositories + repository adapters (findById-before-save) | P3 | INTACT | BE |
| ACS-015 | Flyway migrations — V0010__acs_global_init.sql + V0011__acs_tenant_init.sql | P3 | INTACT | BE |
| ACS-016 | HistClient Feign client + HistAuditPortAdapter (timeout 2s, circuit breaker) | P4 | INTACT | BE |
| ACS-017 | SecurityConfig — @EnableMethodSecurity + JwtGrantedAuthoritiesConverter + TenantContextFilter | P5 | INTACT | BE |
| ACS-018 | TokenIssuer adapter — JWT minting (caregiver + session, no expiry for sessions INV-3) | P5 | INTACT | BE |
| ACS-019 | TokenBlacklist adapter + BlacklistCheckFilter + CorrelationIdFilter (no duplicate interceptor) | P5 | INTACT | BE |
| ACS-020 | GlobalExceptionHandler — ResponseEntity<ProblemDetail> + AccessDeniedException re-throw | P7 | INTACT | BE |
| ACS-021 | Actuator + custom health indicators with @ConditionalOnProperty | P7 | INTACT | BE |
| ACS-022 | MDC correlation + structured logging (CorrelationIdFilter only) | P7 | INTACT | BE |
| ACS-023 | BDD scaffold — CucumberSpringContext + CucumberIT + AcsStepDefs (46 scenarios) | P8 | INTACT | BE |
| ACS-024 | Async retry queue for access-ending HIST audit failures (SEC-001) | P9 | INTACT | BE |
| ACS-025 | ArchUnit tests RULE-01..08 hexagonal enforcement | P9 | INTACT | BE |
| ACS-026 | Extend durable audit retry to CaregiverAuthenticated + PatientUnlinked (HIST ADR-005) | P9 | INTACT | BE |

## Integration issues (INT-ACS-001..INT-ACS-006)

| Issue | Title | Layer | Priority | Status |
|---|---|---|---|---|
| INT-ACS-001 | ACS → HIST audit integration (Feign, envelope contract, resilience policy) | P4 | INTACT | BE |
| INT-ACS-002 | Resource server token validation (JWKS provider + /acs/auth/introspect contract) | P5 | INTACT | BE |
| INT-ACS-003 | MIG schema provisioning trigger (TenantService.onboard → t_{tenantId}) | P4 | INTACT | BE |
| INT-ACS-004 | Cross-module identity references (PAT patient_id, EDGE device_id by-id-only) | P4 | INTACT | BE |
| INT-ACS-005 | GWY routing + X-Correlation-Id propagation (ACS behind gateway, /acs base path) | P1 | INTACT | BE |
| INT-ACS-006 | HIST audit: base URL + /hist path + hist.audit.record token | P4 | INTACT | BE |

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (api surface) | ACS-004, ACS-005, ACS-006, ACS-007, ACS-008, ACS-009, ACS-010, ACS-011, ACS-012, ACS-020, INT-ACS-005 |
| SPEC-02 (patient session orchestration) | ACS-008, ACS-009, ACS-003, INT-ACS-002, INT-ACS-004 |
| SPEC-03 (caregiver and links) | ACS-010, ACS-011 |
| SPEC-04 (data model + migrations) | ACS-002, ACS-013, ACS-014, ACS-015 |
| SPEC-05 (idempotency + concurrency) | ACS-009, ACS-011 |
| SPEC-06 (security) | ACS-005, ACS-006, ACS-017, ACS-018, ACS-019, INT-ACS-002 |
| SPEC-07 (observability) | ACS-021, ACS-022 |
| SPEC-08 (BDD) | ACS-023 |
| SPEC-09 (messaging) | ACS-024, ACS-026 (HIST ADR-005 durable retry) |
| SPEC-10 (integrations) | ACS-016, ACS-026, INT-ACS-001, INT-ACS-003, INT-ACS-004, INT-ACS-006 |

## By module layer

| Layer | Issues |
|---|---|
| `api/` (controllers, DTOs, exception) | ACS-004, ACS-005, ACS-020 |
| `application/` (services, ports) | ACS-003, ACS-006, ACS-007, ACS-008, ACS-009, ACS-010, ACS-011, ACS-012 |
| `domain/` (models, enums) | ACS-002 |
| `infrastructure/` (JPA, Feign, security, config) | ACS-013, ACS-014, ACS-015, ACS-016, ACS-017, ACS-018, ACS-019, ACS-021, ACS-022, ACS-024, ACS-026 |
| `test/` (BDD, ArchUnit) | ACS-023, ACS-025 |
| `build/` | ACS-001 |
