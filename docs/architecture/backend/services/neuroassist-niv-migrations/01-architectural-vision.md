<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope (in)
- Out of Scope (MVP)
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Service: `neuroassist-niv-migrations` · Module **MIG — Migrations (Centralized Flyway, all schemas)** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · Flyway · PostgreSQL · Gradle (Kotlin DSL) · **Infrastructure service** · No UI · No HTTP API · No tenant schema of its own · Messaging disabled.

## Intent

MIG is the **single owner of schema evolution** for NeuroAssist NIV. It is the one process
that runs Flyway, and it runs it across the **whole** database surface: the shared
`neuroassist_global` schema and **every** per-tenant `t_<tenantId>` schema. Business
services author their DDL but never migrate themselves (`spring.flyway.enabled: false` in
every service — verified on disk); MIG turns that authored DDL into an applied, versioned,
auditable state in one deterministic pass.

## Problem Statement

The project is **schema-per-tenant** (`arch/decisions/multi-tenancy.arch.json`): a global
schema for shared catalogues and one isolated schema per care unit. That model is explicit
about its cost — *"migrations applied N+1 times (1 global + N per tenant)"* and *"all `t_*`
schemas must be on the same migration version; the migrations service is the single source
of truth."* Three concrete risks follow without a central migrator:

1. **No one creates the schemas.** Extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`,
   `unaccent`) and `neuroassist_global` must exist before any service DDL runs; `t_<tenantId>`
   must be created at tenant onboarding. No business service does this.
2. **Version drift / collisions.** Eight services author scripts independently. Each
   scaffolded service even ships a flat `V1__create_initial_schema.sql`; naively pooled they
   collide (every service has a "V1"). Reserved blocks (ACS `V0010–V0012`, PAT `V0020–V0022`,
   EDGE `V0030–V0032`, CONV `V0070–V0079`, TRN proposes `V0080–V0089`) exist only as prose in
   each doc, with **no authoritative registry** (PAT's open gap **G1**).
3. **Partial / inconsistent application.** Applying global but missing a tenant, or getting
   tenants onto different versions, is exactly the drift the schema-per-tenant ADR warns
   about.

MIG exists to remove all three: own the baseline, own the registry, and apply the full set
atomically-per-schema with a clear pass/fail.

## Personas

- **Platform / ops operator** — the only human actor. Runs MIG before the first fleet start,
  on every deploy that carries DDL, and at new-tenant provisioning; owns the admin datasource
  wiring. Reads the job's exit code and log/`flyway_schema_history` to confirm success.
- **Business services (indirect)** — ACS, PAT, EDGE, EVNT, GEST, HIST, CONV, TRN. They
  *author* migration scripts and *depend on* the schema MIG produces being present and
  on-version; they never call MIG at runtime.
- **No end-user, no patient, no caregiver** — MIG handles **no PHI** and exposes no surface
  a person interacts with.

## MVP Scope (in)

- A **Spring Boot one-shot runner job** (`MigrationsJobRunner`, `CommandLineRunner`) that
  drives Flyway **programmatically per schema** and then **exits** (non-zero on any failure).
- **Baseline block `V0001–V0009`** owned by MIG: required extensions + `neuroassist_global`
  + `uuid_generate_v7()` + the `migration_range_registry` table + the per-tenant template
  baseline.
- **Global pass:** apply `-- schema: global` migrations to `neuroassist_global`.
- **Tenant pass:** enumerate existing `t_<tenantId>` schemas and apply the
  `-- schema: tenant` template migrations to each, to the same target version.
- **Tenant provisioning:** given an explicit tenant id, `CREATE SCHEMA t_<tenantId>`
  (outside any transaction — see ADR-002) and bring it to the current version.
- **Authoritative version-range registry** (`migration_range_registry`) recording every
  module's reserved block (closes PAT **G1**).
- **Forward-only, checksum-validated** application; per-schema failure isolation + report.
- Run modes: `--all` (default), `--global-only`, `--tenant <id>`, `--provision-tenant <id>`.

## Out of Scope (MVP)

- Any business domain, entity, REST endpoint or PHI.
- **Owning other modules' DDL** — each service authors its own scripts; MIG only applies them.
- An **HTTP / management API** — MIG is a batch job, not a running service (no port, no Eureka).
- **Automated rollback / undo migrations** — forward-only (ADR-005); a mistake is fixed by a
  new forward migration, never by editing an applied file.
- **Online / zero-downtime** schema-change orchestration and blue/green cutovers.
- **Dynamic tenant discovery** beyond "iterate `t_*` / accept an explicit id" — the SaaS
  onboarding workflow is platform-ops', not MIG's.
- Cross-tenant data migration / ETL; backup/restore (per-tenant dump/restore is an ops task
  the schema-per-tenant model enables, not a MIG responsibility).

## Architectural Principles

- **Single source of truth for schema state.** One runner, one registry; no service migrates
  itself. All `t_*` schemas converge to the same version.
- **Schema-routing by annotation.** The first line of every DDL block (`-- schema: global` or
  `-- schema: tenant`, per `persistence.arch.json`) decides where it is applied — global
  scripts to `neuroassist_global`, tenant scripts to each `t_<tenantId>`.
- **Forward-only & immutable history.** Applied scripts are never edited (Flyway checksums
  cover the whole file); corrections ship as the next version. `outOfOrder = false`.
- **Idempotent, repeatable runs.** Re-running MIG on an up-to-date database is a no-op;
  reseeds that must re-run use repeatable (`R__`) migrations.
- **No runtime coupling.** MIG talks only to PostgreSQL. No broker, no Eureka, no outbound
  REST — it coordinates with modules solely through the shared DB and the registry.
- **Infrastructure, not domain.** No hexagonal domain layering (there is no aggregate);
  shared `../../adr/ADR-001-hexagonal-architecture.md` applies only nominally.

## Success Signals

- A single MIG run on a fresh database leaves `neuroassist_global` **and every** `t_<tenantId>`
  on the same, current Flyway version, with extensions installed and `migration_range_registry`
  populated.
- `--provision-tenant <id>` creates `t_<id>` and brings it to the current version with no
  manual SQL.
- Editing an already-applied `V*.sql` fails the run fast (checksum mismatch) instead of
  silently drifting — and the fix is a new forward migration.
- No reserved-block collision survives: every module's block is reconciled against
  `migration_range_registry` before its migration issues are emitted.
- The job exits **non-zero** on any per-schema failure and names the failing schema/version.
