# INT-MIG-004 -- CONV — regenerate DDL scripts into reserved block V0070-V0079 for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

CONV-008 and CONV-009 track the CONV migration scripts V0070-V0077. INT-MIG-004 is the upstream obligation toward MIG: CONV must annotate those scripts with the correct `-- schema:` routing and place them in db/migration/global (V0077: neuroassist_global authority seed) or db/migration/tenant (V0070-V0076: speech tree tables) so MIG-012 aggregates them correctly. Block V0070-V0079 is confirmed=TRUE. Do NOT remove any flat V1 until MIG-012 is merged.

## Spec de referencia
- SPEC-04 (reserved block V0070-V0079, CONV)
- contracts/integration-contracts.md §2

## Escopo
Issues for conv-service (do NOT edit conv-service files from this issue):
- `services/conv-service/src/main/resources/db/migration/tenant/V0070__conv_tenant_init.sql` through `V0076__conv_*.sql` — `-- schema: tenant`; published_tree, tree_version, category, phrase, audio_asset, usage_signal in t_<tenantId>
- `services/conv-service/src/main/resources/db/migration/global/V0077__conv_iam_seed.sql` — `-- schema: global`; 6 conv.* authority rows in neuroassist_global + modelo_acesso_versao bump

## Resultado esperado

After CONV delivers V0070-V0077 with correct annotations, MIG aggregates them: V0070-V0076 in db/migration/tenant; V0077 in db/migration/global. CONV tables are created in t_<tenantId> during --all; conv.* authorities seeded in neuroassist_global during the global pass.

## Criterios de aceite
- [ ] AC-1 V0070-V0076 have `-- schema: tenant` as first line and are in db/migration/tenant
- [ ] AC-2 V0077 has `-- schema: global` as first line and is in db/migration/global
- [ ] AC-3 No V1__create_initial_schema.sql appears in MIG's aggregated locations after MIG-012
- [ ] AC-4 CONV-008 and CONV-009 reference V0070-V0077 as the canonical scripts

## Dependencias
- MIG-012 (aggregation task)
- CONV-008, CONV-009 (CONV migration issues, upstream)

## Estimativa
M

## Prioridade
P3
