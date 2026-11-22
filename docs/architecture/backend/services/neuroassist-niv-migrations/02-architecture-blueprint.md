<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Service: `neuroassist-niv-migrations` · Module **MIG (Centralized Flyway)** · Infrastructure · **No port · No DB schema of its own · No UI** · runs as a one-shot job and exits.

## System Boundary

MIG is a **single Spring Boot process that is not a server**. It starts, performs the
migration passes against PostgreSQL, and **exits** (init-container / batch semantics,
`restart: "no"`). Inside the boundary: the baseline block `V0001–V0009`, the per-schema
Flyway driver, the tenant enumeration/provisioning logic and the `migration_range_registry`
housekeeping. Outside the boundary: every module's authored DDL (MIG *applies* it, does not
*own* it), tenant onboarding policy (platform-ops), and all runtime business traffic.

## External Actors and Systems

| Actor / System | Relationship |
|---|---|
| **Platform / ops operator** | Invokes MIG (`--all` / `--global-only` / `--tenant` / `--provision-tenant`); owns the admin datasource and reads the exit code + logs. |
| **PostgreSQL** | The only integration. One **admin-capable** datasource (`CREATE SCHEMA`, `CREATE EXTENSION`) plus per-schema Flyway connections. Holds `neuroassist_global` + every `t_<tenantId>` and the per-schema `flyway_schema_history`. |
| **Business services** (ACS, PAT, EDGE, EVNT, GEST, HIST, CONV, TRN) | **Indirect, offline.** They author the `V00xx` scripts MIG applies and depend on the resulting schema. No runtime call in either direction. |
| **Service Registry (REG / Eureka)** | **None.** MIG is **not** a Eureka client — it runs and exits, so it never registers; REG's own doc 06 lists business services + gateway as the only clients. |
| **Message broker** | **None** — messaging disabled project-wide. |
| **TechLab AI** | **None.** |

## End-to-End Flows

**Golden path — full run (`--all`, fresh database):**

1. Ensure baseline (`V0001–V0009`): `CREATE EXTENSION IF NOT EXISTS` (uuid-ossp, pgcrypto,
   pg_trgm, unaccent) and `CREATE SCHEMA IF NOT EXISTS neuroassist_global` — executed as
   plain admin statements **outside any transaction** (ADR-002), then `uuid_generate_v7()`
   and `migration_range_registry` via Flyway on `neuroassist_global`.
2. **Global pass:** run Flyway on `neuroassist_global` with the locations filtered to
   `-- schema: global` migrations (ACS global, PAT `gesture_type`, EDGE `device_pairing_code`,
   GEST registry, HIST audit-global, CONV/TRN authority seeds, …).
3. **Tenant pass:** `SELECT schema_name FROM information_schema.schemata WHERE schema_name
   LIKE 't\_%'`; for each `t_<tenantId>`, run Flyway with the tenant-template locations and
   `search_path = t_<tenantId>, neuroassist_global` (so extension operator classes resolve —
   Learning pitfall).
4. Record outcome per schema; **exit 0** only if global and every tenant reached the target
   version, else **exit non-zero** naming the failing schema.

**New-tenant provisioning (`--provision-tenant <id>`):**

1. Resolve the schema name the **same way** the tenant-creation point derives it
   (`t_<tenantId>` — Learning pitfall: creation and application must agree on naming).
2. `CREATE SCHEMA t_<tenantId>` outside a transaction (ADR-002).
3. Run the tenant pass for that one schema to the current version.

**Deploy with new DDL (`--all`, existing database):** same as golden path; already-applied
versions are skipped by Flyway history; the next version is chosen as
`max(global ∪ tenant histories) + 1` (never per-schema-local — Learning pitfall).

## Internal Boundaries

MIG is **not hexagonally layered** — there is no domain aggregate to protect. Its internal
shape is a thin job:

```
src/main/java/com/neuroassist/migrations/
+-- MigrationsApplication          Spring Boot entry (web-application-type: none)
+-- MigrationsJobRunner            CommandLineRunner: parse mode, orchestrate passes, set exit code
+-- SchemaAdmin                    create extensions / schemas (admin JDBC, non-transactional)
+-- FlywayRunner                   build a Flyway instance per schema + run (schemas, search_path, locations)
+-- TenantSchemaEnumerator         list t_<tenantId> schemas from information_schema
+-- RangeRegistry                  read/validate migration_range_registry (reserved-block guard)
```

`src/main/resources/db/migration/` holds MIG's **own** baseline (`V0001–V0009`). The other
modules' scripts are collected into the central migration locations per the reconciliation
in ADR-003 (not duplicated here as prose).

## Cross-cutting Concerns

- **Security.** MIG needs a **privileged** datasource (DDL, `CREATE SCHEMA`/`EXTENSION`),
  stronger than any business service's runtime role — kept out of the services, used only by
  this job, injected via env/secret, never committed. Internal-network-only posture
  (inherited). No public surface.
- **Multi-tenancy.** The reason MIG exists: schema-per-tenant (`../../adr/ADR-003-multi-tenancy.md`).
  MIG materialises `neuroassist_global` + each `t_<tenantId>` and keeps them on one version.
  Tenant context here is a **schema name**, never a request header/JWT (there is no request).
- **Observability.** Success is a job exit code + structured log per schema (`schema`,
  `fromVersion`, `toVersion`, `status`) and the per-schema `flyway_schema_history`. As an
  init/batch unit it must have **`restart: "no"`** — an auto-restart would mask a failing
  migration (Learning pitfall).
- **Idempotency / safety.** Re-running is a no-op; applied scripts are immutable (checksum);
  DDL admin calls never share a `@Transactional` scope with a Flyway call (ADR-002/ADR-005).
