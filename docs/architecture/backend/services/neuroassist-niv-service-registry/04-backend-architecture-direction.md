<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Service: `neuroassist-niv-service-registry` · Module **REG (Eureka)** · Infrastructure · Port **8761**.

## Stack

- **Java 21 / Spring Boot** (aligned with the rest of the monorepo, `stack.backend.version = 21`).
- **Spring Cloud Netflix Eureka Server** (`spring-cloud-starter-netflix-eureka-server`),
  enabled with `@EnableEurekaServer`.
- **Build:** Gradle (Kotlin DSL), consistent with the other services.
- **No** Spring Data JPA, **no** PostgreSQL, **no** Flyway — REG owns no schema. The Spring
  Cloud BOM version must match the Boot version used by the client services.

REG is the **server** counterpart to the Eureka **client** already configured in every
business service (`eureka.client.service-url.defaultZone = ${EUREKA_URI:http://localhost:8761/eureka}`).

## Service Boundary

**Single service, registry-only** (local ADR-002). REG is one standalone Eureka Server
process and nothing else: no business endpoints, no domain, no database. It is deliberately
minimal — adding any business responsibility here would be a boundary violation. It does not
register with itself and does not replicate to a peer (single-node — ADR-001).

## Package Organization

REG is **not hexagonally layered** — it has no domain, application or infrastructure
adapters to separate. The whole service is a single bootstrap class plus config:

```
src/main/java/com/neuroassist/registry/
+-- RegistryApplication.java      @SpringBootApplication @EnableEurekaServer

src/main/resources/
+-- application.yml               server.port: 8761
                                  eureka.client.register-with-eureka: false
                                  eureka.client.fetch-registry: false
                                  eureka.server.enable-self-preservation: false   (dev)
                                  management.endpoints.web.exposure.include: health
```

The shared hexagonal ADR (`../../adr/ADR-001-hexagonal-architecture.md`) governs the
business services; it does not impose a ports/adapters layout on this infrastructure
process. The **scaffold** phase owns the actual `RegistryApplication` + `build.gradle.kts`
+ `application.yml` — this vision phase produces no code.

## Hub Service Dependencies

**None.** REG depends on no TechLab AI hub service (`orchestration` / `knowledge` /
`document_composition` / `analytics`) and the project has `ai.hasAi = false`. REG makes no
outbound call to any business service.

## External Integrations

**None.** REG integrates with no external API or legacy system. Its only clients are the
project's own services and gateway, over the Eureka protocol on the internal network. TLS
is applied outside localhost per the inherited internal-network-only posture; no external
integration surface exists.

## Async vs Sync Decisions

- **Messaging: disabled** (`stack.messaging.enabled = false`) — REG publishes nothing to a
  broker and depends on no module via events.
- The Eureka protocol itself is **client-pull** (clients register and periodically fetch);
  REG never pushes to a business service and is never on a synchronous business-request
  path. There is no sync-vs-async trade-off to decide for REG beyond "it is a passive
  registry".
