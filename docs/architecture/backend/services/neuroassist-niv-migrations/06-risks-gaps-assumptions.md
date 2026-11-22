<!-- OUTPUT-SCHEMA
- Riscos
- Gaps Conhecidos
- Suposições a Validar
- Dependências Críticas
-->

# 06 — Risks, Gaps and Assumptions

> Service: `neuroassist-niv-migrations` · Module **MIG (Centralized Flyway)** · Infrastructure.

## Riscos

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Reserved-block collision** — the orchestrator hint put MIG at `V0080–V0089`, already proposed by TRN; EVNT/GEST/HIST blocks are unnumbered on disk. | Flyway apply failure / silent drift. | MIG takes **`V0001–V0009`** (ADR-004); `migration_range_registry` is the authoritative guard; confirm every block before Backlog emits migration issues. |
| R2 | **Local `V1__create_initial_schema.sql` run by accident** — a service could re-enable Flyway and apply its flat `V1`, diverging from the central blocks. | Schema drift, duplicate/incompatible DDL. | ADR-003: services keep `flyway.enabled: false`; local `V1` regenerated into the reserved block and deprecated; MIG is the sole runner (INV-MIG-7). |
| R3 | **Applied migration edited in place** — a "lint"/format touch changes a checksum and MIG then fails every tenant. | `--all` blocked for the whole fleet. | Forward-only + immutable (ADR-005, INV-MIG-3); CI gate treating committed `V*.sql` as frozen; fix via a new forward migration only. |
| R4 | **Out-of-order / per-schema-local versioning** — picking the next `V` from one schema's max lets a lower version be silently skipped elsewhere. | A tenant misses a migration but the run reports success. | Next version = `max(global ∪ tenant histories) + 1`; `outOfOrder = false` (INV-MIG-4). |
| R5 | **Transactional-DDL deadlock** — `CREATE/DROP SCHEMA` in the same `@Transactional` scope as a Flyway call (separate connection) deadlocks. | Provisioning / run hangs. | `SchemaAdmin` runs DDL **outside** any transaction, before invoking `FlywayRunner` (ADR-002, INV-MIG-6). |
| R6 | **Extension not on tenant search_path** — `pg_trgm`/`unaccent` operator classes unresolved inside `t_<tenantId>`. | Tenant migration fails. | Extensions installed in `neuroassist_global`; tenant runs with `search_path = t_<tenantId>, neuroassist_global` (INV-MIG-5). |
| R7 | **Auto-restart masks a failed run** — an init container with a restart policy retries and hides a real migration failure. | Fleet starts against a half-migrated DB. | Deploy MIG with `restart: "no"`; non-zero exit on any schema failure (ADR-005, doc 02). |
| R8 | **Schema-naming mismatch** between the creation point (tenant provisioning / ops) and MIG. | Migrations applied to the wrong/absent schema. | Both derive the schema name identically as `t_<tenantId>`; single documented convention (Learning pitfall). |
| R9 | **Over-privileged datasource leakage** — MIG's admin credential is broader than any runtime role. | Blast radius if leaked. | Credential confined to the MIG job, injected via secret, never in a service; MIG runs and exits. |

## Gaps Conhecidos

- **G1 — EVNT / GEST / HIST reserved blocks are unnumbered on disk.** EVNT doc only says "EDGE
  used `V0030–V0032`; EVNT must claim a non-colliding range"; GEST/HIST declare global/tenant
  tables but no `V00xx`. The registry proposes `V0040–V0049` / `V0050–V0059` / `V0060–V0069`
  by the `+10` convention — **to be confirmed** with each module at Specs/Backlog.
- **G2 — Central migration-location mechanics unspecified.** Whether MIG consumes each
  module's `src/main/resources/db/migration/` directly or scripts are collected into a MIG
  location at build time is an ADR-003 implementation detail to settle at Specs/Scaffold
  (how the authored scripts physically reach the runner).
- **G3 — Tenant enumeration source.** MVP lists `t_*` from `information_schema`; whether a
  canonical tenant registry table should drive the list instead (and who owns it — ACS/
  platform-ops) is open.
- **G4 — Repeatable-migration policy for authority/vocabulary seeds.** CONV `V0077` and TRN
  seed `conv.*`/`trn.*` authorities; whether re-seeds are versioned or `R__` repeatable needs
  a project-wide rule (touches the RBAC `modelo_acesso_versao` bump process).
- **G5 — `uuid_generate_v7()` provenance.** `persistence.arch.json` names `uuid_generate_v7()`
  but there is no standard Postgres function by that name; the baseline block must define it
  (or pin the extension providing it) — settle at Specs.

## Suposições a Validar

- **A1** — MIG runs with an **admin datasource** able to `CREATE SCHEMA` and `CREATE
  EXTENSION`; business services do not.
- **A2** — Every business service keeps `spring.flyway.enabled: false` (verified today for
  acs/conv/edge/evnt/gest/hist/pat); a CI gate keeps it that way.
- **A3** — Tenant volume is small at pilot (single/few tenants), so sequential per-schema
  application is fast enough; no parallel migration needed for the MVP.
- **A4** — The schema name is exactly `t_<tenantId>` at both creation and application points.
- **A5** — Running MIG is an **ops-triggered** step (first start, deploy, provisioning); there
  is no in-process scheduler and no auto-run at service startup.

## Dependências Críticas

- **PostgreSQL** reachable with the admin datasource — the only hard runtime dependency.
- **`arch/decisions/multi-tenancy.arch.json`** (schema-per-tenant, `neuroassist_global`) and
  **`persistence.arch.json`** (extensions, UUID v7, `-- schema:` annotation) — the contracts
  MIG materialises.
- **Each business service's authored DDL** (`contracts/data-model.md` → `V00xx` scripts) — the
  input MIG applies; MIG is blocked on these being in their reserved blocks.
- **`migration_range_registry`** reconciled before any module's migration issues are emitted
  (closes PAT G1; gates Backlog).
- **No** dependency on REG/Eureka, any broker, TechLab AI, or any business service at runtime.
