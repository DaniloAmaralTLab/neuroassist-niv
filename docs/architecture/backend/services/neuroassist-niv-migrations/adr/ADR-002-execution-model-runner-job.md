<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-002 — Execution model: Spring Boot one-shot runner job, no HTTP port, not a Eureka client

## Status
aceita

> Note: orchestrator default (recommendation) - revisable by the owner.

## Contexto

Given a dedicated migrator (ADR-001), *how* should it run? Options:

- **(a) Spring Boot auto-configured Flyway** against a single datasource — simplest, but it
  migrates exactly one schema at startup and cannot iterate N `t_<tenantId>` schemas.
- **(b) Flyway Gradle plugin / Flyway CLI** invoked from CI/ops — works, but puts the
  multi-schema loop, tenant enumeration and the range-registry logic in shell/CI rather than
  in tested Java, and has no clean place for the baseline (`CREATE SCHEMA`/`EXTENSION`).
- **(c) Spring Boot non-web `CommandLineRunner`** that drives Flyway **programmatically**,
  once per schema, then exits.

Two constraints from the Learning layer bear on this: creating/dropping a schema inside the
same `@Transactional` scope as a Flyway call (own connection) **deadlocks**; and an init
container with an auto-restart policy **masks** a failed migration.

## Decisão

MIG runs as **option (c): a non-web Spring Boot `CommandLineRunner`** (`MigrationsJobRunner`):

- `spring.main.web-application-type: none`, **no `server.port`**, no embedded web server, no
  business endpoints.
- **Not a Eureka client** — no `spring-cloud-starter-netflix-eureka-client`, no `eureka.*`
  config. MIG runs and exits, so it never registers; REG's clients are the business services
  and the gateway only.
- `spring.flyway.enabled: false` so Boot does not auto-run Flyway once against the default
  schema; MIG builds and runs a **Flyway instance per schema** (`FlywayRunner`) with the right
  `schemas`/`search_path`/locations.
- `SchemaAdmin` performs `CREATE EXTENSION` / `CREATE SCHEMA` via plain admin JDBC **outside
  any `@Transactional` scope**, before any Flyway call (avoids the cross-connection deadlock).
- The job parses a **run mode** (`--all` | `--global-only` | `--tenant <id>` |
  `--provision-tenant <id>`), validates arguments **before** executing, runs the pass(es), and
  **exits** — `0` on full success, **non-zero** naming the failing schema otherwise.
- Deployed as an **init/batch unit with `restart: "no"`** so a failure is visible, not retried.

## Consequências

- **Positive:** the multi-schema loop, tenant enumeration, baseline and registry logic live in
  tested Java, not CI shell; one artifact does provisioning and migration.
- **Positive:** no open port, no discovery footprint, minimal attack surface; honest exit code
  for CI/ops gating.
- **Negative / trade-off:** MIG reimplements the per-schema Flyway driving that Spring Boot's
  auto-runner would give for a single schema. Accepted — the auto-runner cannot serve
  schema-per-tenant. Revisit only if a managed multi-tenant migration runner is adopted.
