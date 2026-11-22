# Plan — MIG (neuroassist-niv-migrations)

## Status das prioridades
- P1 -- pendente
- P2 -- pendente
- P3 -- pendente
- P4 -- pendente
- P5 -- pendente
- P7 -- pendente
- P8 -- pendente
- P9 -- pendente

## 0. Leitura executiva

### Papel do serviço (extraído de 01-architectural-vision.md)

MIG is the **single owner of schema evolution** for NeuroAssist NIV. It is the one process that runs Flyway across the whole database surface: the shared `neuroassist_global` schema and every per-tenant `t_<tenantId>` schema. Business services author their DDL but never migrate themselves (`spring.flyway.enabled: false` in every service, verified on disk). MIG turns authored DDL into an applied, versioned, auditable state in one deterministic pass.

MIG is a **Spring Boot non-web CommandLineRunner** (ADR-002): no HTTP port, no Eureka client, no broker, no PHI. Its "API" is the CLI run mode + exit code that ops/CI gateables.

### MVP scope (extraído de 01)

- Spring Boot one-shot runner job (`MigrationsJobRunner`, `CommandLineRunner`) driving Flyway programmatically per schema, then exits.
- Baseline block `V0001–V0009`: extensions + `neuroassist_global` + `uuid_generate_v7()` + `migration_range_registry` + tenant-template baseline.
- Global pass: apply `-- schema: global` migrations to `neuroassist_global`.
- Tenant pass: enumerate `t_*` schemas and apply `-- schema: tenant` template migrations.
- Tenant provisioning: `CREATE SCHEMA t_<tenantId>` (outside transaction) + bring to current version.
- Forward-only, checksum-validated application; per-schema failure isolation + report.
- Authoritative version-range registry (`migration_range_registry`) closing PAT G1.

### Diagnóstico inicial (gaps mapeados em 06)

| Gap | Status | Resolution |
|---|---|---|
| G1 — EVNT/GEST/HIST blocks unnumbered on disk | INT-MIG-005..007 (propose → confirm) | confirmed=FALSE in V0004 seed; confirmed when module delivers scripts |
| G2 — Central migration-location mechanics | MIG-012 | Build-time Gradle aggregation into db/migration/{global,tenant} |
| G3 — Tenant enumeration source | Deferred (not blocking MVP) | MVP: information_schema; canonical registry deferred |
| G4 — Repeatable-migration policy | Deferred (open) | R__ migrations allowed for reseeds; policy deferred to ops |
| G5 — uuid_generate_v7() provenance | MIG-008 (RESOLVED) | PL/pgSQL implementation in V0002 baseline |

---

## 1. Estratégia geral

### Objetivo macro

Deliver a fully operational centralized Flyway migrator that: (1) installs the baseline on a fresh DB; (2) applies all 9 modules' reserved-block scripts in one deterministic pass; (3) provisions new tenants on demand; (4) fails hard and visibly on any error (exit 2 naming the failing schema); (5) is gated by CI so no service silently re-enables Flyway.

### Ordem das prioridades

| P | Título | Motivo |
|---|---|---|
| P1 | Runner bootstrap + argument validation | No code can be written without the module existing; argument parsing is the entry point for all other behavior |
| P2 | Core orchestration (SchemaAdmin + FlywayRunner + orchestrator) | The runner is useless without its core; baseline block wires into orchestration |
| P3 | Baseline block V0001–V0005 SQL scripts | Foundation for all integration tests; every module's DDL depends on these scripts existing |
| P4 | Script aggregation + tenant enumeration + schema creation | Completes the full execution path for --all and --provision-tenant |
| P5 | RangeRegistry guard | Closes INV-MIG-2 before BDD tests exercise the full flow |
| P7 | Per-schema progress reporting | Operational visibility: ops needs the report to confirm runs |
| P8 | BDD end-to-end (Testcontainers) | Proves all invariants INV-MIG-1..6; requires P1-P5 complete |
| P9 | CI gate + Dockerfile + runbook | Hardening: prevents regressions; makes the job deployable |

---

## 2. Plano por prioridade

### Prioridade 1 — Runner bootstrap + argument validation
Status: pendente

#### Objetivo / Resultado esperado
A compiling, bootable non-web Spring Boot module that exits 1 on no-argument invocation without touching any database schema.

#### Issues vinculadas
- MIG-001 (Gradle module + application.yml)
- MIG-002 (MigrationMode enum + argument parser)
- MIG-003 (MigrationsJobRunner skeleton + exit code dispatch)

#### Specs cobertas
- SPEC-01

#### Sequência de execução
- Fase 1: MIG-001 (create module) → Fase 2: MIG-002 (parse args) → Fase 3: MIG-003 (wire runner)

#### Critérios de aceite
- `./gradlew :services:neuroassist-niv-migrations:compileJava` exits 0
- `spring.main.web-application-type: none` and `spring.flyway.enabled: false` in application.yml
- No-arg invocation exits 1

#### Riscos
- None at this stage; this is infrastructure scaffolding

#### Instrução para implementador
Create the Gradle subproject, entry-point, and application.yml first. Then implement MigrationMode enum + MigrationArgParser. Finally wire MigrationsJobRunner. All three issues can be executed in a single developer session. Verify with `./gradlew :services:neuroassist-niv-migrations:test` before closing P1.

---

### Prioridade 2 — Core orchestration (SchemaAdmin + FlywayRunner + orchestrator)
Status: pendente

#### Objetivo / Resultado esperado
SchemaAdmin runs DDL outside transactions; FlywayRunner builds per-schema Flyway instances; MigrationsJobRunner orchestrates baseline → global pass → tenant pass with correct abort policy.

#### Issues vinculadas
- MIG-004 (SchemaAdmin)
- MIG-005 (FlywayRunner)
- MIG-006 (MigrationsJobRunner orchestration)

#### Specs cobertas
- SPEC-02, SPEC-03

#### Sequência de execução
- MIG-004 → MIG-005 → MIG-006 (sequential; each depends on the previous)

#### Critérios de aceite
- SchemaAdmin creates extensions + global schema outside @Transactional
- FlywayRunner builds per-schema Flyway with correct locations and search_path
- --all applies global first, then each tenant; global failure aborts all tenants

#### Riscos
- R5 (deadlock: CREATE SCHEMA inside @Transactional) — mitigated by INV-MIG-6; SchemaAdmin must NOT be annotated @Transactional

#### Instrução para implementador
Implement in order: SchemaAdmin → FlywayRunner → orchestrator. The P3 baseline SQL scripts can be developed in parallel. MIG-005 integration tests require the baseline scripts (MIG-007..MIG-011) to exist on the test classpath.

---

### Prioridade 3 — Baseline block V0001–V0005 SQL scripts
Status: pendente

#### Objetivo / Resultado esperado
Five SQL scripts that install the full baseline on a fresh PostgreSQL: extensions, neuroassist_global, uuid_generate_v7(), migration_range_registry DDL, seed of all 9 blocks, tenant-template baseline.

#### Issues vinculadas
- MIG-007 (V0001 extensions + global schema)
- MIG-008 (V0002 uuid_generate_v7)
- MIG-009 (V0003 migration_range_registry DDL)
- MIG-010 (V0004 seed of all 9 blocks)
- MIG-011 (V0005 tenant-template baseline)

#### Specs cobertas
- SPEC-04

#### Sequência de execução
- Scripts must be created in version order: V0001 → V0002 (depends on pgcrypto from V0001) → V0003 → V0004 (depends on table from V0003) → V0005

#### Critérios de aceite
- After V0001-V0005 on fresh DB: neuroassist_global exists, 4 extensions installed, uuid_generate_v7() works, migration_range_registry has 9 rows, t_unitA can be commented
- Scripts are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)

#### Riscos
- G5 (uuid_generate_v7 not a native Postgres function) — RESOLVED in V0002 via PL/pgSQL
- Learning pitfall: table naming collision — RESOLVED: table is `migration_range_registry` (prefixed), not a generic name

#### Instrução para implementador
DDL is specified verbatim in `contracts/data-model.md`. Copy the SQL blocks exactly, adding `-- schema: global` or `-- schema: tenant` as the first line. Place global scripts in `src/main/resources/db/migration/global/` and tenant scripts in `src/main/resources/db/migration/tenant/`. Do NOT edit after first commit (checksum immutability, INV-MIG-3).

---

### Prioridade 4 — Script aggregation + tenant enumeration + schema creation
Status: pendente

#### Objetivo / Resultado esperado
Gradle aggregation task collects per-service reserved-block scripts into MIG classpath locations (resolves G2). TenantSchemaEnumerator lists t_* from information_schema. SchemaAdmin.createSchemaIfAbsent() enables --provision-tenant.

#### Issues vinculadas
- MIG-012 (Gradle aggregation task)
- MIG-013 (TenantSchemaEnumerator)
- MIG-014 (createSchemaIfAbsent)

#### Specs cobertas
- SPEC-03, SPEC-10

#### Sequência de execução
- MIG-013 and MIG-014 are independent; MIG-012 depends on INT-MIG-001..INT-MIG-008 for full verification but can be built against the baseline scripts alone first.

#### Critérios de aceite
- Gradle aggregation task collects global + tenant scripts from each service, excluding V1__*.sql
- TenantSchemaEnumerator lists t_unitA and t_unitB; zero tenants is not an error
- createSchemaIfAbsent is idempotent and non-transactional

#### Riscos
- INT-MIG-001..INT-MIG-008 upstream: if services have not delivered their reserved-block scripts the aggregation task has no input to collect. Build the task to handle missing inputs gracefully (warn, do not fail).

#### Instrução para implementador
MIG-013 and MIG-014 can be implemented in the same session as P2. MIG-012 should be validated once at least one upstream service (ACS) delivers its reserved-block scripts.

---

### Prioridade 5 — RangeRegistry guard
Status: pendente

#### Objetivo / Resultado esperado
RangeRegistry.java runs after the baseline, reads migration_range_registry, and fails exit 2 on any overlapping confirmed blocks before any module DDL is applied.

#### Issues vinculadas
- MIG-015 (RangeRegistry guard)

#### Specs cobertas
- SPEC-04 (INV-MIG-2)

#### Sequência de execução
- MIG-015 depends on MIG-010 (V0004 seed must exist for the guard to read)

#### Critérios de aceite
- 9 seed rows with 5 confirmed: guard passes
- Injected overlapping confirmed block: guard throws, exit 2 before any module script runs
- confirmed=FALSE rows excluded from check

#### Riscos
- R1 (block collision between MIG V0001-V0009 and TRN proposal V0080-V0089) — the +10-gap convention means no overlap in the seed; guard catches any future mistake

#### Instrução para implementador
Implement RangeRegistry as a plain Java class (no Spring dependency needed). Inject JdbcTemplate. Test with unit tests first; wire into MigrationsJobRunner in the same PR.

---

### Prioridade 7 — Per-schema progress reporting + structured logs
Status: pendente

#### Objetivo / Resultado esperado
MigrationReport value class captures per-schema outcomes; MigrationsJobRunner logs one line per schema + a final summary. The log line is the operational "migrations applied" signal.

#### Issues vinculadas
- MIG-016 (MigrationReport + structured logs)

#### Specs cobertas
- SPEC-07

#### Sequência de execução
- MIG-016 depends on MIG-006 (orchestration framework)

#### Critérios de aceite
- One log line per schema (OK / FAILED / SKIPPED)
- Global failure → ERROR; tenants → SKIPPED
- Final summary line at INFO

#### Riscos
- None at this stage

#### Instrução para implementador
MigrationReport is a simple value class. Add logging calls to MigrationsJobRunner.run() after the orchestrator returns. MDC is not applicable (no HTTP request context); use direct Logger calls.

---

### Prioridade 8 — BDD end-to-end (Testcontainers)
Status: pendente

#### Objetivo / Resultado esperado
Four Cucumber feature files with Testcontainers PostgreSQL covering all behavioral invariants (INV-MIG-1..6): orchestration, provisioning, forward-only/checksum, and range-registry guard.

#### Issues vinculadas
- MIG-017 (Testcontainers + Cucumber wiring)
- MIG-018 (global-and-tenant-migration.feature)
- MIG-019 (tenant-provisioning.feature)
- MIG-020 (forward-only-and-checksum.feature)
- MIG-021 (range-registry-guard.feature)

#### Specs cobertas
- SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-07, SPEC-08

#### Sequência de execução
- MIG-017 (wire-up) → MIG-018..MIG-021 (feature files, any order after wire-up)

#### Critérios de aceite
- `./gradlew :services:neuroassist-niv-migrations:cucumber` exits 0
- All 4 feature files pass; all behavioral invariants proved

#### Riscos
- Testcontainers requires Docker to be running in CI; ensure CI has Docker available

#### Instrução para implementador
Implement MIG-017 first; verify the Cucumber wire-up with a trivial scenario before writing the actual step definitions. Use shared steps for Given/Then clauses that appear in multiple features (see SPEC-08 §Steps reutilizáveis).

---

### Prioridade 9 — CI gate + Dockerfile + runbook
Status: pendente

#### Objetivo / Resultado esperado
CI gate prevents regressions (services re-enabling Flyway, V1 flat scripts leaking in). Dockerfile makes the job deployable. Runbook verification confirms setup-local.md is accurate.

#### Issues vinculadas
- MIG-022 (CI gate)
- MIG-023 (Dockerfile + docker-compose init service with restart:no)
- MIG-024 (runbook verification)

#### Specs cobertas
- SPEC-07, SPEC-10

#### Sequência de execução
- MIG-022 → MIG-023 → MIG-024 (independent, can run in parallel)

#### Critérios de aceite
- CI gate fails if any service sets spring.flyway.enabled: true or V1__*.sql appears in MIG locations
- Dockerfile produces a runnable image; docker-compose service uses restart:no
- All runbook commands verified against the implemented runner

#### Riscos
- R7 (auto-restart masks failures) — mitigated by restart:no in docker-compose

#### Instrução para implementador
MIG-022 is the highest-value issue in P9 for long-term correctness. Implement it first. MIG-023 and MIG-024 can be done in any order after MIG-022.

---

## 3. Dependências externas

| Module | Obligation | Tracking |
|---|---|---|
| ACS | Deliver V0010-V0012 scripts with `-- schema:` annotations | INT-MIG-001 |
| PAT | Deliver V0020-V0022 scripts with `-- schema:` annotations | INT-MIG-002 |
| EDGE | Deliver V0030-V0032 scripts with `-- schema:` annotations | INT-MIG-003 |
| CONV | Deliver V0070-V0077 scripts with `-- schema:` annotations | INT-MIG-004 |
| EVNT | Confirm V0040-V0049 + deliver scripts + set confirmed=TRUE | INT-MIG-005 |
| GEST | Confirm V0050-V0059 + deliver scripts + set confirmed=TRUE | INT-MIG-006 |
| HIST | Confirm V0060-V0069 + deliver scripts + set confirmed=TRUE | INT-MIG-007 |
| TRN | Confirm V0080-V0089 + deliver scripts (blocked on TRN backlog) | INT-MIG-008 |
| PostgreSQL | Admin-capable datasource (CREATE SCHEMA, CREATE EXTENSION) | A1 (assumption) |

---

## 4. Restrições arquiteturais (Java)

- **ArchUnit:** hexagonal layering applies only nominally to MIG (there is no domain aggregate or hexagonal layering in the DDD sense — MIG is infrastructure, 01-architectural-vision.md §Principles). No ArchUnit RULE-01..08 enforcement required. The only architectural boundary is: `SchemaAdmin` and `FlywayRunner` must NOT be called from within a `@Transactional` scope (INV-MIG-6).
- **Spring Boot non-web:** `spring.main.web-application-type=none`, no `server.port`, no Eureka registration.
- **Flyway programmatic:** `spring.flyway.enabled=false`; Flyway is invoked via `Flyway.configure()...load().migrate()` per schema, never via Spring auto-configuration.
- **Exit code:** `System.exit(0/1/2)` from `MigrationsJobRunner.run()`; no `SpringApplication.exit()` needed.
- **No @Transactional on SchemaAdmin DDL:** `CREATE SCHEMA` and `CREATE EXTENSION` are auto-committed by PostgreSQL; wrapping them in a transaction causes a deadlock with Flyway's own JDBC connection (INV-MIG-6, R5).
- **No business domain:** no JPA entities, no Spring Data repositories, no hexagonal domain model — MIG is a migration runner, not a business service. Java ADR for hexagonal architecture (project-level `docs/architecture/backend/adr/ADR-*-hexagonal-architecture.md`) applies only to business services.

---

## 5. Referências

- `docs/architecture/backend/services/neuroassist-niv-migrations/01-architectural-vision.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/02-architecture-blueprint.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/03-initial-domain-framing.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/04-backend-architecture-direction.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/05-persistence-model.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/06-risks-gaps-assumptions.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/adr/ADR-001-service-boundary-migrator-only.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/adr/ADR-002-execution-model-runner-job.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/adr/ADR-003-central-source-of-truth-and-v1-reconciliation.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/adr/ADR-004-version-range-registry-and-baseline-block.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/adr/ADR-005-failure-rollback-forward-only-checksum.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/contracts/api-contract.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/contracts/data-model.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/contracts/event-contracts.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/contracts/integration-contracts.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/setup-local.md`
- `docs/architecture/backend/services/neuroassist-niv-migrations/runbook.md`
