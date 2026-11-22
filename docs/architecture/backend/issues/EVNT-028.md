# EVNT-028 -- Flyway V0044 — detection_lapse table (data-model §2.4, SAFETY-GEST-1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ADR-006 / SAFETY-GEST-1: EVNT must persist one `detection_lapse` row per EDGE-raised episode (a
patient station connected but not detecting, or whose heartbeat stopped, for `N` seconds). This
migration creates the `detection_lapse` table in the per-tenant schema (`t_<tenantId>`).
`idempotency_key` is EDGE's stable per-episode key; `uq_detection_lapse_idem` on
`(tenant_id, idempotency_key)` enforces LAPSE-2 at the DB. Status enum: `open`, `resolved`,
`acknowledged`. Cause/detection-state enums use UPPERCASE Java-identifier form (from EDGE). Two
partial indexes drive the escalation sweep and the caregiver list (LAPSE-3/LAPSE-4/LAPSE-5).

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.4
- SPEC-12-detection-lapse-alerting.md LAPSE-1/LAPSE-2
- docs/architecture/backend/services/evnt-service/adr/ADR-006-detection-lapse-alerting.md

## Escopo
- [ ] implementar `src/main/resources/db/migration/V0044__evnt_detection_lapse_table.sql`
- [ ] SQL must include: `CREATE TABLE detection_lapse` (all columns in data-model §2.4), `uq_detection_lapse_idem UNIQUE (tenant_id, idempotency_key)`, all `ck_detection_lapse_*` CHECK constraints, `ck_detection_lapse_ack_pair`, partial index `ix_detection_lapse_open` (WHERE resolved_at IS NULL AND acknowledged_at IS NULL), full index `ix_detection_lapse_patient`, and `COMMENT ON TABLE`

## Criterios de aceite
- [ ] AC-1 `V0044__evnt_detection_lapse_table.sql` applied by Flyway with no errors; `detection_lapse` table exists in tenant schema with all columns, constraints and indexes from data-model §2.4
- [ ] AC-2 `INSERT` with duplicate `(tenant_id, idempotency_key)` raises DB unique-violation (uq_detection_lapse_idem — LAPSE-2)
- [ ] AC-3 `INSERT` with `cause` not in `('NOT_RUNNING', 'HEARTBEAT_STOPPED')` raises DB check violation
- [ ] AC-4 `./gradlew :evnt-service:test --tests "*.migration.V0044DetectionLapseTableMigrationTest"` exits 0 against real PostgreSQL Testcontainer

## Dependencias
- EVNT-010 (precede — EVNT Flyway V0043 sets the range baseline; V0044 must follow in sequence)

## Estimativa
S

## Prioridade
P3
