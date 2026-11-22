# MIG — API Contract (CLI / Runner Surface)

> MIG exposes **no HTTP API and no business REST resource**. It is a non-web Spring
> Boot `CommandLineRunner` (ADR-002) with **no `server.port`** and
> `spring.main.web-application-type: none`. Its "API surface" is therefore the
> **command-line runner contract**: the run modes, their arguments, the argument
> validation, the environment it reads, and the **exit codes** that make it a
> gateable ops/CI step. This file is the authoritative behavioral contract for that
> surface.
>
> EARS invariants per `adr/ADR-002-execution-model-runner-job.md` and
> `adr/ADR-005-failure-rollback-forward-only-checksum.md`. Guide:
> `docs/architecture/backend/standards/ears-notation.md`. Operational invariants
> `INV-MIG-1..7` are declared in `03-initial-domain-framing.md` and cited here.

## 1. Nature of the surface

The runner is invoked by **platform-ops** (first fleet start, each deploy, tenant
provisioning — A5) via `java -jar neuroassist-niv-migrations.jar <mode> [arg]` or
`./gradlew :services:neuroassist-niv-migrations:bootRun --args="<mode> [arg]"`. It
parses **one** run mode, validates arguments, runs the pass(es) synchronously, and
**exits**. There is no daemon, no scheduler, no open socket.

`THE SYSTEM SHALL run as a one-shot command-line job and exit after the requested pass completes.`
`THE SYSTEM SHALL expose no HTTP endpoint, no server port, and no business REST resource.`
`THE SYSTEM SHALL accept exactly one run mode per invocation.`

## 2. Run modes

`<tenantId>` is a tenant identifier; the schema name is derived identically at every
point as `t_<tenantId>` (INV-MIG — A4 / R8). Order within a run: **baseline →
global pass → tenant pass**.

| Mode | Argument | Behavior |
|---|---|---|
| `--all` | — | baseline (if absent) → apply global block set to `neuroassist_global` → enumerate existing `t_*` and apply the tenant-template set to **each**. The default production mode. |
| `--global-only` | — | baseline (if absent) → apply the global block set to `neuroassist_global` only; **no** tenant pass. |
| `--tenant <tenantId>` | required | apply the tenant-template set to an **already-existing** `t_<tenantId>` only (no global pass, no schema creation). |
| `--provision-tenant <tenantId>` | required | create `t_<tenantId>` (outside any transaction — INV-MIG-6) if absent, then bring it to the current version from the tenant-template set. |

`WHEN invoked with --all, THE SYSTEM SHALL apply the global block set to neuroassist_global and then the tenant-template set to every existing t_<tenantId> schema.`
`WHEN invoked with --global-only, THE SYSTEM SHALL apply the global block set to neuroassist_global and SHALL NOT touch any tenant schema.`
`WHEN invoked with --tenant <tenantId> and t_<tenantId> exists, THE SYSTEM SHALL apply the tenant-template set to that schema only.`
`WHEN invoked with --provision-tenant <tenantId>, THE SYSTEM SHALL create t_<tenantId> outside any transactional scope and then migrate it to the current version.`
`WHILE running any mode that reaches a tenant schema, THE SYSTEM SHALL keep neuroassist_global on the connection search_path (INV-MIG-5).`

## 3. Argument validation (fail fast, before any DDL)

`IF no run mode is supplied, THEN THE SYSTEM SHALL print usage and exit non-zero without touching any schema.`
`IF more than one run mode is supplied, THEN THE SYSTEM SHALL reject the invocation and exit non-zero without touching any schema.`
`IF --tenant or --provision-tenant is supplied without a <tenantId>, THEN THE SYSTEM SHALL reject the invocation and exit non-zero.`
`IF a supplied <tenantId> does not match the tenant-id format (producing a valid t_<tenantId> schema name), THEN THE SYSTEM SHALL reject it and exit non-zero.`
`IF --tenant <tenantId> is supplied and t_<tenantId> does not exist, THEN THE SYSTEM SHALL fail with a clear message and exit non-zero (use --provision-tenant to create it).`
`IF --provision-tenant <tenantId> is supplied and t_<tenantId> already exists, THEN THE SYSTEM SHALL skip creation and only migrate it to the current version (idempotent).`

## 4. Baseline guarantee

Every mode that writes to a schema first ensures the baseline is present. The
baseline is MIG's own block `V0001–V0009` (ADR-004) — required extensions, the
`neuroassist_global` schema, `uuid_generate_v7()`, `migration_range_registry`, and
the tenant-template baseline. See `contracts/data-model.md`.

`WHEN any write mode runs and the required extensions or neuroassist_global are absent, THE SYSTEM SHALL create them (baseline block) before applying any module block.`
`THE SYSTEM SHALL install required extensions once in neuroassist_global (INV-MIG-5).`

## 5. Exit codes (the gateable contract)

| Code | Meaning |
|---|---|
| `0` | All requested schemas are at their target version (including the no-op case). |
| `1` | Argument / usage error — nothing was applied. |
| `2` | A migration or DDL step failed; the message names the **failing schema**; the run is aborted. |

`WHEN every requested schema reaches its target version, THE SYSTEM SHALL exit 0.`
`WHEN a run finds every schema already at its target version, THE SYSTEM SHALL exit 0 (no-op, re-runnable).`
`IF applying a schema fails, THEN THE SYSTEM SHALL abort the run, name the failing schema in the message, and exit non-zero (INV-MIG — ADR-005).`
`IF the global pass fails, THEN THE SYSTEM SHALL NOT touch any tenant schema and SHALL exit non-zero.`
`THE SYSTEM SHALL NOT swallow or retry a per-schema failure (no auto-restart — deploy with restart:"no", doc 06 R7).`

## 6. Environment / configuration inputs

All configuration is environment-bound (12-factor); there is no request body. See
`setup-local.md` for the full table and `contracts/integration-contracts.md` for the
datasource privileges.

| Var | Purpose |
|---|---|
| `SPRING_DATASOURCE_URL` | admin-capable PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | admin credential (`CREATE SCHEMA` / `CREATE EXTENSION`) |
| `MIG_GLOBAL_SCHEMA` | global schema name (default `neuroassist_global`) |
| `MIG_TENANT_SCHEMA_PREFIX` | tenant schema prefix (default `t_`) |

`THE SYSTEM SHALL read its datasource and schema names from the environment, not from any request.`
`THE SYSTEM SHALL require an admin-capable datasource able to CREATE SCHEMA and CREATE EXTENSION (A1).`

## 7. What this surface is NOT

`THE SYSTEM SHALL NOT authenticate or authorize any caller (invocation trust is the ops shell / deploy system).`
`THE SYSTEM SHALL NOT register with Eureka or expose a discovery footprint (ADR-002).`
`THE SYSTEM SHALL NOT own, read, or serve any business or PHI data (SPEC-06).`
