<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposicoes a Validar
- Dependencias Criticas
-->

# 06 — Risks, Gaps, Assumptions

> Service: `neuroassist-niv-service-registry` · Module **REG (Eureka)** · Infrastructure.

## Riscos

- **Single point of discovery (single-node).** With no peer replication, a REG outage
  degrades name-based resolution for the whole fleet until it returns. Mitigation: clients
  cache the last registry and retry; HA peer replication is deferred (ADR-001), revisit on
  a concrete availability driver.
- **Self-preservation off in dev masks real partitions.** Honest eviction in dev means a
  genuine network blip can evict healthy instances. Accepted for dev/pilot; the prod
  posture (self-preservation on) is an open decision (ADR-001).
- **Address coupling.** Every client hard-expects `:8761/eureka` via `EUREKA_URI`. Changing
  REG's port/host is a breaking change across all services (INV-REG-3).
- **Unauthenticated registry on the network.** Registration is gated only by network
  isolation (no registry auth / mTLS in MVP). A rogue host on the internal network could
  register a spoofed instance. Mitigation: internal-network-only; registry auth deferred.

## Gaps Conhecidos

- **No HA / peer replication** — single-node only this phase.
- **No registry authentication or mTLS** — relies on network isolation.
- **Prod self-preservation posture undecided** — dev uses `false`; prod value to be pinned.
- **No eviction/lease timings pinned numerically** — concrete `lease-expiration-duration` /
  `eviction-interval` / renewal values are a scaffold/config concern, directionally "fast
  convergence on a small trusted LAN".

## Suposicoes a Validar

- The `EUREKA_URI` default `http://localhost:8761/eureka` is the single address all clients
  use (confirmed present in ACS/EDGE/EVNT `application.yml`; assumed uniform across the
  fleet).
- Single-node Eureka is sufficient for the current internal-network deployment scale.
- No business or PHI data will ever be pushed through registry metadata (guaranteed by
  INV-REG-1; assumes clients keep registering only location, which is Eureka default).
- The Spring Cloud release train chosen for REG is compatible with the Spring Boot version
  used by the client services.

## Dependencias Criticas

- **Spring Cloud Netflix Eureka Server** compatible with the project's Spring Boot 21 line.
- The **business services and gateway** as Eureka clients (already configured) — REG has no
  value without registered clients, but makes **no outbound** dependency of its own.
- **No** dependency on PostgreSQL, MIG, ACS, any hub service, or any broker.
