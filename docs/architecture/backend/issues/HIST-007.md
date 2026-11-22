# HIST-007 -- Flyway V0065 — additive index ix_audit_record_patient_time (caregiver-timeline read + whole-period summary G-HIST-4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Additive migration (no table changes) adding the index that powers the caregiver-timeline read
(`GET /hist/patients/{patientId}/history`) and the whole-period summary computation (G-HIST-4).
The index filters by `tenant_id` + `payload ->> 'patientId'` (the patient reference stored in
the JSON payload) ordered by `occurred_at DESC` — serving both the keyset-paginated fetch and the
single aggregate query over the full window. This index is separated from V0060 to keep the base
table migration clean and allow the index to be CONCURRENTLY reindexed if needed.

## Spec de referencia

- SPEC-04 (data model, §4 migration plan — V0065 explicit)
- data-model.md §4/§7 (index definition, caregiver timeline projection)
- SPEC-03 (caregiver history timeline — query path)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/resources/db/migration/V0065__add_audit_record_patient_time_index.sql`

## Criterios de aceite

- [ ] AC-1 Index definition matches data-model.md §4 exactly: `CREATE INDEX ix_audit_record_patient_time ON audit_record (tenant_id, (payload ->> 'patientId'), occurred_at DESC)`
- [ ] AC-2 Script is in the `tenant` schema scope (applied per-tenant by MIG)
- [ ] AC-3 Script is idempotent-safe (`CREATE INDEX IF NOT EXISTS` or same as spec)

## Dependencias

- HIST-006 (V0060 creates audit_record — this index requires the table to exist)

## Estimativa

S

## Prioridade
P3
