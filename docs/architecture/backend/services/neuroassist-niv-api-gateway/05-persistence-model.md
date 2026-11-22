<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Service: `neuroassist-niv-api-gateway` · Module **GWY (Spring Cloud Gateway)** · **No database · No schema · No migration.**

## Schema Strategy

**None — GWY owns no schema.** The gateway holds no database, no JPA, no tenant schema and no
row of any kind. It is a stateless reactive proxy whose only runtime state is the route table
and filter configuration loaded from `application.yml`. The shared multi-tenancy ADR
(`../../adr/ADR-003-multi-tenancy.md`, schema-per-tenant on `neuroassist_global` + `t_<tenantId>`)
governs the **data-owning** services; it does not apply to GWY, which never touches a schema.
The gateway does not even hold tenant *context* — it strips the client `X-Tenant-Id` and
lets the resource servers derive tenant from the JWT `tenantId` claim (ADR-003).

## Initial Entities

**None.** GWY defines no entity, aggregate or value object (see `03-initial-domain-framing.md`).

## Migration Strategy

**None.** GWY contributes **no** Flyway migration. All schema migration is owned centrally by
**MIG** (`../neuroassist-niv-migrations/`, centralized Flyway for `neuroassist_global` and
every `t_<tenantId>`). GWY adds nothing to the migration set — it has no schema to migrate.

## Data Lifecycle

**No data at rest.** The gateway persists nothing, so there is no retention, archival or
erasure concern for GWY itself (LGPD right-to-erasure is satisfied per-tenant by the
data-owning services and MIG's per-schema dump/restore). The only transient data GWY touches
is the in-flight request/response it forwards and its **PHI-free** access-log lines (method,
path template, status, latency, correlation id — no bodies, query values or token contents,
INV-G1 / ADR-007). Those logs follow the platform's standard log-retention policy and contain
no patient, gesture or tenant data.
