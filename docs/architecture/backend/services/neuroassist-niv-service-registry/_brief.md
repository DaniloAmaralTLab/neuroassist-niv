# REG — Structured Brief (source for Specs / Backlog / Scaffold)

> Module: **REG — Service Registry (Eureka)** · Service: `neuroassist-niv-service-registry` · Project: NeuroAssist NIV
> Stack: `java` (Java 21 / Spring Boot + Spring Cloud Netflix Eureka Server) · **Infrastructure**
> · No UI · No database · No tenant schema · Messaging: disabled.

1. **Canonical name / prefix:** `neuroassist-niv-service-registry` (canonical `registry`) /
   prefix `REG`. Port **8761**.

2. **Problem it solves:** the NeuroAssist NIV services (ACS, PAT, EDGE, EVNT, DASH, CONV,
   GEST, HIST) and the gateway need to find each other by **logical name** instead of a
   hard-coded host:port, for sync REST (Feign / `RestClient`) and gateway routing. The
   services are **already** Eureka clients (`EUREKA_URI` default
   `http://localhost:8761/eureka` in every `application.yml`); REG is the **Eureka Server**
   that owns and formalises the address they already expect.

3. **Personas:** no human end-user and no ACS role. Actors are the **business services** and
   **gateway** (Eureka clients that register and query) and the **ops operator** (reads the
   dashboard / `/actuator/health`).

4. **MVP scope (minimum viable):** one standalone **Eureka Server** (`@EnableEurekaServer`)
   on **port 8761**; single-node / standalone (`register-with-eureka: false`,
   `fetch-registry: false`, no peer replication); **self-preservation disabled** in dev for
   honest fast eviction; minimal security posture (internal-network-only, `/actuator/health`
   exposed, dashboard not public, **no PHI**); **no database, no Flyway, no tenant schema**.

5. **Out of MVP scope:** any business domain / entity / PHI; multi-node Eureka HA peer
   replication (deferred); each service's client-side `EUREKA_URI` (owned by that service);
   gateway routing rules (GWY); registry authentication / mTLS beyond network isolation;
   config-server / centralised config distribution.

6. **Mandatory external integrations:** none. REG makes **no outbound** call; its only
   clients are the project's own services and gateway over the Eureka protocol on the
   internal network. TLS outside localhost (inherited internal-network-only posture).

7. **TechLab AI services depended on:** none (`ai.hasAi = false`). Messaging disabled → no
   event dependency on any module; REG publishes nothing to a broker.

8. **Anchor domain event:** **none** — REG is infrastructure and owns no domain event. Its
   only lifecycle signals are Eureka-internal registry changes (instance registered /
   renewed / evicted), which are not a NeuroAssist domain contract.

## Source material this module reconciles

- **Client config already in the monorepo:** `backend/services/*/src/main/resources/application.yml`
  → every service has `eureka.client.service-url.defaultZone = ${EUREKA_URI:http://localhost:8761/eureka}`,
  `prefer-ip-address: true`, `instance-id = ${spring.application.name}:${server.port}`.
  REG binds the exact `:8761` address these clients expect.
- **Shared ADRs (project-level, not re-emitted):** `../../adr/ADR-001-hexagonal-architecture.md`,
  `../../adr/ADR-002-modular-monolith.md`, `../../adr/ADR-003-multi-tenancy.md` — govern the
  business services; a pure registry holds no domain/PHI/tenant data, so they apply to REG
  only nominally.
- **Ports in use by peers:** ACS 8081 … EVNT 8086 (and gateway) — REG takes the standard
  Eureka port **8761**, outside the business port range.

## Local ADRs emitted by this phase

- ADR-001 — Eureka service registry retained: single-node, port 8761, security and
  self-preservation (**aceita**, orchestrator recommendation — revisable).
- ADR-002 — REG service boundary: registry-only single service (**aceita**, orchestrator
  recommendation — revisable).

## Notes for the following phases (Specs / Backlog / Scaffold)

- There is **no business API, no data model and no domain event contract** to spec — REG's
  "contract" is operational: a running Eureka Server on `:8761` with the config above.
- Scaffold owns `RegistryApplication.java` (`@EnableEurekaServer`), `build.gradle.kts`
  (`spring-cloud-starter-netflix-eureka-server`, Spring Cloud BOM matching Boot 21) and
  `application.yml` (port 8761, `register-with-eureka: false`, `fetch-registry: false`,
  `enable-self-preservation: false` in dev, `management.endpoints.web.exposure.include: health`).
- Backlog should produce operational / infra issues (bootstrap the server, pin lease &
  eviction timings, wire health probe), not business-feature issues.
