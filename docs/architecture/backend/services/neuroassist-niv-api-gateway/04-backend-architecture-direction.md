<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Service: `neuroassist-niv-api-gateway` · Module **GWY (Spring Cloud Gateway)** · Infrastructure · Port **8080**.

## Stack

- **Java 21 / Spring Boot** (aligned with the monorepo, `stack.backend.version = 21`).
- **Spring Cloud Gateway** (`spring-cloud-starter-gateway`, reactive / Netty) — the routing
  and global-filter engine.
- **Spring Cloud Netflix Eureka Client** (`spring-cloud-starter-netflix-eureka-client`) +
  Spring Cloud LoadBalancer — enables `lb://<service>` resolution against REG `:8761`
  (`eureka.client.service-url.defaultZone = ${EUREKA_URI:http://localhost:8761/eureka}`).
- **Spring Security (reactive resource-server)** for the coarse edge JWT check, configured
  with the **two** JWKS URIs (ACS + EDGE — ADR-002); multi-issuer `JwtDecoder`/
  `ReactiveAuthenticationManager` resolution.
- **resilience4j** (circuit breaker + timeouts) for per-route resilience (ADR-006).
- **Build:** Gradle (Kotlin DSL). The Spring Cloud BOM version must match the Boot version
  used by the client services. **No** Spring Data JPA, **no** PostgreSQL, **no** Flyway —
  GWY owns no schema.

## Service Boundary

**Single service, gateway-only** (local ADR-001). GWY is one standalone Spring Cloud Gateway
process: route table + global filters + security/CORS/rate-limit/resilience config, nothing
else. No business endpoint, no domain, no database. Adding request aggregation, body
transformation or any domain logic here would be a boundary violation — it stays a thin,
stateless edge. It routes **only** to the eight business services; it does **not** front
REG, MIG or DASH.

## Package Organization

GWY is **not hexagonally layered** — there is no domain/application/infrastructure split to
make for a declarative proxy. The shared hexagonal ADR
(`../../adr/ADR-001-hexagonal-architecture.md`) governs the business services, not this
process. Layout:

```
src/main/java/com/neuroassist/gateway/
+-- GatewayApplication.java        @SpringBootApplication @EnableDiscoveryClient
+-- filter/                        CorrelationIdFilter, TenantHeaderStripFilter,
                                   (coarse JWT via Spring Security), AccessLogFilter
+-- config/                        SecurityConfig (2 JWKS, anonymous allow-list),
                                   CorsConfig, RateLimitConfig, Resilience4jConfig

src/main/resources/
+-- application.yml                spring.cloud.gateway.routes[*], JWKS URIs,
                                   globalcors, resilience4j, rate-limit thresholds
```

The **scaffold** phase owns the actual classes and `application.yml`; this vision phase
produces no code. Root package `com.neuroassist.gateway` (`packageBase = com.neuroassist`).

## Hub Service Dependencies

**None.** `ai.hasAi = false` — GWY depends on no TechLab AI hub service (`orchestration` /
`knowledge` / `document_composition` / `analytics`). Its only runtime dependencies are
**REG** (Eureka discovery) and the **ACS / EDGE JWKS** endpoints for signature keys.

## External Integrations

**None external.** GWY integrates with no third-party API or legacy system. Internal-only
integrations: Eureka (REG) for discovery and the two JWKS endpoints for key material. TLS is
terminated at/above the gateway per the inherited internal-network posture; the gateway is
the controlled ingress but originates no outbound third-party call.

## Async vs Sync Decisions

- **Messaging: disabled** (`stack.messaging.enabled = false`) — GWY publishes nothing to a
  broker and depends on no module via events.
- **All gateway traffic is synchronous HTTP** request/response proxying. The reactive
  (Netty) runtime is non-blocking internally, but the semantics are synchronous forwarding —
  there is no async/eventing trade-off to decide. Resilience of those sync calls (timeouts,
  circuit breaker, idempotent-only retry) is covered in ADR-006.
