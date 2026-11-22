# HIST-008 -- DB grants enforcement — INSERT/SELECT only on audit_record + audit_record_global; INSERT/SELECT/DELETE on audit_subject_key; revoke UPDATE/DELETE on audit tables (ADR-002, INV-HIST-1); MIG applies grants

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Enforces ADR-002 Option A (append-only via DB grants). The HIST application role `hist_app` is
granted only `INSERT`/`SELECT` on `audit_record` and `audit_record_global`; `UPDATE`/`DELETE` are
explicitly revoked. For `audit_subject_key`, `DELETE` is additionally granted so crypto-shred can
delete the encryption key row (ADR-006) — this is the **only** audit-adjacent delete allowed.
Grants are delivered as a Flyway migration, applied by MIG alongside the DDL scripts.

The DB enforces immutability independently of application code: even if a bug or malicious code
attempts `UPDATE`/`DELETE` on an audit row, the DB will reject it.

## Spec de referencia

- SPEC-04 (data model, §5 DB grants)
- data-model.md §5 (grant DDL)
- ADR-002 (immutability — Option A via grants)
- ADR-006 (crypto-shred — DELETE only on audit_subject_key)

## Escopo

- [ ] implementar grants SQL dentro de `backend/services/hist-service/src/main/resources/db/migration/V0060__create_audit_record.sql` (or a dedicated V006x script agreed with MIG)

## Criterios de aceite

- [ ] AC-1 `hist_app` role has `INSERT, SELECT` on `audit_record`; `UPDATE, DELETE` are revoked
- [ ] AC-2 `hist_app` role has `INSERT, SELECT` on `audit_record_global`; `UPDATE, DELETE` are revoked
- [ ] AC-3 `hist_app` role has `INSERT, SELECT, DELETE` on `audit_subject_key` (and only `audit_subject_key`)
- [ ] AC-4 Integration test confirms an attempt to `UPDATE` an `audit_record` row via JDBC raises a `PSQLException` (permission denied)
- [ ] AC-5 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-006 (tables must exist before grants)

## Estimativa

S

## Prioridade
P3
