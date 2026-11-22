# Plan — GWY (neuroassist-niv-api-gateway)

## Status das prioridades

- P1 — pendente
- P2 — pendente
- P4 — pendente
- P5 — pendente
- P7 — pendente
- P8 — pendente
- P9 — pendente

---

## 0. Leitura executiva

### Papel do servico

`neuroassist-niv-api-gateway` is the single entry point for all external traffic.
It is a **Spring Cloud Gateway (WebFlux)** service that routes, never composes: it
forwards path predicates to `lb://` logical service names resolved through Eureka (REG),
runs a coarse, stateless edge JWT check against two issuers (ACS + EDGE), enforces
the anonymous allow-list, strips tenant headers, rate-limits login and pairing, and
propagates correlation ids. It carries **no business domain** — no JPA entities, no
Flyway migrations, no aggregates.

### MVP scope

Eight routes (R1..R8), two-issuer JWT edge check (ACS + EDGE JWKS), rate limiting
on login/pairing, tenant-header stripping, CORS for the caregiver shell, PHI-free
access logging, RFC 7807 error model, circuit breaker/timeouts, and idempotent-only
retry. Messaging is disabled platform-wide; GWY has no datastore.

### Diagnostico inicial

- **Framework gap (integration-contracts §7, CONFIRMED):** the generated gateway
  templates ship an empty route table and a single Keycloak `issuer-uri`. Every item
  in this plan is hand-wired by design.
- **G2 CLOSED:** `trn-service` port 8089 confirmed in
  `backend/services/trn-service/src/main/resources/application.yml`.
- **G3 CLOSED:** EDGE paths confirmed from `edge-service/contracts/api-contract.md`:
  `POST /edge/devices/pair` (code-authenticated, `X-Pairing-Code`, rate-limited),
  `GET /edge/.well-known/jwks.json`, `GET /edge/health`.
- **G4 OPEN:** rate-limit threshold values are proposals; mechanism (in-memory, per-IP)
  is fixed (ADR-005). Thresholds are configuration and tuned per environment.
- **D-642 mandate:** a mandatory 401 integration test must ship with GWY-004.
- **BDD glue:** emit one `*Steps.java` class per feature file (not a monolithic
  `GwyStepDefs.java`) to avoid the duplicate-step-glue defect.
- **WebFlux webEnvironment:** `BaseIntegrationTest` must use `RANDOM_PORT`
  (GWY is a full web service, opposite of non-web REG/MIG).

---

## 1. Estrategia geral

### Objetivo macro

Deliver a fully operational API gateway that provides a single, secure, observable
entry point for all eight NeuroAssist NIV business services, with the two-issuer JWT
check proven by executable tests.

### Ordem das prioridades

| P | Titulo | Motivo |
|---|---|---|
| P1 | Bootstrap + route table | Compilable module with the full route table is the basis for everything else |
| P2 | Security + filters | Multi-issuer JWT (D-642 proof), correlation-id, tenant-header strip — these are the core gateway behaviors |
| P4 | Service discovery (Eureka) | lb:// routing depends on Eureka client config; needed before integration tests |
| P5 | CORS + rate limiting | Security posture items that build on P2 SecurityConfig |
| P7 | Observability | PHI-free logs, ProblemDetail errors, Actuator |
| P8 | BDD coverage | Proves all behaviors with executable scenarios |
| P9 | Hardening | Circuit breaker, retry, ArchUnit, Dockerfile, runbook |

---

## 2. Plano por prioridade

### Prioridade 1 — Bootstrap + route table

**Status:** pendente

#### Objetivo / Resultado esperado

A compilable Gradle module for `neuroassist-niv-api-gateway` with Spring Cloud Gateway
WebFlux, the `integrationTest` source-set split, and the full route table R1..R8
declared in `application.yml`.

#### Issues vinculadas

- GWY-001 — Gradle module scaffold
- GWY-002 — Route table R1..R8

#### Specs cobertas

- SPEC-01 (api surface)
- SPEC-02 (routing)
- `generator-config.yml` (type=gateway, port=8080)

#### Sequencia de execucao

1. GWY-001: create Gradle module, `build.gradle.kts`, `GatewayApplication`, package skeleton, `application.yml` stub
2. GWY-002: populate `spring.cloud.gateway.routes[]` with 8 routes

#### Criterios de aceite

- `./gradlew :neuroassist-niv-api-gateway:compileJava` exits 0
- 8 routes declared with `lb://` targets, no `StripPrefix`
- `application.yml` declares `server.port: 8080`, `spring.application.name: neuroassist-niv-api-gateway`

#### Riscos

- Route R8 (`/trn/**`) is now CONFIRMED (G2 closed) — no risk here.

#### Instrucao para implementador

Create the Gradle module under `backend/services/neuroassist-niv-api-gateway/`.
Add `spring-cloud-starter-gateway` (WebFlux) and `spring-cloud-starter-netflix-eureka-client`
to `build.gradle.kts`. The `integrationTest` source set must exclude IT classes from
the `test` task (D-636 pattern — same as ACS-001). Populate `application.yml` routes
after scaffolding, using the route table from `contracts/api-contract.md` §2.
No business logic — only config.

---

### Prioridade 2 — Security + filters (core gateway behaviors)

**Status:** pendente

#### Objetivo / Resultado esperado

A fully wired security chain: `@EnableWebFluxSecurity` with public-paths allow-list,
multi-issuer JWT (ACS + EDGE), correlation-id propagation, and tenant-header stripping.
Mandatory D-642 integration test proving 401 without token.

#### Issues vinculadas

- GWY-003 — SecurityConfig (WebFlux)
- GWY-004 — Multi-issuer JWT + D-642 proof test
- GWY-005 — CorrelationIdFilter
- GWY-006 — TenantHeaderStripFilter
- INT-GWY-001 — ACS JWKS path + iss claim confirmation
- INT-GWY-002 — EDGE JWKS path + iss claim confirmation

#### Specs cobertas

- SPEC-03 (edge JWT)
- SPEC-05 (idempotency — correlation-id preserve)
- SPEC-06 (security posture)
- SPEC-07 (correlation-id — INV-G4)

#### Sequencia de execucao

1. INT-GWY-001 + INT-GWY-002: confirm issuer strings (prerequisite for GWY-004)
2. GWY-003: SecurityConfig stub (permitAll public_paths, anyExchange authenticated, placeholder jwt hook)
3. GWY-005 + GWY-006: filters (CorrelationId, TenantHeaderStrip)
4. GWY-015 (BaseIntegrationTest — prerequisite for GWY-004 test)
5. GWY-004: replace stub with ReactiveAuthenticationManagerResolver, two decoders, exp-less validator, GatewayAuthIT

#### Criterios de aceite

- `GatewayAuthIT` asserts HTTP 401 on a protected route without a token (D-642)
- ACS-signed and EDGE-signed tokens admitted; forged/expired rejected
- `X-Tenant-Id` absent from all forwarded requests

#### Riscos

- R1: single issuer by mistake — mitigated by the mandatory EDGE-signed test scenario
- R2: non-expiring token rejected — mitigated by `ExpLessJwtValidator` and test
- INT-GWY-001/002 blocking: if ACS/EDGE issuer strings are unavailable, the resolver cannot be wired; use a placeholder until confirmed

#### Instrucao para implementador

Do NOT use `@EnableMethodSecurity` — that is for servlet resource servers. GWY is
WebFlux; use `@EnableWebFluxSecurity` and `SecurityWebFilterChain`. The resolver routes
by `iss` claim — read the confirmed issuer strings from INT-GWY-001/002 before wiring.
See `contracts/integration-contracts.md` §2 for the JWKS URI config keys
(`gateway.jwks.acs-uri`, `gateway.jwks.edge-uri`). The `BaseIntegrationTest` must use
`WebEnvironment.RANDOM_PORT` — GWY handles HTTP requests; `NONE` or `MOCK` would prevent
the gateway filter chain from running.

---

### Prioridade 4 — Service discovery (Eureka client)

**Status:** pendente

#### Objetivo / Resultado esperado

GWY registered as a Eureka client, `lb://` route resolution active, discovery locator
explicitly disabled (explicit routes only).

#### Issues vinculadas

- GWY-007 — Eureka client config
- INT-GWY-003 — REG confirmation

#### Specs cobertas

- SPEC-02 (routing — lb:// resolution)
- SPEC-10 (integrations)
- `contracts/integration-contracts.md` §3

#### Sequencia de execucao

1. GWY-007: add Eureka config to `application.yml`
2. INT-GWY-003: verify fleet registration

#### Criterios de aceite

- `spring.cloud.gateway.discovery.locator.enabled: false`
- `eureka.client.service-url.defaultZone: ${EUREKA_URI:http://localhost:8761/eureka}`
- GWY appears in Eureka dashboard after startup

#### Riscos

- REG must be running before GWY starts; `depends_on` chain in compose (GWY-020) handles this

#### Instrucao para implementador

Add all three keys from `integration-contracts.md` §3 to `application.yml`. The
`prefer-ip-address: true` setting is important in containerized deployments where hostname
resolution may be unreliable.

---

### Prioridade 5 — CORS + rate limiting

**Status:** pendente

#### Objetivo / Resultado esperado

CORS config for the caregiver shell and in-memory rate limiting on login and pairing
endpoints.

#### Issues vinculadas

- GWY-008 — CorsWebFilter
- GWY-009 — In-memory rate limiting

#### Specs cobertas

- SPEC-06 (CORS ADR-004, rate limit ADR-005)
- `contracts/integration-contracts.md` §4, §5

#### Sequencia de execucao

1. GWY-008: `CorsConfig` with `CorsWebFilter`
2. GWY-009: `RateLimitConfig` with two token buckets

#### Criterios de aceite

- No wildcard + credentials in CORS config (Risk R6)
- 429 returned on burst to login/pairing; other routes unaffected

#### Riscos

- G4 OPEN: rate-limit threshold values are still proposals; ship with safe defaults and tune in `application-prod.yml`
- R7: per-instance rate limiting is bypassable across instances — accepted for MVP (A4)

#### Instrucao para implementador

Both CORS and rate-limit values MUST come from `application.yml` configuration
(`gateway.cors.*`, `gateway.ratelimit.*`). Never hard-code origins or thresholds.
See `contracts/integration-contracts.md` §4 and §5 for the exact config key names.

---

### Prioridade 7 — Observability

**Status:** pendente

#### Objetivo / Resultado esperado

PHI-free access logging, RFC 7807 ProblemDetail errors, and Actuator/Prometheus
metrics exposed.

#### Issues vinculadas

- GWY-010 — PHI-free access log filter
- GWY-011 — RFC 7807 ProblemDetail error handler
- GWY-012 — Actuator + Prometheus

#### Specs cobertas

- SPEC-07 (observability — ADR-007, INV-G1)
- SPEC-01 (error model)

#### Sequencia de execucao

1. GWY-011: `GatewayErrorWebExceptionHandler` (error model needed by P9 circuit breaker fallback too)
2. GWY-010: `AccessLogFilter` (PHI-free logging)
3. GWY-012: Actuator exposure config

#### Criterios de aceite

- No body, path variables, query values, or token content in any log line (INV-G1)
- 401/429/502/503/504 all return ProblemDetail JSON with `correlationId`
- `/actuator/env` NOT accessible

#### Riscos

- R4: PHI leakage into logs — mitigated by fixed-format `AccessLogFilter` and the
  log-scrub assertion in SPEC-07 (the BDD issue GWY-018 covers a PHI-free log assertion)

#### Instrucao para implementador

The `AccessLogFilter` must log the **route template** (e.g. `/hist/**`), not the
concrete URI. The concrete path with patient ids must never appear in a GWY log line.
Use `exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_MATCHED_ROUTE_ATTR)` to
get the route ID/predicate after matching.

---

### Prioridade 8 — BDD coverage

**Status:** pendente

#### Objetivo / Resultado esperado

Executable Cucumber scenarios covering all six feature files from SPEC-08, with
the D-642 mandatory 401 test included.

#### Issues vinculadas

- GWY-015 — BaseIntegrationTest
- GWY-016 — routing.feature step defs
- GWY-017 — public-vs-authenticated.feature step defs (D-642)
- GWY-018 — rate-limit + correlation-id + tenant-strip + cors-preflight step defs

#### Specs cobertas

- SPEC-08 (all six feature files)
- SPEC-03 (D-642 mandate)

#### Sequencia de execucao

1. GWY-015: `BaseIntegrationTest` (prerequisite for all other BDD issues)
2. GWY-016: routing feature (depends on GWY-002)
3. GWY-017: auth feature (depends on GWY-004 — D-642 proof)
4. GWY-018: remaining four features (depends on GWY-005/006/008/009)

#### Criterios de aceite

- `./gradlew :neuroassist-niv-api-gateway:integrationTest` exits 0
- Six feature files have executable step definitions
- The D-642 scenario ("protected route returns 401 without token") passes

#### Riscos

- Duplicate step glue: emit one `*Steps.java` per feature, never a monolithic `GwyStepDefs.java`
- GWY-004 must be complete before GWY-017 can pass (multi-issuer resolver required)

#### Instrucao para implementador

`BaseIntegrationTest` with `WebEnvironment.RANDOM_PORT` starts the full gateway
filter chain. Use WireMock or `MockWebServer` to stub all 8 downstream services and
the two JWKS endpoints. Test JWTs can be self-signed with Nimbus for unit speed.
Emit `CucumberIT.java` and `CucumberSpringContext.java` following the same pattern
as ACS (ACS-023 reference).

---

### Prioridade 9 — Hardening

**Status:** pendente

#### Objetivo / Resultado esperado

Circuit breaker per route, idempotent-only retry, ArchUnit MODULE constant, Dockerfile,
docker-compose entry, and verified runbook.

#### Issues vinculadas

- GWY-013 — Per-route circuit breaker + timeouts
- GWY-014 — Idempotent-only retry
- GWY-019 — ArchUnit MODULE = gateway
- GWY-020 — Dockerfile + docker-compose
- GWY-021 — Runbook verification

#### Specs cobertas

- SPEC-02 (resilience — ADR-006)
- SPEC-05 (idempotency — Risk R8)
- `contracts/integration-contracts.md` §6

#### Sequencia de execucao

1. GWY-013 + GWY-014: resilience config (circuit breaker + retry in `application.yml`)
2. GWY-019: ArchUnit (after full scaffold complete)
3. GWY-020: Dockerfile + compose
4. GWY-021: runbook verification (after compose works)

#### Criterios de aceite

- 8 named circuit breakers, one per downstream
- `Retry` filter: `methods: GET` only — never retries POST
- Dockerfile builds; compose starts on 8080 after REG
- Runbook commands execute successfully

#### Riscos

- R8: blanket retry on POST — structurally mitigated by `methods: GET` in config

#### Instrucao para implementador

All resilience4j values (`slidingWindowSize`, `failureRateThreshold`, `connectTimeout`,
`responseTimeout`) belong in `application.yml` under `gateway.resilience.<route>.*`.
The `Retry` filter `methods: GET` is the only protection against double-POST — verify
it is applied to every route including the two rate-limited public routes.

---

## 3. Dependencias externas

| Service | Type | Requirement |
|---|---|---|
| REG (neuroassist-niv-service-registry) | Critical runtime | GWY depends on REG for lb:// routing — startup order enforced via compose `depends_on` |
| ACS (acs-service) | Critical runtime | ACS JWKS endpoint + iss claim value (INT-GWY-001) |
| EDGE (edge-service) | Critical runtime | EDGE JWKS endpoint + iss claim value (INT-GWY-002) |
| All 8 business services | Critical runtime | Must register with REG for lb:// routing to work |

---

## 4. Restricoes arquiteturais (java)

- Gateway is **WebFlux** (Reactor, non-blocking): all filters implement `GlobalFilter`, beans are `Mono`/`Flux` only — no blocking I/O.
- `@EnableWebFluxSecurity` and `SecurityWebFilterChain` are the correct annotations — **not** `@EnableMethodSecurity` (that is for servlet resource servers; using it here would silently fail to protect routes — D-642 inverted risk).
- No JPA entities, no `@Service` with blocking database calls, no Flyway — the gateway is stateless.
- ArchUnit (GWY-019): no `@Entity` class in the gateway module; no Spring MVC `@RestController` annotation.
- All configuration values (routes, JWKS URIs, CORS origins, rate-limit thresholds, resilience config) are **externalized** to `application.yml` — no magic numbers in code.

---

## 5. Referencias

- `docs/architecture/backend/services/neuroassist-niv-api-gateway/contracts/api-contract.md`
- `docs/architecture/backend/services/neuroassist-niv-api-gateway/contracts/integration-contracts.md`
- `docs/architecture/backend/services/neuroassist-niv-api-gateway/generator-config.yml`
- `docs/architecture/backend/services/neuroassist-niv-api-gateway/spec/backend/SPEC-01..SPEC-10`
- `docs/architecture/backend/services/neuroassist-niv-api-gateway/adr/ADR-001..ADR-007`
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`
- `docs/architecture/backend/issues/issues_map-GWY.md`
