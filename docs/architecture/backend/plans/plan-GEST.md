# Plan -- GEST (Gesture Detection Edge)

> Service: `gest-service` · Port: 8088 · Stack: Java 21 / Spring Boot · Global schema: `neuroassist_global`
> Module: **GEST — Gesture Detection (Edge)** · Project: NeuroAssist NIV

---

## Status das prioridades

- P1 -- pendente
- P2 -- pendente
- P3 -- pendente
- P4 -- pendente
- P5 -- pendente
- P7 -- pendente
- P8 -- pendente
- P9 -- pendente

---

## 0. Leitura executiva

### Papel do serviço (extraído de 01-architectural-vision.md)

`gest-service` is a thin, global, read-mostly advisory registry. It owns two aggregates:
`EngineVersion` (catalog of detection-engine/model releases) and `EngineCapability` (the support
assertion `(engineVersion, gestureTypeCode) → supportStatus`). It serves no detection runtime,
no event generation, and no per-tenant data. Its primary consumer is the patient station
(`gest-ui`, identified by its `edge.device` token), which calls `support-check` at catalog-load
to gate which commands are "detectable" before showing them to the patient.

### MVP scope (extraído de 01)

The MVP delivers the full read surface (`GET /gest/engines`, `GET /gest/capabilities`,
`POST /gest/capabilities/support-check`), the two admin write operations (register/deprecate engine,
declare/retire capability), HIST audit integration, PAT vocabulary validation on declare (fail-closed),
ACS JWKS token validation, and the three BDD feature files that gate spec-completeness.

### Diagnóstico inicial (gaps mapeados em 06)

- No existing service skeleton. Gradle module must be created from scratch (GEST-001).
- Flyway V0050–V0059 range reserved; migrations must be authored and routed through MIG module.
- Three INT items are open: `compoundWindowMs` on PAT (INT-GEST-PAT-001), "not yet detectable" on
  PAT/DASH (INT-GEST-PAT-002), and `edge.device` token authority provisioning on ACS/EDGE
  (INT-GEST-ACS-001). None block GEST backend implementation.
- No messaging (stack.messaging.enabled = false). All domain "events" are synchronous HIST audit
  records; no P6 priority in this plan.

---

## 1. Estratégia geral

### Objetivo macro

Deliver a spec-complete `gest-service` that passes all three BDD feature files, satisfies all
SPEC-01–SPEC-10 acceptance criteria, and allows the patient station to self-gate detectable commands
at boot using its `edge.device` token without a patient-session dependency.

### Ordem das prioridades

| P | Título | Motivo |
|---|---|---|
| P1 | Scaffold + Controllers + DTOs | Foundation; all subsequent priorities depend on it |
| P2 | Domain aggregates + Application services | Golden path (EngineCapabilityDeclared anchor); unblocks persistence and BDD |
| P3 | Persistence + Migrations | Wires service layer to real DB; required for BDD and HIST audit integration |
| P4 | External Feign integrations | PAT vocabulary validation and HIST audit are P2 service dependencies; adapters come after domain |
| P5 | Security + authority guard | JWKS + @PreAuthorize; required before BDD scenarios that test 403 |
| P7 | Observability + health | Actuator readiness + MDC propagation; production readiness |
| P8 | BDD end-to-end | Three feature files gate spec-completeness per SPEC-08 |
| P9 | Hardening | ETag/304 caching + Feign resilience; not on critical path |

---

## 2. Plano por prioridade

### Prioridade 1 -- Scaffold + Controllers + DTOs

**Status:** pendente

#### Objetivo / Resultado esperado
Running Spring Boot application on port 8088 with all five endpoints returning correct status codes
and response shapes. DTOs compile; controllers have `@PreAuthorize` stubs.

#### Issues vinculadas
- GEST-001 (Gradle scaffold + entry point)
- GEST-002 (EngineController reads)
- GEST-003 (CapabilityController reads)
- GEST-004 (SupportCheckController)
- GEST-005 (DTOs + mappers)

#### Specs cobertas
- SPEC-01 (API surface)
- contracts/api-contract.md §2–3, §5

#### Sequência de execução
- Fase 1: GEST-001 — scaffold (no deps)
- Fase 2: GEST-006, GEST-007 (domain aggregates — required by DTOs and controllers; executed here before P2 issues formally start)
- Fase 3: GEST-005 (DTOs depend on domain aggregates)
- Fase 4: GEST-002, GEST-003, GEST-004 (controllers depend on DTOs)

#### Critérios de aceite
- `./gradlew :gest-service:compileJava` exits 0
- All five endpoints return at least `401` (no security config yet) or expected shapes with mock data

#### Riscos
- Gradle submodule configuration may need adjustment to inherit the global BOM and Feign dependencies
- Domain aggregate creation may need to wait for SPEC-04 DDL review; use the `contracts/data-model.md` as the authoritative source

#### Instrução para implementador
Start with GEST-001. Add `gest-service` to `settings.gradle.kts` and wire `build.gradle.kts` from the
project BOM. Create domain aggregates (GEST-006, GEST-007) before writing DTOs to avoid circular
dependencies. Use Spring MVC `@RestController` with `@RequestMapping("/gest")` base path.

---

### Prioridade 2 -- Domain aggregates + Application services

**Status:** pendente

#### Objetivo / Resultado esperado
Complete domain logic for all four write operations (`register`, `deprecate`, `declare`, `retire`) and
the `checkSupport` read. All service tests pass with mocked ports.

#### Issues vinculadas
- GEST-006 (EngineVersion aggregate + EngineStatus)
- GEST-007 (EngineCapability aggregate + SupportStatus)
- GEST-008 (EngineVersionService.register)
- GEST-009 (EngineVersionService.deprecate)
- GEST-010 (CapabilityService.declare — anchor event)
- GEST-011 (CapabilityService.retire + checkSupport + ETagService)

#### Specs cobertas
- SPEC-02 (capability registry orchestration)
- SPEC-03 (support-check gate, INV-GEST-7)
- SPEC-05 (idempotency)
- contracts/event-contracts.md §1

#### Sequência de execução
- Fase 1: GEST-006 → GEST-007 (domain aggregates, no deps between P1 scaffold)
- Fase 2: GEST-008 → GEST-009 (EngineVersionService, sequential)
- Fase 3: GEST-010 (CapabilityService declare — anchor; depends on GEST-015/017 interfaces from P4,
  but interfaces can be authored as domain stubs at this point)
- Fase 4: GEST-011 (retire + checkSupport + ETagService)

#### Critérios de aceite
- `./gradlew :gest-service:test` exits 0 for all service-layer unit tests (mocked ports)
- `ETagService` produces stable hashes
- Idempotency: deprecate-already-deprecated, retire-already-unsupported → no duplicate audit

#### Riscos
- `CapabilityService.declare()` depends on `GestureVocabularyPort` and `HistAuditPort` interfaces; these must be authored as stubs in domain.port even if the Feign adapters are not yet wired (P4)
- Upsert semantics for `(engineVersionId, gestureTypeCode)` must be tested with both insert and update paths

#### Instrução para implementador
Implement domain aggregates first; then implement application services using `Mockito` mocks for all
ports in unit tests. `@Transactional` goes on service methods only (not controllers, per ADR-001-hexagonal-architecture.md).
Port interfaces (`GestureVocabularyPort`, `HistAuditPort`, `AcsIntrospectionPort`) may be empty stubs
until P4.

---

### Prioridade 3 -- Persistence + Migrations

**Status:** pendente

#### Objetivo / Resultado esperado
Two Flyway migration scripts that create the GEST global tables. Two JPA adapters that implement the
repository ports. Integration tests with TestContainers (or H2 with PostgreSQL dialect) pass.

#### Issues vinculadas
- GEST-012 (Flyway V0050 + V0051)
- GEST-013 (EngineVersionJpaEntity + RepositoryAdapter)
- GEST-014 (EngineCapabilityJpaEntity + RepositoryAdapter)
- INT-GEST-MIG-001 (MIG to include GEST range)

#### Specs cobertas
- SPEC-04 (data model + migrations)
- SPEC-05 (idempotency — upsert via unique constraint)
- contracts/data-model.md §2

#### Sequência de execução
- Fase 1: GEST-012 — author migration SQL (no code deps)
- Fase 2: GEST-013 (EngineVersion adapter; depends on GEST-012 for schema)
- Fase 3: GEST-014 (EngineCapability adapter; depends on GEST-013 for FK entity)
- Fase 4: INT-GEST-MIG-001 (notify MIG team to register GEST scripts)

#### Critérios de aceite
- Migrations apply cleanly to `neuroassist_global` via MIG
- `findByVersionIdAndCode` enables `CapabilityService.declare()` upsert logic
- No `delete` or `remove` method exists on `EngineCapabilityRepositoryAdapter` (INV-GEST-6)

#### Riscos
- Schema routing (`SET search_path TO neuroassist_global;`) must be verified against MIG's Flyway config
- `ON DELETE RESTRICT` on the FK ensures no engine version with capabilities can be deleted; test this explicitly

#### Instrução para implementador
Use `@Table(schema = "neuroassist_global", name = "engine_version")` on JPA entities. For the upsert
in `EngineCapabilityRepositoryAdapter`, do not use JPA `save()` naively — call
`findByVersionIdAndCode()` first (insert vs update detection). No `@Transactional` in the adapter
(it inherits from the application service).

---

### Prioridade 4 -- External Feign integrations

**Status:** pendente

#### Objetivo / Resultado esperado
Three Feign adapters wiring the domain ports to their real HTTP targets. WireMock tests cover happy
path, absent-code (PAT), and 5xx (PAT/HIST). INT items INT-GEST-PAT-001/002 are issued to PAT/DASH.

#### Issues vinculadas
- GEST-015 (GestureVocabularyPort + PatGestureTypeClient — fail-closed)
- GEST-016 (AcsIntrospectionPort + AcsClient)
- GEST-017 (HistAuditPort + HistAuditClient — fail-closed)
- INT-GEST-PAT-001 (handed to PAT — compoundWindowMs)
- INT-GEST-PAT-002 (handed to PAT/DASH — not-yet-detectable marker)

#### Specs cobertas
- SPEC-03 (vocabulary validation, fail-closed)
- SPEC-10 (integrations §3–5)
- contracts/hub-integration.md §1–3

#### Sequência de execução
- Fase 1: GEST-015, GEST-016, GEST-017 (independent; can run in parallel)
- Fase 2: Wire adapters into Spring context (replace stubs); re-run all service-layer tests with mock HTTP

#### Critérios de aceite
- PAT down on declare path → `503 pat-vocabulary-unavailable` with `Retry-After`
- HIST down on write path → write rolls back, `503 audit-unavailable`
- Read paths (`GET`, `support-check`) do NOT call PAT or ACS introspection

#### Riscos
- Feign error decoder must map `FeignException` → domain exceptions correctly; test with WireMock
- `AcsClient` introspection is called only on write paths — adding a guard to skip on reads is critical (see GEST-016 AC-4)

#### Instrução para implementador
Use `@FeignClient(name="...", url="${...}")` with explicit `url_prop` from `application.yml`. Write
a custom Feign `ErrorDecoder` per client. PAT and HIST adapters must NOT be called on read paths;
verify this in WireMock tests by asserting no PAT stub was matched.

---

### Prioridade 5 -- Security + authority guard

**Status:** pendente

#### Objetivo / Resultado esperado
GEST configured as an OAuth2 resource server. All six authorities declared as constants.
`@PreAuthorize` on every endpoint. Read-only token on write path → `403`. INT-GEST-ACS-001 issued
to ACS/EDGE.

#### Issues vinculadas
- GEST-018 (SecurityConfig + RoleAuthorityPolicy)
- GEST-019 (@PreAuthorize authority guard)
- INT-GEST-ACS-001 (handed to ACS/EDGE — edge.device token authorities)

#### Specs cobertas
- SPEC-06 (security — resource server, authority catalog)
- contracts/api-contract.md §1

#### Sequência de execução
- Fase 1: GEST-018 (SecurityConfig + constants)
- Fase 2: GEST-019 (add @PreAuthorize to all controllers; depends on GEST-018 and GEST-016 for introspection wiring)

#### Critérios de aceite
- `RoleAuthorityPolicy` has exactly 6 string constants matching the authority catalog in api-contract §1.1
- `AuthorityGuardTest` uses `@WithMockUser` with specific authorities to verify 403 on each write endpoint for read-only actors

#### Riscos
- `edge.device` token without `gest.capability.read` on `support-check` → `403`; this must be tested explicitly (INT-GEST-ACS-001 is the fix, but GEST enforces it)

#### Instrução para implementador
Define `RoleAuthorityPolicy` as a final class with private constructor (utility class pattern). Use
`hasAuthority(T(com.neuroassist.gest.infrastructure.auth.RoleAuthorityPolicy).GEST_ENGINE_CREATE)`
pattern in `@PreAuthorize` to reference the constant at compile time (D-535).

---

### Prioridade 7 -- Observability + health

**Status:** pendente

#### Objetivo / Resultado esperado
Actuator `/health` with DB and ACS-JWKS readiness indicators. `X-Correlation-Id` propagated through
MDC. All 6 custom Micrometer metrics registered and incrementing.

#### Issues vinculadas
- GEST-020 (Actuator health + CorrelationIdFilter)
- GEST-021 (Custom Micrometer metrics)

#### Specs cobertas
- SPEC-07 (observability + health)

#### Sequência de execução
- Fase 1: GEST-020, GEST-021 (independent; can run in parallel)

#### Critérios de aceite
- `/actuator/health` reports UP when DB and ACS JWKS are reachable; DOWN when either is unreachable (PAT/HIST failure does NOT affect readiness)
- Every log line within a request contains `correlationId` in MDC
- 6 metrics exist under `/actuator/metrics`

#### Riscos
- ACS JWKS custom health indicator must use an HTTP HEAD/GET to the JWKS URL, not just check the Spring Security config object; test with WireMock stub

#### Instrução para implementador
Implement `CorrelationIdFilter` as a `OncePerRequestFilter` with priority `Ordered.HIGHEST_PRECEDENCE`.
Inject `MeterRegistry` into service classes to avoid a separate metrics class coupling.

---

### Prioridade 8 -- BDD end-to-end

**Status:** pendente

#### Objetivo / Resultado esperado
All three `.feature` files pass: `engine-capability-registry.feature`, `support-check-detectable-gate.feature`,
`capability-declare-validation.feature`. Gate for spec-completeness (SPEC-08).

#### Issues vinculadas
- GEST-022 (engine-capability-registry BDD)
- GEST-023 (support-check-detectable-gate BDD)
- GEST-024 (capability-declare-validation BDD)

#### Specs cobertas
- SPEC-08 (BDD test scenarios)

#### Sequência de execução
- Fase 1: GEST-022 (most scenarios are integration tests; depends on P3 persistence + P5 security)
- Fase 2: GEST-023, GEST-024 (can run in parallel after GEST-022 step infrastructure is in place)

#### Critérios de aceite
- `./gradlew :gest-service:test` exits 0 running all three feature files
- No scenario is tagged `@Ignore` or `@Pending`

#### Riscos
- Learning pitfall: BDD step definitions for POST endpoints must match the actual service API signature
  (`engineVersion`, `gestureTypeCode`, `supportStatus`, `notes`) — do NOT generate stubs based on the
  feature-file DocString shape if it differs from the service API (see learning context pitfall
  `bdd-scaffold:cucumber-step-defs:raw-report-format-mismatch`)
- `GestureVocabularyPort` must NOT be invoked in support-check scenarios; assert with Mockito `verifyNoInteractions`

#### Instrução para implementador
Use `@SpringBootTest(webEnvironment = RANDOM_PORT)` for BDD scenarios that require the full HTTP stack.
Use WireMock for PAT and HIST. Read `CapabilityService.declare()` signature before authoring step stubs.
Reuse the step vocabulary from SPEC-08 §2 (`Given/When/Then` patterns listed there).

---

### Prioridade 9 -- Hardening

**Status:** pendente

#### Objetivo / Resultado esperado
ETag-based `304` on reads and `support-check`. Feign circuit breaker/retry for PAT/HIST/ACS.
`Retry-After: 30` on all `503` responses. `gest.support_check.cache_hit` counter increments.

#### Issues vinculadas
- GEST-025 (ETag/304 + Feign resilience)

#### Specs cobertas
- SPEC-05 (idempotency)
- SPEC-07 (observability — cache-hit metric)
- contracts/api-contract.md §0.1 (If-None-Match / ETag)

#### Sequência de execução
- Fase 1: GEST-025 (depends on ETagService from GEST-011 and all Feign clients)

#### Critérios de aceite
- `304 Not Modified` returned when `If-None-Match` matches computed `ETag` (no body)
- Feign max 1 retry on transient `5xx`; fail-closed after retry exhaustion
- `Retry-After: 30` present on all `503` responses

#### Riscos
- Feign retry must NOT relax the fail-closed policy for PAT/HIST; retry is for transient network failures only, not for persistent unavailability

---

## 3. Dependências externas

| Dependency | Type | Needed by |
|---|---|---|
| ACS JWKS endpoint (`ACS_JWKS_URI`) | Runtime required | P5 (SecurityConfig) |
| PAT `GET /pat/gesture-types` | Runtime required (declare path only) | P4 (GestureVocabularyPort) |
| HIST `POST /hist/audit-events` | Runtime required (write paths) | P4 (HistAuditPort) |
| MIG Flyway execution (global schema) | Coordinated with MIG module | P3 (GEST-012 + INT-GEST-MIG-001) |
| ACS/EDGE edge.device token authority provisioning | Coordinated with ACS/EDGE | P5 (INT-GEST-ACS-001) |

---

## 4. Restrições arquiteturais

Hexagonal architecture (ADR-001-hexagonal-architecture.md):
- Layer rule: `api` → `application` → `domain` ← `infrastructure`. No cross-layer shortcut.
- `@Transactional` only on `application.service` methods (never on controllers or adapters).
- JPA annotations (`@Entity`, `@Column`, etc.) are confined to `infrastructure.persistence`.
- Domain objects (`EngineVersion`, `EngineCapability`) must NOT import Spring or JPA.
- `RoleAuthorityPolicy` constants are referenced by FQCN in `@PreAuthorize` expressions (D-535).
- No `tenant_id` column in any GEST table (INV-GEST-3 — global schema).
- No physical delete on any registry row (INV-GEST-6 — append + soft-retire).
- Messaging disabled: no `@KafkaListener`, no `@RabbitListener`, no outbox pattern.

---

## 5. Referências

- docs/architecture/backend/services/gest-service/contracts/api-contract.md
- docs/architecture/backend/services/gest-service/contracts/data-model.md
- docs/architecture/backend/services/gest-service/contracts/event-contracts.md
- docs/architecture/backend/services/gest-service/contracts/hub-integration.md
- docs/architecture/backend/services/gest-service/contracts/integration-contracts.md
- docs/architecture/backend/services/gest-service/spec/backend/SPEC-01 through SPEC-10
- docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md
- docs/architecture/backend/issues/GEST-001..GEST-025.md
- docs/architecture/backend/issues/INT-GEST-PAT-001.md, INT-GEST-PAT-002.md, INT-GEST-ACS-001.md, INT-GEST-MIG-001.md
