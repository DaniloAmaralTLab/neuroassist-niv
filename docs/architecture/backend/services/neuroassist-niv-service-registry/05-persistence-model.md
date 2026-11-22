<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Service: `neuroassist-niv-service-registry` · Module **REG (Eureka)** · **No database · No schema · No migration.**

## Schema Strategy

**None.** REG owns **no database schema** — neither `hub_global` nor any `t_<tenantId>`
tenant schema. It holds no persistent state at all. The registry is an **in-memory lease
table** managed by the Eureka Server library and rebuilt from client re-registration after
a restart. The shared multi-tenancy ADR (`../../adr/ADR-003-multi-tenancy.md`) does not
apply to REG.

## Initial Entities

**None.** There are no JPA entities, tables, columns or indexes. The only runtime state is
transient Eureka lease metadata (`logical name`, `host`, `port`, `status`, `lease`), which
is never persisted and is not modelled as a domain entity.

## Migration Strategy

**No migrations.** REG has no Flyway scripts and no MIG-owned migration set — there is no
schema to evolve. Unlike the business services (whose migrations are authored locally /
applied centrally via MIG against PostgreSQL), REG never connects to a database.

## Data Lifecycle

- **In-memory only.** Lease entries live only while a client keeps renewing; on expiry (or
  client shutdown) they are evicted. Nothing is retained, archived or backed up.
- **No PHI, no retention obligation.** REG stores no patient, gesture or tenant data, so it
  carries no LGPD retention, erasure or export obligation.
- **Recovery by re-registration.** After a REG restart the registry repopulates itself as
  clients re-register on their next heartbeat; no data recovery step is needed.
