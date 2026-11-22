# INT-MIG-003 -- EDGE — regenerate V1__create_initial_schema.sql into reserved block V0030-V0032 for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EDGE-011 and EDGE-012 already track the EDGE migration scripts V0030-V0031 as individual issues. INT-MIG-003 is the upstream obligation toward MIG: EDGE must annotate those scripts with `-- schema: global` / `-- schema: tenant` and place them in the correct db/migration/ subdirectory so the MIG aggregation task (MIG-012) can collect them. The block V0030-V0032 is confirmed=TRUE. Rolling V0033+ reserved for future EDGE global tables. Do NOT remove V1 until MIG-012 is merged.

## Spec de referencia
- SPEC-04 (reserved block V0030-V0032, EDGE)
- contracts/integration-contracts.md §2

## Escopo
Issues for edge-service (do NOT edit edge-service files from this issue):
- `services/edge-service/src/main/resources/db/migration/global/V0030__edge_global_init.sql` — `-- schema: global`; device_pairing_code + pgcrypto usage in neuroassist_global
- `services/edge-service/src/main/resources/db/migration/tenant/V0031__edge_tenant_init.sql` — `-- schema: tenant`; edge_device + edge_credential_revocation in t_<tenantId>
- `services/edge-service/src/main/resources/db/migration/tenant/V0032__edge_cached_catalog.sql` — `-- schema: tenant`; cached_catalog in t_<tenantId>

## Resultado esperado

After EDGE delivers V0030-V0032 with correct annotations, MIG-012 aggregates them: device_pairing_code in db/migration/global; edge_device, edge_credential_revocation, cached_catalog in db/migration/tenant.

## Criterios de aceite
- [ ] AC-1 V0030 is in db/migration/global with `-- schema: global` first line
- [ ] AC-2 V0031 and V0032 are in db/migration/tenant with `-- schema: tenant` first line
- [ ] AC-3 No V1__create_initial_schema.sql appears in MIG's aggregated locations after MIG-012 runs
- [ ] AC-4 EDGE-011 and EDGE-012 reference V0030-V0032 as the canonical scripts

## Dependencias
- MIG-012 (aggregation task)
- EDGE-011, EDGE-012 (EDGE migration issues, upstream)

## Estimativa
S

## Prioridade
P3
