# INT-EDGE-004 -- MIG — register Flyway range V0030-V0032 in MIG service docs (data-model.md §5 reserved block)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

**Register EDGE Flyway range V0030–V0032 in the MIG service docs.** `data-model.md §5` documents
the reserved range, but it is not yet formally registered in the MIG (`neuroassist-niv-migrations`)
service's migration registry. When MIG is architected, this issue ensures the range is recorded so
MIG's apply-order logic knows to include EDGE's scripts (`V0030__edge_global_init.sql` and
`V0031__edge_tenant_init.sql`) without colliding with ACS (V0010–V0012) or PAT (V0020–V0022).

**Action:** add an entry for EDGE's V0030–V0032 range to the MIG registry (the same PR or
architecture phase that onboards MIG's own migration plan).

## Spec de referencia
- SPEC-04 (migration plan §5 — reserved range V0030–V0032)
- data-model.md §5 (cross-service reserved-range registry)

## Escopo
## Criterios de aceite
- [ ] AC-1 EDGE's V0030–V0032 range is registered in the MIG service docs with no overlap against ACS/PAT ranges
- [ ] AC-2 MIG applies EDGE's `V0030` (global) before `V0031` (tenant) on a fresh database

## Dependencias
- EDGE-011, EDGE-012 (migration scripts authored), MIG architecture phase

## Estimativa
S

## Prioridade
P3
