# ADR-001 -- Multi-tenant via schema per tenant

**Status:** Accepted
**Decision makers:** Architect + AI agent (refined via discovery ingestion)
**Supersedes:** none

> **Source of truth for the policies:** `templates/architecture/decisions/multi-tenancy.arch.json` (D-063).
> Isolation strategies, supported modes and the propagation contract are derived from the JSON.
> Per-project values (chosen mode, schemas) come from `project-context.json`.

---

## Context

NeuroAssist NIV adopts the **Multi-tenant (SaaS B2B)** mode (`multi-tenant`): SaaS multi-tenant: external clients isolated as dynamically-discovered tenants. Tenants are unknown at design time. RBAC is per-tenant; catalogues may be shared or per-tenant depending on product design.

Each tenant has strictly isolated data. The choice of strategy (`schema-per-tenant`) determines how isolation is physically realized in the database and how the context travels through the application.

## Decision

Adopt **schema per tenant** in Postgres:

Each tenant lives in its own Postgres schema; a global schema holds shared catalogues (users, roles, vocabulary, parameters). Hibernate switches search_path per connection via a custom MultiTenantConnectionProvider.

| Schema | Content |
|---|---|
| `neuroassist_global` | Users, roles, permissions and catalogues shared across all tenants (global parameters, canonical vocabulary, data that does NOT vary per tenant) |
| `emp_<tenant-slug>` | Operational per tenant — one instance per client, replicated N× via `neuroassist-niv-migrations` |

The canonical DDL of each operational schema lives in `neuroassist-niv-migrations` (Flyway/Liquibase). Migrations are applied N+1 times: 1× on the global + 1× on each tenant.

### Context propagation

**Synchronous (HTTP):**

1. The JWT carries `tenant_id` (selected at login or via the `X-Tenant-Id` header when the user has access to multiple tenants).
2. The Spring Security filter (`TenantContextFilter`) reads the claim and populates `TenantContextHolder` (ThreadLocal + MDC key `tenantId`).
3. `TenantContextHolder.require()` is called at the start of each `application.service` — enforced by ArchUnit `RULE-07`. Every application.service method MUST call holder.require() at entry, enforced by an ArchUnit rule. Forgetting it raises a compile-time test failure rather than a silent runtime leak.
4. Hibernate's `MultiTenantConnectionProvider` (SCHEMA strategy) executes `SET search_path TO <tenant-schema>, neuroassist_global, public` per connection.

**Asynchronous (`@JmsListener`, background threads):**

- ThreadLocal does not propagate. The tenant id travels as a **JMS message header** (`tenantId`).
- The consumer reads the header, populates `TenantContextHolder`, processes, and calls `clear()` in the `finally` (always_in_finally_block).
- ThreadLocal does not cross thread boundaries. The tenant id travels as a JMS message header; the consumer reads it, binds the holder, processes, and calls holder.clear() in a finally block. Failing to clear leaks state across thread-pool reuse — this is mandatory.
- `TenantContextExecutor.runAs(tenantId, () -> ...)` helper for internal tasks.

### RBAC × tenant

- A user can have access to **N tenants** (`usuario_tenant` association in `neuroassist_global`).
- At each login, the frontend shows a selector if N > 1; the choice persists in the JWT.
- Roles (declared in `arch/decisions/rbac.arch.json`) are defined in the global schema but **scoped per tenant** in the association.
- Details: `docs/architecture/shared/rbac/`.

## Consequences

**Positive:**

- Strong isolation: backup, restore, retention and audit per tenant.
- Migrations applied N+1 times (1 global + N per tenant) — explicit and auditable.
- Cross-tenant reports use explicit UNION ALL across schemas — protects against accidental leak.
- Per-tenant dump/restore is trivial — useful for GDPR/LGPD right-to-erasure or moving a tenant to another instance.

**Negative:**

- Cross-tenant queries require explicit code (no automatic JOIN).
- New tenant = new migration set (schema + every V*.sql) — automated but adds an operational step.
- DDL drift risk: all emp_* schemas must be on the same migration version. The migrations service is the single source of truth.

## Alternatives considered

The other isolation strategies declared in `multi-tenancy.arch.json`:

### Tenant-id column (`tenant-id-column`)

Single schema; every row carries a tenant_id column. Filter applied universally via Hibernate @Filter or query interceptor at the EntityManager level.

**Positive:** Single schema simplifies migrations and backup operations.; Cross-tenant queries are trivial — just drop the filter where allowed.; Smaller infrastructure footprint.
**Negative:** Risk of leak if the filter is forgotten in custom native queries.; Heavier indexes — every secondary index must include tenant_id to remain selective.; Single backup/restore — harder to operate per-tenant retention or GDPR-style erasure.

### Database per tenant (`database-per-tenant`)

Each tenant in a separate Postgres database, with its own connection pool. The application maintains N HikariCP DataSources and resolves which one to use per request.

**Positive:** Strongest isolation — physical separation, easy to move a tenant to a different host.; Per-tenant resource limits possible at the DB level.
**Negative:** N connection pools at runtime — memory + handshake cost scales linearly.; Complex local development (N databases to seed).; Higher infrastructure cost.; Schema migrations harder to orchestrate (must hit every DB).

### Single-tenant (`none`)

No tenant isolation — the application serves a single internal tenant. No tenant_id is propagated; the request context is empty of tenant data.

**Positive:** Simplest model — no holder, no filter, no propagation.
**Negative:** Cannot serve multiple tenants without a non-trivial refactor.

## Implementation

- Identity service: issues the JWT with `tenant_id`, manages the `usuario_tenant` association.
- `neuroassist-niv-migrations`: reads the list of tenants (env var or `neuroassist_global.tenant` table) and runs migrations per schema.
- Each BE microservice: depends on `libs/shared/tenant-context` (Gradle module) which provides `TenantContextHolder`, `TenantContextFilter`, `MultiTenantConnectionProvider`, `JmsHeadersInterceptor`.
- Frontend: `@neuroassist/shared/tenant-context` provides the tenant selector + HTTP interceptor that adds `X-Tenant-Id` (redundant with the JWT, helps with debug/logging).

## References

- Hibernate multi-tenancy: https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#multitenacy
- Original discovery ADRs (if applicable): `_inbox/adr/` (preserved verbatim by D-073 ingestion)
- Formalized decisions: `arch/decisions/multi-tenancy.arch.json` (D-063); cross-project + per-project overrides in `arch/overrides/` (D-074)
