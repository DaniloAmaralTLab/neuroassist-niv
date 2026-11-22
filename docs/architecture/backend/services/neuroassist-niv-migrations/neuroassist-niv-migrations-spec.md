---
module: MIG
service: neuroassist-niv-migrations
package: com.neuroassist.migrations
bounded_context: migrations
classification: infrastructure
hasUi: false
isInfrastructure: true
hasHttpApi: false
persistence: owns-one-table
messaging: none
stage: specs
generatedBy: /be-architect-specs
sourceVision:
  - _brief.md
  - 01-architectural-vision.md
  - 02-architecture-blueprint.md
  - 03-initial-domain-framing.md
  - 04-backend-architecture-direction.md
  - 05-persistence-model.md
  - 06-risks-gaps-assumptions.md
adrRefs:
  - adr/ADR-001-service-boundary-migrator-only.md
  - adr/ADR-002-execution-model-runner-job.md
  - adr/ADR-003-central-source-of-truth-and-v1-reconciliation.md
  - adr/ADR-004-version-range-registry-and-baseline-block.md
  - adr/ADR-005-failure-rollback-forward-only-checksum.md
  - ../../adr/ADR-001-hexagonal-architecture.md (project-wide hexagonal — context only, not applied: MIG owns no aggregate)
  - ../../adr/ADR-002-modular-monolith.md (project-wide — context)
  - ../../adr/ADR-003-multi-tenancy.md (project-wide schema-per-tenant — MIG materialises it)
---

# MIG — neuroassist-niv-migrations — Specs Entry Point

> MIG is an **infrastructure / platform job** (`isInfrastructure: true`,
> `hasUi: false`, `hasHttpApi: false`). It is the **single, centralized Flyway
> runner** for NeuroAssist NIV: it creates and versions the global schema
> `neuroassist_global` and **every** `t_<tenantId>` schema in one deterministic,
> auditable pass, then exits. It is **not** a hexagonal domain service (no
> aggregate, no REST API, no broker, **not a Eureka client**, no PHI). It owns
> **exactly one** persistent table, `migration_range_registry`, plus Flyway's own
> per-schema `flyway_schema_history` ledger. The spec set below is adapted to that
> nature: the "API surface" is a **CLI/runner contract** (run modes + exit codes +
> env), and the domain-shaped SPECs that do not apply (messaging) are present and
> explicitly marked **Not Applicable** with the recorded rationale, so backlog and
> scaffold do not infer a domain model, an HTTP endpoint, or a broker that does not
> exist.

## What MIG does (one paragraph)

NeuroAssist NIV is **schema-per-tenant** PostgreSQL (`../../adr/ADR-003-multi-tenancy.md`,
`arch/decisions/multi-tenancy.arch.json`): `neuroassist_global` holds shared
catalogues (users, RBAC, gesture vocabulary, pairing codes, audit-global) and each
care unit lives in its own `t_<tenantId>` schema. Every data-owning service (ACS,
PAT, EDGE, EVNT, GEST, HIST, CONV, TRN) **authors** its own DDL but **none runs
Flyway** — each `application.yml` ships `spring.flyway.enabled: false`
("Migrations gerenciadas pelo neuroassist-niv-migrations", verified on disk). MIG
is the **only** Flyway runner (INV-MIG-7): a non-web Spring Boot `CommandLineRunner`
(ADR-002) that (a) ensures the required extensions + `neuroassist_global` +
`uuid_generate_v7()` + the `migration_range_registry` table exist (its baseline
block `V0001–V0009`, ADR-004), (b) applies **global** migrations to
`neuroassist_global`, (c) enumerates existing `t_<tenantId>` schemas and applies the
**tenant-template** migrations to each, (d) provisions a new `t_<tenantId>` on
demand, then **exits** — `0` on full success, **non-zero** naming the failing schema
otherwise. It is **forward-only, checksum-validated** (ADR-005) and owns the
authoritative cross-module **version-range registry** (ADR-004, closes PAT **G1**).

## Spec map

| Artifact | Purpose | Status |
|---|---|---|
| `contracts/api-contract.md` | **CLI / runner contract** — run modes, argument validation, exit codes, env vars (EARS) | authoritative |
| `contracts/data-model.md` | `migration_range_registry` DDL + authoritative reserved-range table (G1) + `uuid_generate_v7()` (G5) + flyway history layout | authoritative |
| `contracts/event-contracts.md` | Events | **N/A** — messaging disabled platform-wide; MIG publishes/consumes nothing (recorded) |
| `contracts/integration-contracts.md` | PostgreSQL admin datasource; **script-collection mechanism (G2)**; provisioning invocation; CI gate keeping services' Flyway disabled (EARS) | authoritative |
| `contracts/hub-integration.md` | TechLab AI "hub" dependency | **N/A** — MIG makes no outbound call; coordinates offline via the registry table (recorded) |
| `contracts/techlab-ai-integration.md` | TechLab AI dependency | **N/A** — `ai.hasAi = false` for MIG (recorded) |
| `events/event-catalog.md` | Event catalog | empty by design (recorded) |
| `spec/backend/SPEC-01-api-surface.md` | Runner CLI surface invariants (EARS) | authoritative |
| `spec/backend/SPEC-02-migration-orchestration.md` | Core: baseline → global pass → tenant pass, per-schema isolation (EARS) | authoritative |
| `spec/backend/SPEC-03-tenant-provisioning-enumeration.md` | Sub-feature: `t_*` enumeration + `--provision-tenant` (EARS) | authoritative |
| `spec/backend/SPEC-04-data-model-migrations.md` | Registry table + baseline block `V0001–V0009` + reserved ranges (EARS) | authoritative |
| `spec/backend/SPEC-05-idempotency-concurrency.md` | Re-runnable no-op, forward-only, non-transactional DDL, next-version rule (EARS) | authoritative |
| `spec/backend/SPEC-06-security.md` | Admin-datasource confinement, no PHI, no open port (EARS) | authoritative |
| `spec/backend/SPEC-07-observability-health.md` | Exit codes, per-schema report, structured logs (no web actuator) (EARS) | authoritative |
| `spec/backend/SPEC-08-bdd-test-scenarios.md` | BDD narrative + reusable steps | authoritative |
| `spec/backend/SPEC-09-messaging-architecture.md` | Messaging | **N/A** (recorded) |
| `spec/backend/SPEC-10-integrations.md` | PostgreSQL only; script collection; CI gate; absent integrations (EARS) | authoritative |
| `tests/cucumber/global-and-tenant-migration.feature` | `--all` global+tenant pass Gherkin | authoritative |
| `tests/cucumber/tenant-provisioning.feature` | `--provision-tenant` + `--tenant` Gherkin | authoritative |
| `tests/cucumber/forward-only-and-checksum.feature` | Immutability / out-of-order / exit-code Gherkin | authoritative |
| `tests/cucumber/range-registry-guard.feature` | Reserved-block collision guard Gherkin | authoritative |
| `diagrams/c4-context.puml` | Context: migrator job + operator + PostgreSQL + authored scripts | authoritative |
| `diagrams/c4-container.puml` | Container: runner + SchemaAdmin + FlywayRunner + registry table | authoritative |
| `diagrams/c4-component.puml` | Component: job-shaped `com.neuroassist.migrations` package (not hexagonal) | authoritative |
| `setup-local.md` | Run modes + env vars + run/test commands (no HTTP port) | authoritative |
| `runbook.md` | Operational runbook (run cadence, provisioning, failure diagnosis, checksum recovery) | authoritative |
| `generator-config.yml` | Scaffold hints: `type: migrations`, `bounded_context: migrations`, no port | authoritative |

## EARS notation

Testable invariants in this spec set use EARS (D-057). Authoring guide:
`docs/architecture/backend/standards/ears-notation.md`. Domain (operational)
invariants are declared **once** in `03-initial-domain-framing.md`
(`INV-MIG-1..7`) and cited here without redeclaration.

## Gaps carried in from doc 06 and their disposition in this phase

| Gap | Disposition at Specs |
|---|---|
| **G1** — EVNT/GEST/HIST blocks unnumbered | `contracts/data-model.md` publishes the **authoritative** range registry; EVNT/GEST/HIST rows are marked **proposed (unconfirmed)**; registry is the machine-checkable guard (ADR-004). |
| **G2** — script-collection mechanics unspecified | `contracts/integration-contracts.md` §2 **recommends a concrete mechanism** (build-time aggregation into MIG classpath locations) — revisable. |
| **G5** — `uuid_generate_v7()` provenance | `contracts/data-model.md` §0 **defines** `uuid_generate_v7()` as a baseline PL/pgSQL function (no standard Postgres function of that name) — resolved. |
| G3 (tenant-enum source), G4 (R__ reseed policy) | left open; recorded in SPEC-03 / SPEC-05 as deferred, not blocking. |

## Next action

-> /be-architect-backlog neuroassist-niv MIG
