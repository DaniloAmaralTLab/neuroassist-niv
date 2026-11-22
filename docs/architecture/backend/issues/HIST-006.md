# HIST-006 -- Flyway V0060-V0064 — audit_record (tenant), audit_subject_key (tenant), audit_record_global (global), audit_retention_policy (global), audit_source (global); reserved hash columns record_hash/prev_hash (ADR-002 Option B additive)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

HIST reserves the Flyway block `V0060`–`V0069` (next free `+10` after GEST `V0050`–`V0059`).
This issue covers V0060–V0064:
- **V0060** (tenant): `audit_record` with UNIQUE `idempotency_key`, CHECK on `actor_type`,
  indexes `ix_audit_record_subject_time` / `ix_audit_record_correlation` / `ix_audit_record_action_src` /
  `ix_audit_record_flagged`; nullable `record_hash`/`prev_hash` reserved for ADR-002 Option B.
- **V0061** (tenant): `audit_subject_key` with CHECK on `status`; this is the ONLY table the
  HIST role may `DELETE` from (crypto-shred, ADR-006).
- **V0062** (global): `audit_record_global` (same shape as `audit_record`, `tenant_id` nullable).
- **V0063** (global): `audit_retention_policy` with nullable `retention_days`; seed data for 6
  fact classes (see HIST-018).
- **V0064** (global): `audit_source` (optional producer registry).

Scripts are authored by HIST, applied by MIG (neuroassist-niv-migrations) via INT-HIST-005.
HIST does NOT run Flyway at service startup.

## Spec de referencia

- SPEC-04 (data model + migrations)
- data-model.md §2 (DDL) + §4 (migration plan) + §5 (DB grants)
- ADR-002 (immutability — hash columns reserved), ADR-006 (crypto-shred key table)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/resources/db/migration/V0060__create_audit_record.sql`
- [ ] implementar `backend/services/hist-service/src/main/resources/db/migration/V0061__create_audit_subject_key.sql`
- [ ] implementar `backend/services/hist-service/src/main/resources/db/migration/V0062__create_audit_record_global.sql`
- [ ] implementar `backend/services/hist-service/src/main/resources/db/migration/V0063__create_audit_retention_policy.sql`
- [ ] implementar `backend/services/hist-service/src/main/resources/db/migration/V0064__create_audit_source.sql`

## Criterios de aceite

- [ ] AC-1 V0060 DDL matches `data-model.md §2.1` exactly: all columns, UNIQUE `idempotency_key`, 4 indexes, CHECK on `actor_type`, nullable `record_hash`/`prev_hash`
- [ ] AC-2 V0061 `audit_subject_key` PK is `(subject_type, subject_id)`; CHECK on `status IN ('active','shredded')`
- [ ] AC-3 V0062 `audit_record_global` `tenant_id` is nullable (global facts have no tenant)
- [ ] AC-4 V0063 seed rows for all 6 fact classes with `retention_days = NULL` (periods TBD with counsel)
- [ ] AC-5 All scripts contain `COMMENT ON TABLE` as specified in `data-model.md §2`
- [ ] AC-6 Scripts do not include `GRANT` statements (grants are in a separate migration — HIST-008)

## Dependencias

- HIST-001 (precede)
- INT-HIST-005 (MIG applies these scripts — dependency in INT direction)

## Estimativa

M

## Prioridade
P3
