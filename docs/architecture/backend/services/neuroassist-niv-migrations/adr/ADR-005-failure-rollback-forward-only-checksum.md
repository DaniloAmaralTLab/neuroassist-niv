<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-005 — Failure / rollback policy: forward-only, immutable applied scripts, checksum validation

## Status
aceita

> Note: orchestrator default (recommendation) - revisable by the owner.

## Contexto

With N+1 schemas sharing one authored migration set, the failure and change policy decides
whether the fleet stays consistent. The Learning layer records concrete failures from sibling
projects that this policy must pre-empt:

- An **applied `V*.sql` edited in place** (even a lint/format touch) changes its Flyway
  checksum and then **fails every tenant** on the next run (`checksum-mismatch-blocks-migrate-all`).
- A **follow-up numbered below the current max** is **silently skipped** and reported as success
  (`lower-version-silently-ignored`; `global-migration:out-of-order-skipped`).
- Mixing **admin DDL and a Flyway call in one transaction** deadlocks (handled in ADR-002).
- An **auto-restart** init container **masks** a failed migration (handled in doc 02 / ADR-002).

Flyway Community has no undo/rollback; "rollback" in a schema-per-tenant world would in any
case be N+1 inconsistent operations.

## Decisão

- **Forward-only.** No undo/rollback migrations. A mistake is corrected by a **new, strictly
  higher** forward migration (e.g. a `DROP TABLE IF EXISTS` in `V<next>__…_retire.sql`), never
  by editing or deleting an applied file.
- **Applied scripts are immutable.** `validateOnMigrate = true` (checksums on); an edited
  applied file fails the run fast and names the schema rather than drifting. A CI gate treats
  every committed `V*.sql` as frozen (doc 06 R3).
- **Strictly increasing versions, no out-of-order.** `outOfOrder = false`; the next version is
  `max(global ∪ tenant histories) + 1` (INV-MIG-4), so no follow-up is silently skipped on any
  schema.
- **Repeatable (`R__`) only for idempotent reseeds** (e.g. re-seeding reference/authority rows)
  where re-running on every invocation is intended and safe.
- **Per-schema isolation + honest exit.** Each schema is migrated independently; a failure on
  one schema is **reported and fails the run** (non-zero exit naming the schema), it is not
  retried or swallowed. The global pass precedes the tenant pass; a failed global pass aborts
  before touching tenants.
- **Re-runnable safely.** A run against an up-to-date database is a no-op (all versions already
  in history).

## Consequências

- **Positive:** the whole fleet stays on one consistent, auditable version line; the common
  "checksum mismatch blocks everyone" and "silently skipped migration" failures are designed
  out.
- **Positive:** a clean operational contract — exit code + per-schema report drives CI/ops
  gating.
- **Negative / trade-off:** no automatic rollback; every correction is a new migration and
  destructive fixes must be written deliberately forward. Accepted — rollback across N+1
  tenant schemas is neither safe nor available, and forward-only is the industry norm for
  Flyway at this scale. Revisit only if an undo-capable migration tool is adopted project-wide.
