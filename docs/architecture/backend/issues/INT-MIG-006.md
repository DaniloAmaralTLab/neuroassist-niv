# INT-MIG-006 -- GEST — confirm V0050-V0059 reserved block and deliver GEST migration scripts for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

GEST's reserved block V0050-V0059 is confirmed=FALSE in migration_range_registry. GEST-012 tracks the actual migration scripts (V0050, V0051). Both are global-schema tables (engine_version, engine_capability in neuroassist_global). INT-MIG-006 is the obligation to: (1) annotate those scripts with `-- schema: global` and place them in db/migration/global; (2) update migration_range_registry confirmed=TRUE for V0050-V0059. Do NOT remove any flat V1 until MIG-012 is merged.

## Spec de referencia
- SPEC-04 (reserved block V0050-V0059, GEST, confirmed=FALSE → TRUE)
- contracts/integration-contracts.md §2

## Escopo
Issues for gest-service (do NOT edit gest-service files from this issue):
- `services/gest-service/src/main/resources/db/migration/global/V0050__gest_engine_version.sql` — `-- schema: global`; engine_version in neuroassist_global
- `services/gest-service/src/main/resources/db/migration/global/V0051__gest_engine_capability.sql` — `-- schema: global`; engine_capability in neuroassist_global
- Coordinate with MIG team to update confirmed=TRUE for GEST V0050-V0059

## Resultado esperado

After GEST delivers V0050-V0051 with `-- schema: global` annotations and confirmed=TRUE is set, MIG-012 aggregates them into db/migration/global. Engine tables are created in neuroassist_global during the global pass.

## Criterios de aceite
- [ ] AC-1 V0050 and V0051 have `-- schema: global` as first line and are in db/migration/global
- [ ] AC-2 migration_range_registry row for GEST V0050-V0059 is updated to confirmed=TRUE
- [ ] AC-3 No V1__create_initial_schema.sql appears in MIG's aggregated locations
- [ ] AC-4 GEST-012 references V0050-V0051 as the canonical scripts

## Dependencias
- MIG-012 (aggregation task)
- GEST-012 (GEST migration issue, upstream)

## Estimativa
S

## Prioridade
P3
