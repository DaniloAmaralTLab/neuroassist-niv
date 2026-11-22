# Issues Map — GWY (neuroassist-niv-api-gateway)

> Service: `neuroassist-niv-api-gateway` · Type: `gateway` · Port: 8080
> Package: `com.neuroassist.gateway`
> SPECs: SPEC-01..SPEC-10 (SPEC-04 and SPEC-09 are N/A for this service)
> Contracts: `api-contract.md`, `integration-contracts.md`

## By priority

| Issue | Title | Priority | SPEC | Status |
|---|---|---|---|---|
| GWY-001 | Gradle module scaffold (build.gradle.kts, integrationTest split) | P1 | SPEC-01, ADR-001 | INTACT |
| GWY-002 | Route table R1..R8 in application.yml (eight lb:// routes, no StripPrefix) | P1 | SPEC-01, SPEC-02 | INTACT |
| GWY-003 | SecurityConfig WebFlux (@EnableWebFluxSecurity, public_paths permitAll, deny-by-default) | P2 | SPEC-03, SPEC-06 | INTACT |
| GWY-004 | Multi-issuer JWT (ReactiveAuthenticationManagerResolver, ACS + EDGE, exp-less, D-642 proof) | P2 | SPEC-03 | INTACT |
| GWY-005 | CorrelationIdFilter (global, generate-if-absent, preserve, MDC, echo) | P2 | SPEC-05, SPEC-07 | INTACT |
| GWY-006 | TenantHeaderStripFilter (strip X-Tenant-Id before forwarding, INV-G3) | P2 | SPEC-06 | INTACT |
| INT-GWY-001 | ACS — confirm /acs/.well-known/jwks.json path and iss claim value | P2 | SPEC-03 | INTACT |
| INT-GWY-002 | EDGE — confirm /edge/.well-known/jwks.json path and iss claim value | P2 | SPEC-03 | INTACT |
| GWY-007 | Eureka client config (defaultZone, prefer-ip-address, discovery.locator disabled) | P4 | SPEC-02, SPEC-10 | INTACT |
| INT-GWY-003 | REG — confirm GWY registers and lb:// resolves for all 8 services | P4 | SPEC-02 | INTACT |
| GWY-008 | CorsWebFilter (explicit origin allow-list, never wildcard+credentials) | P5 | SPEC-06 | INTACT |
| GWY-009 | In-memory rate limiting (login + pairing buckets, 429, per-IP key) | P5 | SPEC-06 | INTACT |
| GWY-010 | PHI-free access log filter (method, route template, status, latency, correlationId ONLY) | P7 | SPEC-07 | INTACT |
| GWY-011 | RFC 7807 ProblemDetail error handler (PHI-free 401/429/502/503/504 with correlationId) | P7 | SPEC-01, SPEC-06 | INTACT |
| GWY-012 | Actuator + Prometheus (health/prometheus exposed, all others restricted) | P7 | SPEC-07 | INTACT |
| GWY-015 | BaseIntegrationTest (WebFlux RANDOM_PORT, WireMock stubs for 8 downstreams) | P8 | SPEC-08 | INTACT |
| GWY-016 | BDD routing.feature step defs (R1..R8 forwarding, no REG/MIG/DASH, full path) | P8 | SPEC-01, SPEC-02, SPEC-08 | INTACT |
| GWY-017 | BDD public-vs-authenticated.feature step defs (401/EDGE-signed/no-exp/D-642) | P8 | SPEC-03, SPEC-06, SPEC-08 | INTACT |
| GWY-018 | BDD rate-limit + correlation-id + tenant-strip + cors-preflight step defs | P8 | SPEC-06, SPEC-07, SPEC-08 | INTACT |
| GWY-013 | Per-route circuit breaker + connect/response timeouts (resilience4j, 503/504) | P9 | SPEC-02 | INTACT |
| GWY-014 | Idempotent-only retry (GET only, never login/pairing/event-report POST) | P9 | SPEC-02, SPEC-05 | INTACT |
| GWY-019 | ArchUnit MODULE constant = gateway, package-layer enforcement | P9 | ADR-001 | INTACT |
| GWY-020 | Dockerfile + docker-compose entry (port 8080, depends_on REG) | P9 | SPEC-07 | INTACT |
| GWY-021 | Runbook verification (setup-local.md commands match implementation) | P9 | runbook.md | INTACT |

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (api surface, route table, error model) | GWY-001, GWY-002, GWY-011 |
| SPEC-02 (routing and resilience) | GWY-002, GWY-007, GWY-013, GWY-014, GWY-016 |
| SPEC-03 (edge JWT two issuers) | GWY-003, GWY-004, GWY-017, INT-GWY-001, INT-GWY-002 |
| SPEC-04 (data model) | N/A — no database |
| SPEC-05 (idempotency/concurrency) | GWY-005, GWY-014 |
| SPEC-06 (security — CORS, rate limit, tenant strip) | GWY-003, GWY-006, GWY-008, GWY-009, GWY-017, GWY-018 |
| SPEC-07 (observability, PHI-free logs) | GWY-005, GWY-010, GWY-012, GWY-018 |
| SPEC-08 (BDD scenarios) | GWY-015, GWY-016, GWY-017, GWY-018 |
| SPEC-09 (messaging) | N/A — messaging disabled |
| SPEC-10 (integrations) | GWY-007, INT-GWY-003 |

## By package / component

| Component | Issues |
|---|---|
| `config/SecurityConfig.java` | GWY-003, GWY-004 |
| `config/MultiIssuerJwtConfig.java` | GWY-004 |
| `config/CorsConfig.java` | GWY-008 |
| `config/RateLimitConfig.java` | GWY-009 |
| `filter/CorrelationIdFilter.java` | GWY-005 |
| `filter/TenantHeaderStripFilter.java` | GWY-006 |
| `filter/AccessLogFilter.java` | GWY-010 |
| `error/GatewayErrorWebExceptionHandler.java` | GWY-011 |
| `application.yml` (routes) | GWY-002 |
| `application.yml` (Eureka) | GWY-007 |
| `application.yml` (Actuator) | GWY-012 |
| `application.yml` (resilience4j) | GWY-013, GWY-014 |
| `application.yml` (rate-limit) | GWY-009 |
| `application.yml` (CORS) | GWY-008 |
| `integrationTest/BaseIntegrationTest.java` | GWY-015 |
| `integrationTest/bdd/*Steps.java` | GWY-016, GWY-017, GWY-018 |
| `integrationTest/archunit/GatewayArchTest.java` | GWY-019 |
| `Dockerfile` + `docker-compose.yml` | GWY-020 |
| `runbook.md` | GWY-021 |
| Integration (ACS) | INT-GWY-001 |
| Integration (EDGE) | INT-GWY-002 |
| Integration (REG) | INT-GWY-003 |
