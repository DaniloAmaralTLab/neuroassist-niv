<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Service: `neuroassist-niv-service-registry` · Module **REG (Eureka)** · Infrastructure · Port **8761** · No DB · No UI.

## System Boundary

REG is a single Spring Boot process running **Spring Cloud Netflix Eureka Server**
(`@EnableEurekaServer`) bound to port **8761**. Its entire responsibility is to accept
client registrations and serve the registry. It has:

- **no REST business API** (only the Eureka protocol endpoints `/eureka/**` and the
  dashboard, plus `/actuator/health`);
- **no persistence** — the registry is an in-memory, self-rebuilding lease table;
- **no tenant awareness** — it is below the multi-tenant layer entirely.

The boundary is "the address book". Everything about *who* is behind a registered name and
*what* they do is out of REG's boundary.

## External Actors and Systems

| Actor / System | Direction | Interaction |
|---|---|---|
| Business services (ACS, PAT, EDGE, EVNT, DASH, CONV, GEST, HIST) | → REG | Register their instance (name, host, port, status); renew lease; fetch peer registry. |
| API gateway (GWY) | → REG | Fetch registry to resolve routes by logical service name. |
| Ops operator | → REG | View dashboard / `/actuator/health`. |
| (none) | — | REG makes **no outbound** calls to any business service and reads no external system. |

## End-to-End Flows

**Golden path — registration & discovery (no REG code on the request path):**

1. A service starts as a Eureka client with `defaultZone = ${EUREKA_URI:http://localhost:8761/eureka}`.
2. The client **registers** with REG (`spring.application.name` + `host:port`,
   `prefer-ip-address: true`, `instance-id = ${spring.application.name}:${server.port}`).
3. The client **renews its lease** on the heartbeat interval.
4. A caller (another service or GWY) **fetches the registry** and resolves a peer by its
   logical name, then makes its own sync REST / Feign call directly to the peer — **REG is
   not on that call path**.
5. On client shutdown (or missed leases past the eviction window), REG **evicts** the
   instance; with self-preservation off in dev, a dead instance disappears promptly.

**Alternative — REG unavailable:** clients retry registration/fetch and operate on their
last cached registry; name-based resolution degrades until REG returns. REG is a
convenience/decoupling layer, not an on-path dependency of an individual business request.

## Internal Boundaries

REG has **no hexagonal domain layering** because it has no domain. It is a thin
Spring Boot application:

```
neuroassist-niv-service-registry/
+-- src/main/java/com/neuroassist/registry/   RegistryApplication (@EnableEurekaServer)
+-- src/main/resources/application.yml         server.port=8761, eureka.* server config
```

There are no controllers, services, repositories, entities or ports to layer. The shared
hexagonal ADR (`../../adr/ADR-001-hexagonal-architecture.md`) governs the business services
and does not impose a ports/adapters structure on this infrastructure process.

## Cross-cutting Concerns

- **Security.** Internal-network-only; the dashboard and `/eureka/**` are not exposed
  publicly. No registry authentication / mTLS in the MVP (ADR-001, revisable). **No PHI**
  passes through REG — only service-location lease metadata.
- **Observability.** `/actuator/health` exposed for liveness probing; the Eureka dashboard
  gives an at-a-glance fleet view. No business metrics belong here.
- **Multi-tenancy.** Not applicable — REG is tenant-agnostic infrastructure; the shared
  `../../adr/ADR-003-multi-tenancy.md` governs the data-owning services, not REG.
- **Resilience.** Self-preservation disabled in dev for honest eviction; single-node (no
  peer replication) accepted for the current deployment (ADR-001).
