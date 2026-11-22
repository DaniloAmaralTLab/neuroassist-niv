# INT-MIG-002 -- PAT — regenerate V1__create_initial_schema.sql into reserved block V0020-V0022 for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

PAT's scaffold-generated flat V1__create_initial_schema.sql will NOT be applied by MIG (ADR-003). PAT must replace it with reserved-block scripts V0020-V0022 annotated by schema target so the MIG Gradle aggregation task (MIG-012) can collect them. The block V0020-V0022 is confirmed=TRUE in migration_range_registry. PAT-013 tracks PAT's side of this; INT-MIG-002 tracks the cross-service obligation toward MIG's aggregation path. Do NOT remove V1 until MIG-012 is merged.

## Spec de referencia
- SPEC-04 (reserved block V0020-V0022, PAT)
- contracts/integration-contracts.md §2

## Escopo
Issues for pat-service (do NOT edit pat-service files from this issue):
- `services/pat-service/src/main/resources/db/migration/global/V0020__pat_gesture_type.sql` — `-- schema: global`; gesture_type table in neuroassist_global + initial seed rows
- `services/pat-service/src/main/resources/db/migration/tenant/V0021__pat_patient.sql` — `-- schema: tenant`; patient table in t_<tenantId>
- `services/pat-service/src/main/resources/db/migration/tenant/V0022__pat_command.sql` — `-- schema: tenant`; command table in t_<tenantId>

## Resultado esperado

After PAT delivers V0020-V0022, MIG-012 aggregates them correctly. gesture_type ends up in db/migration/global; patient and command end up in db/migration/tenant.

## Criterios de aceite
- [ ] AC-1 V0020 targets neuroassist_global (gesture_type + seed) with `-- schema: global` first line
- [ ] AC-2 V0021 and V0022 target t_<tenantId> with `-- schema: tenant` first line
- [ ] AC-3 No V1__create_initial_schema.sql appears in MIG's aggregated locations after MIG-012 runs
- [ ] AC-4 PAT-013 is updated to reference V0020-V0022 as the canonical migration scripts

## Dependencias
- MIG-012 (aggregation task)
- PAT-013 (PAT migration issue, upstream)

## Estimativa
M

## Prioridade
P3
