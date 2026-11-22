# INT-MIG-005 -- EVNT — confirm V0040-V0049 reserved block and deliver EVNT migration scripts for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT's reserved block V0040-V0049 is currently confirmed=FALSE in migration_range_registry (proposed, +10 convention). EVNT-007 and EVNT-028/EVNT-029 track the actual migration scripts (V0040-V0046). INT-MIG-005 is the obligation to: (1) annotate those scripts with `-- schema: tenant` and place them in db/migration/tenant; (2) update migration_range_registry seed to confirmed=TRUE for EVNT's block (via a new forward migration or update to V0004 seed — coordinate with MIG team). Do NOT remove any flat V1 until MIG-012 is merged.

## Spec de referencia
- SPEC-04 (reserved block V0040-V0049, EVNT, confirmed=FALSE → TRUE)
- contracts/integration-contracts.md §2

## Escopo
Issues for evnt-service (do NOT edit evnt-service files from this issue):
- `services/evnt-service/src/main/resources/db/migration/tenant/V0040__evnt_event.sql` through `V0046__evnt_detection_lapse.sql` — all `-- schema: tenant`; event, push_subscription, escalation_attempt, detection_lapse in t_<tenantId>
- Coordinate with MIG team to update migration_range_registry confirmed flag for V0040-V0049 to TRUE (a new MIG forward migration or amendment to V0004)

## Resultado esperado

After EVNT delivers V0040-V0046 with correct annotations and confirmed=TRUE is set, MIG-012 aggregates EVNT scripts into db/migration/tenant. The RangeRegistry guard (MIG-015) includes EVNT's block in overlap checks.

## Criterios de aceite
- [ ] AC-1 EVNT scripts V0040-V0046 have `-- schema: tenant` as first line
- [ ] AC-2 migration_range_registry row for EVNT V0040-V0049 is updated to confirmed=TRUE
- [ ] AC-3 No V1__create_initial_schema.sql appears in MIG's aggregated locations after MIG-012
- [ ] AC-4 EVNT-007, EVNT-028, EVNT-029 reference V0040-V0046 as the canonical scripts

## Dependencias
- MIG-012 (aggregation task)
- EVNT-007, EVNT-028, EVNT-029 (EVNT migration issues, upstream)
- MIG-010 (V0004 seed may need a forward amendment for confirmed=TRUE)

## Estimativa
M

## Prioridade
P3
