<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Service: `neuroassist-niv-migrations` · Module **MIG (Centralized Flyway)** · `backend_language = java` · Infrastructure.

## Stack

- **Java 21 / Spring Boot** as a **non-web** application (`spring.main.web-application-type:
  none`) — Spring is used only for boot, config binding and the `CommandLineRunner`
  lifecycle; **no `server.port`, no embedded web server**.
- **Flyway** (`flyway-core`) driven **programmatically per schema**, not via the Spring Boot
  auto-configured runner (that single-datasource runner cannot iterate N tenant schemas).
  `spring.flyway.enabled: false` so Boot does not run it once at startup against the default
  schema.
- **PostgreSQL** driver (`org.postgresql:postgresql`) over one **admin-capable** datasource.
- **Gradle (Kotlin DSL)**, standard service build. **No** `spring-cloud-starter-netflix-eureka-client`
  (MIG is not a Eureka client), **no** messaging starter, **no** web starter.

## Service Boundary

**Single standalone service** (ADR-001). MIG is one deployable job that owns the entire
migration surface; it is not decomposed and is not folded into another service. It exposes
no business API and holds no business state. Its boundary is "create and version every schema";
everything else (the DDL content, tenant onboarding policy, runtime traffic) is outside it.

## Package Organization

MIG is **not hexagonally layered** — there is no domain/application/adapter split because
there is no aggregate. The shared hexagonal ADR
(`../../adr/ADR-001-hexagonal-architecture.md`) governs the *business* services and applies
to MIG only nominally. MIG uses a flat, job-shaped `com.neuroassist.migrations` package:

```
src/main/java/com/neuroassist/migrations/
+-- MigrationsApplication.java      Spring Boot entry (web-application-type = none)
+-- MigrationsJobRunner.java        CommandLineRunner: parse run mode, orchestrate passes, exit code
+-- SchemaAdmin.java                CREATE EXTENSION / CREATE SCHEMA via admin JDBC (non-transactional)
+-- FlywayRunner.java               build + run a Flyway instance per schema (schemas, placeholders, locations)
+-- TenantSchemaEnumerator.java     list t_<tenantId> from information_schema
+-- RangeRegistry.java              read/validate migration_range_registry (reserved-block guard)
+-- MigrationMode.java              enum: ALL | GLOBAL_ONLY | TENANT | PROVISION_TENANT
src/main/resources/
+-- application.yml                 datasource, flyway.enabled=false, web-application-type=none
+-- db/migration/                   MIG baseline V0001..V0009 (+ central locations per ADR-003)
```

The dependency rule is trivially satisfied (no domain to invert); the discipline that matters
here is operational (non-transactional DDL, forward-only, checksum), captured as ADRs 002/005.

## Hub Service Dependencies

**None at runtime.** NeuroAssist has no TechLab AI "hub" dependency for this module, and MIG
makes no outbound REST call. Its only relationship with the business services is **offline**:
it applies the `V00xx` scripts they author. It coordinates versioning with them through the
`migration_range_registry`, not through any service call.

## External Integrations

- **PostgreSQL** — the single integration: one admin datasource (DDL + `CREATE
  SCHEMA`/`EXTENSION`) and per-schema Flyway connections. This is the only credential MIG
  holds and it is more privileged than any business runtime role, so it lives only in the
  MIG job, never in a service.
- **No Eureka, no broker, no HTTP clients, no blob storage, no TechLab AI.** MIG is a closed
  job against one database.

## Async vs Sync Decisions (high level)

- **Entirely synchronous and batch.** MIG runs the passes sequentially and blocks until done;
  there is no async work, no event, no callback. Messaging is disabled project-wide and MIG
  publishes/consumes nothing.
- **Per-schema isolation, sequential application.** Schemas are migrated one at a time; a
  failure on one schema is reported and fails the run (ADR-005) rather than being retried
  asynchronously. The global pass precedes the tenant pass (tenant DDL may reference global
  catalogues / extensions).
- **No HTTP, no scheduler inside MIG.** Invocation cadence (first start, deploy, provisioning)
  is owned by platform-ops / the deployment system, not by an in-process scheduler.
