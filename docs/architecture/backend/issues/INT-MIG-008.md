# INT-MIG-008 -- TRN — confirm V0080-V0089 reserved block and deliver TRN migration scripts for MIG aggregation

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

TRN's reserved block V0080-V0089 is confirmed=FALSE in migration_range_registry. TRN proposes this block in its own backlog. This issue is a placeholder / gate: until TRN specs are finalized and its migration scripts are authored, MIG cannot aggregate TRN DDL. This issue tracks the upstream obligation for TRN to deliver its scripts and confirm the block. It is blocked on TRN backlog completion and must not be closed until confirmed=TRUE is in the registry.

## Spec de referencia
- SPEC-04 (reserved block V0080-V0089, TRN, confirmed=FALSE)
- contracts/integration-contracts.md §2

## Escopo
Issues for trn-service (do NOT edit trn-service files from this issue):
- TRN migration scripts V0080-V0089 annotated with `-- schema: global` or `-- schema: tenant` as appropriate (voice consent, voice model, speech sample, publication; trn.* authority seed)
- Coordinate with MIG team to update confirmed=TRUE for TRN V0080-V0089 once scripts are authored

## Resultado esperado

Once TRN delivers its reserved-block scripts with correct annotations and confirmed=TRUE is set, MIG-012 can aggregate them. Until then this issue remains OPEN.

## Criterios de aceite
- [ ] AC-1 TRN migration scripts V0080+ are authored and annotated with `-- schema: global` or `-- schema: tenant`
- [ ] AC-2 migration_range_registry row for TRN V0080-V0089 is updated to confirmed=TRUE via a forward migration
- [ ] AC-3 No V1__create_initial_schema.sql from trn-service appears in MIG's aggregated locations

## Dependencias
- MIG-012 (aggregation task)
- TRN backlog (TRN architecture phase must complete first)

## Estimativa
L

## Prioridade
P3
