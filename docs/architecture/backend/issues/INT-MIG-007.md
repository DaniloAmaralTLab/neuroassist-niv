# INT-MIG-007 -- HIST — confirm V0060-V0069 reserved block and deliver HIST migration scripts for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

HIST's reserved block V0060-V0069 is confirmed=FALSE in migration_range_registry. HIST-006 and HIST-007 track the HIST migration scripts V0060-V0065. Some scripts target neuroassist_global (audit_record_global, audit_retention_policy, audit_source — `-- schema: global`); others target t_<tenantId> (audit_record, audit_subject_key, ix_audit_record_patient_time — `-- schema: tenant`). INT-HIST-005 tracks the same obligation from HIST's side. Do NOT remove any flat V1 until MIG-012 is merged.

## Spec de referencia
- SPEC-04 (reserved block V0060-V0069, HIST, confirmed=FALSE → TRUE)
- contracts/integration-contracts.md §2

## Escopo
Issues for hist-service (do NOT edit hist-service files from this issue):
- `services/hist-service/src/main/resources/db/migration/tenant/V0060__hist_audit_record.sql` — `-- schema: tenant`; audit_record in t_<tenantId>
- `services/hist-service/src/main/resources/db/migration/tenant/V0061__hist_audit_subject_key.sql` — `-- schema: tenant`; audit_subject_key in t_<tenantId>
- `services/hist-service/src/main/resources/db/migration/global/V0062__hist_audit_record_global.sql` — `-- schema: global`; audit_record_global in neuroassist_global
- `services/hist-service/src/main/resources/db/migration/global/V0063__hist_audit_retention_policy.sql` — `-- schema: global`; audit_retention_policy in neuroassist_global
- `services/hist-service/src/main/resources/db/migration/global/V0064__hist_audit_source.sql` — `-- schema: global`; audit_source in neuroassist_global
- `services/hist-service/src/main/resources/db/migration/tenant/V0065__hist_audit_index.sql` — `-- schema: tenant`; ix_audit_record_patient_time in t_<tenantId>
- Coordinate with MIG team to update confirmed=TRUE for HIST V0060-V0069

## Resultado esperado

After HIST delivers V0060-V0065 with correct annotations and confirmed=TRUE is set, MIG-012 aggregates them into the correct locations.

## Criterios de aceite
- [ ] AC-1 V0062-V0064 have `-- schema: global`; V0060/V0061/V0065 have `-- schema: tenant`
- [ ] AC-2 migration_range_registry row for HIST V0060-V0069 is updated to confirmed=TRUE
- [ ] AC-3 No V1__create_initial_schema.sql appears in MIG's aggregated locations
- [ ] AC-4 HIST-006 and HIST-007 reference V0060-V0065 as the canonical scripts; INT-HIST-005 is cross-linked

## Dependencias
- MIG-012 (aggregation task)
- HIST-006, HIST-007 (HIST migration issues, upstream)
- INT-HIST-005 (same obligation from HIST side)

## Estimativa
M

## Prioridade
P3
