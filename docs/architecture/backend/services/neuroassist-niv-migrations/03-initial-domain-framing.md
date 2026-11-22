<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Service: `neuroassist-niv-migrations` · Module **MIG (Centralized Flyway)** · Infrastructure — **no business domain**.

MIG has **no business domain**. Its vocabulary is the migration/multi-tenancy infrastructure,
not a NeuroAssist aggregate. This section frames the *operational* model so Specs/Backlog have
precise terms, not to imply a domain layer (there is none — see doc 04 / ADR-001).

## Ubiquitous Language

| Term | Meaning |
|---|---|
| **Global schema** | `neuroassist_global` — shared catalogues, RBAC, vocabulary, pairing codes, audit-global. |
| **Tenant schema** | `t_<tenantId>` — one isolated schema per care unit. |
| **Schema annotation** | The `-- schema: global` / `-- schema: tenant` first line of a DDL block that routes it (`persistence.arch.json`). |
| **Reserved block** | A contiguous `V00xx` version range owned by exactly one module (ACS `V0010–V0012`, …). |
| **Range registry** | `migration_range_registry` (global) — the authoritative map of block → owner module. |
| **Baseline block** | MIG's own `V0001–V0009` (extensions, global schema, registry, tenant template baseline). |
| **Global pass / Tenant pass** | The two application phases: `neuroassist_global`, then each `t_<tenantId>`. |
| **Run mode** | `--all` · `--global-only` · `--tenant <id>` · `--provision-tenant <id>`. |
| **Schema history** | Flyway's per-schema `flyway_schema_history` — the applied-state ledger. |

## Aggregates and Entities

**No domain aggregates.** The only persisted artefacts MIG owns are infrastructure tables in
`neuroassist_global`:

- **`migration_range_registry`** (global) — `block_from` (e.g. `V0001`), `block_to`
  (`V0009`), `owner_module` (`MIG`), `schema_target` (`global` | `tenant` | `both`),
  `description`, `declared_at`. Authoritative registry of reserved blocks (closes PAT G1).
  Table name is intentionally `migration_`-prefixed to avoid generic-name collisions in a
  shared schema (Learning pitfall).
- Flyway's **`flyway_schema_history`** — created and owned by Flyway in each schema; MIG
  reads it to compute the next version and to report state. Not a MIG-modelled entity.

## Domain Events

**None.** Messaging is disabled and MIG owns no domain event. The only lifecycle signal is
operational — *"migrations applied"* (global + N tenants at version V) — emitted as a job
exit status / log line, never as a broker event or a NeuroAssist contract.

## State Transitions (high level)

Per schema, the only state is its Flyway version, advancing forward-only:

```
(absent) --provision/baseline--> created@V0009
created@V0009 --global/tenant pass--> @V<target>
@V<target> --new DDL (next block)--> @V<target+1>         [forward-only, outOfOrder=false]
@V<any> --applied file edited--> FAILED (checksum)        [must fix with a NEW forward migration]
```

A run as a whole is `STARTED -> (all schemas at target) SUCCEEDED | (any schema fails) FAILED`;
FAILED sets a non-zero exit and names the schema.

## Invariants

- **INV-MIG-1** — Every `t_<tenantId>` and `neuroassist_global` are on the **same target
  version** after a successful `--all` run.
- **INV-MIG-2** — A version number is used by **exactly one** module's reserved block; blocks
  never overlap (`migration_range_registry` is the guard).
- **INV-MIG-3** — An applied migration is **immutable**: its file checksum never changes; a
  change ships as a strictly higher new version. `outOfOrder = false`.
- **INV-MIG-4** — The next version is `max(global ∪ tenant schema histories) + 1`, never a
  per-schema-local max (prevents the split-location collision).
- **INV-MIG-5** — Required extensions exist in `neuroassist_global` and every tenant run keeps
  `neuroassist_global` on `search_path`, so extension operator classes (`pg_trgm`, etc.)
  resolve inside `t_<tenantId>`.
- **INV-MIG-6** — Schema creation/drop (`CREATE SCHEMA …`) is **never** executed inside the
  same `@Transactional` scope as a Flyway call (cross-connection deadlock).
- **INV-MIG-7** — MIG is the **only** Flyway runner; every business service keeps
  `spring.flyway.enabled: false`.
