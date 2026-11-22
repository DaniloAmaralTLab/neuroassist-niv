# Plan — REG (neuroassist-niv-service-registry)

## Status das prioridades

- P1 — pendente
- P2 — pendente
- P3 — pendente
- P4 — pendente
- P5 — pendente
- P6 — pendente
- P7 — pendente
- P8 — pendente

---

## 0. Leitura executiva

### Papel do serviço (extraído de 01-architectural-vision.md)

REG is the **service registry** of the NeuroAssist NIV backend. It is a single Spring Cloud Netflix Eureka Server (`@EnableEurekaServer`) that holds no business data, no PHI, no tenant schema, and no domain model. Every in-fleet service (ACS, PAT, EDGE, EVNT, CONV, GEST, HIST, TRN) and the API Gateway (GWY) publish their network location here and resolve their peers by logical name instead of hardcoded host:port. REG **discovers, never routes** (ADR-002-service-boundary-registry-only.md).

### MVP scope (extraído de 01)

- Single Eureka Server node bound to port `8761` (matches the `EUREKA_URI` default already configured in every client — INV-REG-3).
- Single-node standalone topology: `register-with-eureka=false`, `fetch-registry=false`.
- Self-preservation **disabled in dev** for fast, honest convergence; **enabled in prod** (config-time decision per ADR-001-eureka-registry-topology.md).
- Actuator health/readiness/prometheus endpoints.
- Structured lifecycle logging (best-effort) to Elasticsearch.
- No database, no Flyway, no tenant schema, no PHI.

### Diagnóstico inicial (gaps mapeados em 06)

| Gap | Mitigation |
|---|---|
| Single point of discovery (no HA) | Clients cache registry; HA peer replication deferred (ADR-001) |
| Self-preservation prod posture undecided | Fixed at config time via `application-prod.yml` (REG-003) |
| Spring Cloud release-train compatibility | Pinned explicitly in Gradle BOM (REG-004) |
| Unauthenticated registry (network-trust only) | Registry auth deferred; internal-network-only topology enforced (REG-005) |

---

## 1. Estratégia geral

### Objetivo macro

Deliver a running, correctly-configured Eureka Server at port `8761` that the full fleet can register with on day one, with health checks, Prometheus metrics, structured lifecycle logging, BDD coverage for the three core behaviors (registration, eviction, discovery), and a containerized deployment form.

### Ordem das prioridades

| P | Título | Motivo |
|---|---|---|
| P1 | Scaffold + base config | App must compile and start before anything else; port and single-node flags are breaking invariants if wrong |
| P2 | Spring Cloud version + prod profile | Version conflicts fail at startup; prod profile is config-required before testing self-preservation |
| P3 | Security posture | Eureka dashboard must be internal-only before the service is started in any shared environment |
| P4 | Actuator endpoints | Health/readiness are required for container orchestration and for P6 integration tests |
| P5 | Structured lifecycle logging + fleet integration | Logging best-effort; fleet smoke test validates the registry's core value |
| P6 | BDD + GWY integration | Three feature files cover all core behaviors; GWY discovery validates end-to-end name resolution |
| P7 | Dockerfile + Docker Compose + log shipping IT | Container form required for compose-based dev; log shipping closes the observability loop |
| P8 | Runbook verification | Final accuracy pass on operator documentation |

---

## 2. Plano por prioridade

### Prioridade P1 — Scaffold and base configuration

**Status:** pendente

#### Objetivo / Resultado esperado

A compilable, startable Spring Boot subproject with `@EnableEurekaServer` on port `8761`, single-node flags set, and dev profile defaults (self-preservation off, fast eviction).

#### Issues vinculadas

- REG-001 — Gradle subproject + RegistryApplication
- REG-002 — application.yml + application-dev.yml

#### Specs cobertas

- SPEC-01, SPEC-02, SPEC-03

#### Sequência de execução

- Fase 1: REG-001 — Gradle build, RegistryApplication, settings.gradle.kts, smoke test
- Fase 2: REG-002 — application.yml (port 8761, single-node), application-dev.yml (self-preservation off)

#### Critérios de aceite

- `./gradlew :services:neuroassist-niv-service-registry:compileJava` exits 0
- `./gradlew :services:neuroassist-niv-service-registry:test` exits 0
- Eureka dashboard loads at `http://localhost:8761/`

#### Riscos

- Port `8761` conflict if another process occupies it locally — check with `netstat -an | grep 8761` before starting.

#### Instrução para implementador

Create the Gradle subproject first (REG-001), then the YAML config (REG-002). Do not introduce any Spring Security dependency in P1 — that comes in P3. The `@EnableEurekaServer` annotation on `RegistryApplication` is the only Eureka-specific code; all behavior is configuration-driven.

---

### Prioridade P2 — Spring Cloud version + production profile

**Status:** pendente

#### Objetivo / Resultado esperado

Spring Cloud Eureka Server version is explicitly pinned and compatible with the project's Spring Boot 3.x/Java 21 line. The prod profile file is committed so a production start-up (`SPRING_PROFILES_ACTIVE=prod`) enables self-preservation.

#### Issues vinculadas

- REG-003 — application-prod.yml
- REG-004 — Spring Cloud version pinning in Gradle

#### Specs cobertas

- SPEC-03, SPEC-01, 06-risks-gaps-assumptions.md

#### Sequência de execução

- Fase 1: REG-004 — pin version in BOM / `libs.versions.toml`
- Fase 2: REG-003 — prod profile with `enable-self-preservation=true`

#### Critérios de aceite

- `./gradlew :services:neuroassist-niv-service-registry:dependencies` exits 0 without version conflict for Eureka
- Both `dev` and `prod` profiles load without `BeanCreationException`

#### Riscos

- Spring Cloud `2023.x` BOM requires Spring Boot `3.1+`. If the project targets an older Boot version, the compatible range is `2022.x` — verify the root project's Spring Boot version first.

#### Instrução para implementador

Use the Spring Cloud BOM declared in the root project's `build.gradle.kts` (or `libs.versions.toml`). Do not declare the Spring Cloud version directly on the dependency — let the BOM manage it.

---

### Prioridade P3 — Security posture

**Status:** pendente

#### Objetivo / Resultado esperado

The Eureka dashboard (`/`) and protocol (`/eureka/**`) are reachable only from the internal network. The actuator health endpoint is accessible without credentials. No JWT is read or validated. No tenant context is propagated.

#### Issues vinculadas

- REG-005 — ActuatorSecurityConfig, application.yml security settings

#### Specs cobertas

- SPEC-06

#### Sequência de execução

- Fase 1: REG-005 — `@EnableWebSecurity` config; permit health/readiness/prometheus; document network-trust posture for Eureka plane

#### Critérios de aceite

- `GET /actuator/health` returns HTTP 200 without credentials
- No JWT filter in the security chain

#### Riscos

- Adding Spring Security changes the auto-configuration behavior — test immediately after adding the dependency to ensure the Eureka dashboard is not broken by an unintended security filter chain.

#### Instrução para implementador

If `spring-boot-starter-security` is added, the default behavior locks all endpoints with form login. The `ActuatorSecurityConfig` must explicitly permit the health/readiness/prometheus paths and leave the Eureka protocol endpoints open (network trust). Do not add JWT filter — REG makes no auth decision.

---

### Prioridade P4 — Actuator endpoints

**Status:** pendente

#### Objetivo / Resultado esperado

`/actuator/health`, `/actuator/health/readiness`, and `/actuator/prometheus` are live, returning correct responses. These are required by container orchestration (P7) and by the integration tests (P5).

#### Issues vinculadas

- REG-006 — health/readiness/liveness endpoints + test
- REG-007 — Prometheus metrics endpoint + test

#### Specs cobertas

- SPEC-07, SPEC-01

#### Sequência de execução

- Fase 1: REG-006 — enable health probes, write `ActuatorEndpointsTest`
- Fase 2: REG-007 — add micrometer-prometheus, write `PrometheusMetricsTest`

#### Critérios de aceite

- Both actuator tests pass: `./gradlew :services:neuroassist-niv-service-registry:test` exits 0
- `GET /actuator/prometheus` body contains `eureka_server_*` metric lines

#### Riscos

- None significant — Actuator is well-tested behavior in Spring Boot.

#### Instrução para implementador

Expose `management.endpoints.web.exposure.include=health,prometheus` in `application.yml`. Add `management.endpoint.health.probes.enabled=true` for readiness. Micrometer Prometheus is an additive dependency — no existing behavior should change.

---

### Prioridade P5 — Structured lifecycle logging and fleet integration smoke test

**Status:** pendente

#### Objetivo / Resultado esperado

Each Eureka lifecycle event (registration, renewal, eviction) produces a structured JSON log line shipped best-effort to Elasticsearch. The fleet integration smoke test confirms all nine in-fleet services appear in the registry as UP.

#### Issues vinculadas

- REG-008 — LoggingConfig + logback-spring.xml + LifecycleLoggingTest
- INT-REG-001 — FleetRegistrationIT

#### Specs cobertas

- SPEC-07, SPEC-10, integration-contracts.md §1 and §2

#### Sequência de execução

- Fase 1: REG-008 — lifecycle event listener, Logstash JSON appender
- Fase 2: INT-REG-001 — FleetRegistrationIT with nine mock Eureka clients

#### Critérios de aceite

- `LifecycleLoggingTest` passes: a registration event produces a log entry with `event=REGISTERED`
- `FleetRegistrationIT` passes: nine logical ids appear as UP in `GET /eureka/apps`
- ES unavailability does not break `GET /eureka/apps`

#### Riscos

- Eureka's internal event hooks changed between Spring Cloud versions — verify the event class names against the pinned version (REG-004).

#### Instrução para implementador

Use SLF4J MDC or a `SmartApplicationListener` / `EurekaInstanceRenewedEvent` to capture lifecycle events. Do not use blocking I/O in the event handler — logging must be async (best-effort). Testcontainers for Elasticsearch is used in INT-REG-003 (P7), not here; use `ListAppender<ILoggingEvent>` for the unit-level `LifecycleLoggingTest` in P5.

---

### Prioridade P6 — BDD scenarios and GWY discovery integration test

**Status:** pendente

#### Objetivo / Resultado esperado

All three `.feature` files (service-registration, eviction-and-self-preservation, discovery-resolution) have passing Cucumber step definitions. GWY resolves service routes via REG (no hardcoded host:port).

#### Issues vinculadas

- REG-009 — ServiceRegistrationStepDefs + RegistryCucumberRunner
- REG-010 — EvictionSelfPreservationStepDefs
- REG-011 — DiscoveryResolutionStepDefs
- INT-REG-002 — GatewayDiscoveryIT

#### Specs cobertas

- SPEC-08, SPEC-02, SPEC-03, SPEC-05, SPEC-10

#### Sequência de execução

- Fase 1: REG-009 — CucumberRunner + registration step defs
- Fase 2: REG-010 — eviction/self-preservation step defs (depends on runner)
- Fase 3: REG-011 — discovery-resolution step defs
- Fase 4: INT-REG-002 — GatewayDiscoveryIT

#### Critérios de aceite

- `./gradlew :services:neuroassist-niv-service-registry:test` exits 0 with all three feature files passing
- `GatewayDiscoveryIT` passes: `GET /eureka/apps/acs-service` returns the mock instance

#### Riscos

- Eviction tests that advance clock may require Eureka's internal `AbstractInstanceRegistry` to be injected/mocked — check the Spring Cloud version's test support before choosing the approach.

#### Instrução para implementador

Feature files already exist at `docs/architecture/backend/services/neuroassist-niv-service-registry/tests/cucumber/`. The step definitions must implement every step in those files exactly (no step text modification). Share common Given steps via a base step class.

---

### Prioridade P7 — Dockerfile, Docker Compose, and log-shipping integration test

**Status:** pendente

#### Objetivo / Resultado esperado

A multi-stage Dockerfile produces a minimal JRE-based image. The service is correctly wired into `docker-compose.yml` as the first service to start. An integration test verifies lifecycle logs reach Elasticsearch via Testcontainers.

#### Issues vinculadas

- REG-012 — Dockerfile
- REG-013 — docker-compose.yml entry
- INT-REG-003 — LifecycleLogShippingIT (Testcontainers + Elasticsearch)

#### Specs cobertas

- SPEC-01, SPEC-07, SPEC-10

#### Sequência de execução

- Fase 1: REG-012 — Dockerfile (multi-stage JRE)
- Fase 2: REG-013 — docker-compose.yml, healthcheck, depends_on for all services
- Fase 3: INT-REG-003 — Testcontainers ES integration test

#### Critérios de aceite

- `docker build` exits 0; container starts and health check passes
- `docker compose config` exits 0
- `LifecycleLogShippingIT` passes: at least one `event=REGISTERED` document found in ES

#### Riscos

- Testcontainers requires Docker Desktop running during CI — gate `INT-REG-003` behind a `@Tag("integration")` and exclude from default unit test suite.

---

### Prioridade P8 — Runbook verification

**Status:** pendente

#### Objetivo / Resultado esperado

The existing runbook is verified against the implemented service. All commands produce the documented output. PHI-absence verification section is added.

#### Issues vinculadas

- REG-014 — runbook accuracy verification

#### Specs cobertas

- SPEC-07, SPEC-01

#### Sequência de execução

- Fase 1: REG-014 — execute each `curl` command, update any stale outputs, add PHI-absence and self-preservation-state sections

#### Critérios de aceite

- All `curl` commands in the runbook return the documented response
- Runbook contains a "Verify no PHI in registry" section

---

## 3. Dependências externas

| Dependency | Needed by | Notes |
|---|---|---|
| Spring Cloud Netflix Eureka Server | REG-001, REG-004 | BOM version must match Spring Boot 3.x |
| `micrometer-registry-prometheus` | REG-007 | Additive; no behavioral change |
| Cucumber JVM (`cucumber-java`, `cucumber-spring`, `cucumber-junit-platform-engine`) | REG-009 | Test scope only |
| Testcontainers Elasticsearch | INT-REG-003 | Test scope, requires Docker |
| In-fleet services as Eureka clients | INT-REG-001 | Mock clients used in test; no actual service start required |

## 4. Restrições arquiteturais (Java)

- ArchUnit RULE-01..08 (CLAUDE.md); no hexagonal layers apply — REG has no domain model.
- `@Transactional` does not apply — no JPA, no database.
- No business REST controller — `THE SYSTEM SHALL NOT author any business REST resource` (SPEC-01).
- No JWT handling, no tenant context — `THE SYSTEM SHALL NOT validate any edge JWT` (SPEC-06).
- Logging is best-effort — event handler must use an async appender and never block registration/discovery.

## 5. Referências

- `docs/architecture/backend/services/neuroassist-niv-service-registry/01-architectural-vision.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-01-api-surface.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-02-registry-core.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-03-self-preservation-and-ha.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-05-idempotency-concurrency.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-06-security.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-07-observability-health.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-08-bdd-test-scenarios.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/spec/backend/SPEC-10-integrations.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/contracts/api-contract.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/contracts/integration-contracts.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/adr/ADR-001-eureka-registry-topology.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/adr/ADR-002-service-boundary-registry-only.md`
- `docs/architecture/backend/services/neuroassist-niv-service-registry/setup-local.md`
- `docs/architecture/backend/issues/issues_map-REG.md`
