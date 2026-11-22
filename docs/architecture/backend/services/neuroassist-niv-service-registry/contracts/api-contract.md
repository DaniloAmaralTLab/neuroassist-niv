# REG — API Contract (Registry Surface)

> REG exposes **no business resources of its own**. Its "API surface" is the
> Spring Cloud Netflix **Eureka server protocol** (registration, lease renewal,
> de-registration, discovery query) plus the built-in Eureka **dashboard** and
> the Actuator health/readiness endpoints. This contract defines that surface,
> the required behaviors, and the membership/health invariants. REG **discovers,
> never routes** (ADR-002): it answers "where is service X?" and never proxies
> business traffic.
>
> EARS invariants per `adr/ADR-001-eureka-registry-topology.md` and
> `adr/ADR-002-service-boundary-registry-only.md` (local). Guide:
> `docs/architecture/backend/standards/ears-notation.md`.

## 1. Nature of the surface

REG does not author a REST contract by hand — the surface is the standard Eureka
HTTP protocol provided by `spring-cloud-starter-netflix-eureka-server`, plus the
dashboard and Actuator. Clients use the Eureka client library (`eureka.client.*`),
not raw HTTP, so the protocol is documented here as the authoritative behavioral
contract rather than as endpoints to implement.

`THE SYSTEM SHALL expose the standard Eureka server registration and discovery protocol.`
`THE SYSTEM SHALL NOT proxy, route, or compose any business API traffic.`
`THE SYSTEM SHALL author no business REST resource of its own.`

## 2. Auth model

- REG makes **no authentication or authorization decision**. Edge token
  validation is GWY's job; domain authz stays in the services.
- The registration/discovery plane is **platform-internal** (network trust): in
  the deployed topology only in-fleet services and the gateway reach REG; REG is
  not exposed at the public edge (INV-REG-3 / ADR-001 security posture).

`THE SYSTEM SHALL NOT validate any edge JWT or business access token.`
`THE SYSTEM SHALL NOT make any authorization decision.`
`THE SYSTEM SHALL treat the registration/discovery plane as platform-internal (network trust), not public.`

## 3. Eureka protocol surface (behavioral contract)

The Eureka server protocol, expressed as behavior. `{app}` is a logical service
id (e.g. `pat-service`); `{instanceId}` identifies a registered instance
(`${spring.application.name}:${server.port}`, `prefer-ip-address: true`).

| Interaction | Eureka operation | Behavior |
|---|---|---|
| Register | `POST /eureka/apps/{app}` | record instance lease under the logical id, status `UP` |
| Renew (heartbeat) | `PUT /eureka/apps/{app}/{instanceId}` | refresh lease expiry while healthy |
| De-register | `DELETE /eureka/apps/{app}/{instanceId}` | remove instance on graceful shutdown |
| Query all | `GET /eureka/apps` | full registry snapshot (all apps + instances) |
| Query one app | `GET /eureka/apps/{app}` | instances for a logical id |
| Status override | `PUT /eureka/apps/{app}/{instanceId}/status` | operator / OUT_OF_SERVICE toggle |

`WHEN a service instance registers under a logical id, THE SYSTEM SHALL record its lease and advertise it as UP.`
`WHEN a registered instance renews its lease within the lease window, THE SYSTEM SHALL keep it advertised.`
`WHEN an instance de-registers gracefully, THE SYSTEM SHALL remove it from discovery immediately.`
`WHEN a discovery query arrives for a logical id, THE SYSTEM SHALL return only instances currently advertised as UP.`
`IF an instance reports a non-UP status, THEN THE SYSTEM SHALL NOT advertise it for discovery.`

## 4. Lease lifecycle and eviction

| Setting | MVP value | Meaning |
|---|---|---|
| Lease renewal interval (client) | 30 s (Eureka default) | how often a client heartbeats |
| Lease expiration duration | 90 s (Eureka default) | grace before an instance is eviction-eligible |
| Eviction loop | periodic (server timer) | removes expired leases when self-preservation allows |

`WHILE an instance keeps renewing its lease within the expiration window, THE SYSTEM SHALL keep it in the registry.`
`IF an instance stops renewing its lease beyond the expiration window, THEN THE SYSTEM SHALL make it eviction-eligible.`
`WHEN the eviction loop runs and self-preservation is not active, THE SYSTEM SHALL remove expired instances from discovery.`

## 5. Self-preservation (ADR-001)

Self-preservation protects the lone registry node from flushing the registry when
a transient network blip causes many clients to miss heartbeats at once. In **dev
it is disabled** (`eureka.server.enable-self-preservation: false`) so a stopped
service is evicted promptly for honest fast convergence; the **prod** posture
(self-preservation on) is an open decision pinned at config time (ADR-001).

`WHERE self-preservation is enabled, WHILE the observed renewal rate drops below the self-preservation threshold, THE SYSTEM SHALL stop evicting instances and preserve the last known registry.`
`WHERE self-preservation is enabled, WHEN the renewal rate recovers above the threshold, THE SYSTEM SHALL resume normal eviction.`
`WHILE self-preservation is disabled (dev posture), THE SYSTEM SHALL evict an instance promptly once its lease expires.`

## 6. Dashboard and health surface

| Path | Purpose | Notes |
|---|---|---|
| `/` (Eureka dashboard) | operator view of registered apps/instances | built-in status page |
| `/actuator/health` | liveness | server up |
| `/actuator/health/readiness` | readiness | registry accepting registrations |
| `/actuator/prometheus` | metrics | registered apps, renewals/min, evictions |

`THE SYSTEM SHALL expose the Eureka dashboard for operator inspection of the live fleet.`
`THE SYSTEM SHALL expose liveness, readiness, and metrics endpoints separate from the Eureka protocol surface.`
`WHILE the registry is not yet accepting registrations, THE SYSTEM SHALL report readiness as not-ready.`

## 7. Single-node topology (ADR-001 / ADR-002)

For the MVP, REG is a single node and does not register with or fetch from itself.
Its port `8761` matches the `EUREKA_URI` default already configured in every client
(INV-REG-3 — changing it is a breaking change across the fleet).

`THE SYSTEM SHALL run as a single registry node for the MVP (register-with-eureka=false, fetch-registry=false).`
`THE SYSTEM SHALL bind the Eureka server to port 8761 to match the EUREKA_URI default already configured in every client.`
`WHERE peer-replicated HA is later enabled, THE SYSTEM SHALL replicate registry state across peers (deferred — ADR-001).`
