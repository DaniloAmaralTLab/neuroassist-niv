<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-001 — Eureka service registry retained: single-node, port 8761, security and self-preservation

## Status
aceita

> Note: orchestrator default (recommendation) - revisable by the owner.

## Contexto

The NeuroAssist NIV backend is a modular-monolith-of-services (shared
`../../../adr/ADR-002-modular-monolith.md`) with several Spring Boot services on distinct
ports (ACS 8081 … EVNT 8086, gateway, …) that talk over sync REST (Feign / `RestClient`).
Every service was scaffolded as a **Eureka client**: each `application.yml` carries
`eureka.client.service-url.defaultZone = ${EUREKA_URI:http://localhost:8761/eureka}`,
`prefer-ip-address: true` and `instance-id = ${spring.application.name}:${server.port}`.
The clients therefore already expect a Eureka **server** at `:8761`. Without one, client
registration and name-based resolution degrade (retries, failed Feign name lookups).

The decision is whether to **retain and formalise** Eureka (vs. removing it in favour of
static host:port wiring or another discovery mechanism), and, if retained, to pin its
topology, port, security posture and eviction behaviour. Forces: the clients already depend
on `:8761`; the deployment is a small, trusted internal network with no external exposure
and no PHI in registry metadata; the project values honest, fast convergence in dev over
partition-tolerance.

## Decisão

We will **retain Eureka** and run a single standalone **Eureka Server**
(`neuroassist-niv-service-registry`, `@EnableEurekaServer`) with:

- **Port 8761**, matching the `EUREKA_URI` default already configured in every client — the
  server adapts to the fleet, not the reverse.
- **Single-node / standalone**: `register-with-eureka: false`, `fetch-registry: false`; no
  peer replication (no HA cluster this phase).
- **Self-preservation disabled** in dev (`eureka.server.enable-self-preservation: false`)
  so a stopped service is evicted promptly instead of lingering as a stale `UP`; lease /
  eviction timings tuned for fast convergence on a small trusted LAN (concrete numbers set
  at scaffold/config time).
- **Security posture**: internal-network-only; the dashboard and `/eureka/**` are not
  publicly exposed; `/actuator/health` exposed for liveness; **no registry authentication /
  mTLS** in the MVP; **no PHI ever** transits REG (only service-location lease metadata).

## Consequências

- **Positive:** the address the clients already expect is owned and documented; services
  resolve peers by logical name with no client change; a dead instance disappears quickly
  (honest dev topology); minimal attack surface on a trusted network.
- **Positive:** REG stays pure infrastructure — no DB, no schema, no PHI, no tenant data —
  so LGPD / multi-tenancy concerns do not touch it.
- **Negative / trade-off:** single-node REG is a single point of discovery; an outage
  degrades name-based resolution until it returns (mitigated by client-side registry cache
  and retries). HA peer replication is deferred — revisit on a concrete availability driver.
- **Negative / trade-off:** self-preservation off can evict healthy instances during a
  genuine partition; accepted in dev, the **prod** posture (self-preservation on) is left
  open. Registration is gated only by network isolation (no registry auth) — accepted under
  internal-network-only, revisit if the network trust boundary changes.
