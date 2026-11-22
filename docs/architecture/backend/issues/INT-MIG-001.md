# INT-MIG-001 -- ACS — regenerate V1__create_initial_schema.sql into reserved block V0010-V0012 for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ACS's scaffold-generated flat `V1__create_initial_schema.sql` will NOT be applied by MIG's aggregation task (ADR-003). ACS must replace it with three schema-annotated, reserved-block scripts so the MIG Gradle aggregation task (MIG-012) can collect them into db/migration/global and db/migration/tenant. The reserved block V0010-V0012 is confirmed=TRUE in migration_range_registry (V0004 seed). Do NOT remove the flat V1 until MIG-012 is merged and the aggregation path is verified.

## Spec de referencia
- SPEC-04 (reserved block V0010-V0012, ACS)
- contracts/integration-contracts.md §2 (aggregation mechanism)

## Escopo
Issues for acs-service (do NOT edit acs-service files from this issue; this is a tracking issue for the upstream obligation):
- `services/acs-service/src/main/resources/db/migration/global/V0010__acs_global_init.sql` — first line `-- schema: global`; caregiver_identity_lookup + jwt_blacklist (global schema tables from ACS data-model)
- `services/acs-service/src/main/resources/db/migration/tenant/V0011__acs_tenant_init.sql` — first line `-- schema: tenant`; caregiver + caregiver_patient_link tenant tables
- `services/acs-service/src/main/resources/db/migration/tenant/V0012__acs_tenant_session.sql` — first line `-- schema: tenant`; patient_session tenant table

## Resultado esperado

After ACS delivers V0010-V0012, MIG-012's aggregation task picks them up into the correct locations. No flat V1__create_initial_schema.sql appears in MIG's aggregated db/migration/global or db/migration/tenant.

## Criterios de aceite
- [ ] AC-1 V0010 is in db/migration/global with `-- schema: global` first line; targets neuroassist_global tables
- [ ] AC-2 V0011 and V0012 are in db/migration/tenant with `-- schema: tenant` first line; target t_<tenantId> tables
- [ ] AC-3 No V1__create_initial_schema.sql appears in MIG's aggregated locations after MIG-012 runs
- [ ] AC-4 ACS-015 (or its successor) is updated to reference V0010-V0012 as the canonical migration scripts

## Dependencias
- MIG-012 (aggregation task, blocks full verification)
- ACS-015 (ACS migration issue, upstream)

## Estimativa
M

## Prioridade
P3
