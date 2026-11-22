# Operational Runbook — neuroassist-niv-migrations

**Service:** `neuroassist-niv-migrations` (MIG — centralized Flyway migrator job)
**HTTP port:** none (one-shot `CommandLineRunner`, web-application-type=none)
**Deploy as:** init/batch unit with `restart: "no"` (a restart would mask a failure — doc 06 R7)
**Architectural references:** ADR-001 (boundary), ADR-002 (execution model),
ADR-003 (central source of truth), ADR-004 (range registry + baseline), ADR-005
(forward-only / checksum).

---

## Required environment in production

| Variable | Required | Description |
|---|---|---|
| `SPRING_DATASOURCE_URL` | **YES** | admin-capable PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | **YES** | admin credential (`CREATE SCHEMA`/`EXTENSION`), secret-injected, MIG-only |
| `MIG_GLOBAL_SCHEMA` | no (default `neuroassist_global`) | global schema name |
| `MIG_TENANT_SCHEMA_PREFIX` | no (default `t_`) | tenant schema prefix |

---

## When to run MIG

| Trigger | Mode | Why |
|---|---|---|
| First fleet start | `--all` | create extensions + `neuroassist_global` + registry + every existing tenant |
| Each deploy | `--all` | apply any new reserved-block scripts to global + all tenants |
| New care unit onboarded | `--provision-tenant <id>` | create `t_<id>` and bring it to current version |
| Repair one tenant | `--tenant <id>` | re-apply to a single existing tenant |

> MIG is **ops-triggered** (A5): never auto-runs at a service's startup, never run by
> a business service. Run it to completion (exit 0) **before** starting the fleet.

---

## Scenario 1 — Normal full pass

```bash
java -jar neuroassist-niv-migrations.jar --all
echo "exit=$?"   # 0 = every schema at target version
```

Verify:

```bash
psql "$SPRING_DATASOURCE_URL" -c "TABLE neuroassist_global.flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"
```

---

## Scenario 2 — Provision a new tenant

```bash
java -jar neuroassist-niv-migrations.jar --provision-tenant unitC
echo "exit=$?"
psql "$SPRING_DATASOURCE_URL" -c "\dn t_unitC"
```

Idempotent: re-running against an existing `t_unitC` only migrates it (no re-create).

---

## Scenario 3 — Diagnose a failed run (exit 2)

The message names the failing schema. Common causes and fixes:

| Signal in log | Cause | Fix |
|---|---|---|
| `checksum mismatch` on `V00xx` | an applied script was edited in place (INV-MIG-3) | **never** revert the file; ship a new forward migration (`V<next>__…`); restore the original committed `V00xx` from git so its checksum matches |
| `out-of-order` / lower version | a script numbered below the current max was added | renumber it above `max(global ∪ tenant) + 1` (INV-MIG-4) |
| `reserved-block overlap` | two modules claim the same version | reconcile against `migration_range_registry` (ADR-004); one module renumbers |
| DDL error naming a tenant | bad tenant-block DDL | fix the module's script; re-run `--all` (earlier OK schemas are no-ops) |
| hang during provisioning | schema DDL inside a transaction (INV-MIG-6) | ensure `SchemaAdmin` DDL runs outside `@Transactional` (bug, not config) |

> A failed run is **aborted, not retried**. Fix forward and re-run; schemas already at
> target are no-ops.

---

## Scenario 4 — Checksum recovery (forward-only)

Flyway Community has no undo. To "undo" an applied change, write a new, strictly
higher forward migration:

```sql
-- V0043__retire_bad_column.sql   (example; number = current max + 1)
ALTER TABLE t.some_table DROP COLUMN IF EXISTS bad_column;
```

Never edit or delete an applied `V*.sql` (ADR-005).

---

## Scenario 5 — Confirm reserved blocks (close G1 at Backlog)

```bash
psql "$SPRING_DATASOURCE_URL" \
  -c "SELECT owner_module, block_from, block_to, confirmed FROM neuroassist_global.migration_range_registry ORDER BY block_from;"
```

Rows with `confirmed = false` (EVNT/GEST/HIST/TRN) must be numbered with each module
**before** that module's migration issues are emitted (ADR-004, doc 06 G1).

---

## Quick reference

| Command | Effect |
|---|---|
| `--all` | baseline + global + every tenant |
| `--global-only` | baseline + global schema only |
| `--tenant <id>` | one existing tenant |
| `--provision-tenant <id>` | create + migrate a new tenant |
| exit `0` / `1` / `2` | success / usage error / migration failure (schema named) |
