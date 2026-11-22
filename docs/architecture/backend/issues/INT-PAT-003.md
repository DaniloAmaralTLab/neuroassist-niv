# INT-PAT-003 -- MIG registry — promote PAT V0020-V0022 reserved range into the MIG service docs

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

PAT's data-model §5 (G1 decision) documents that PAT reserves Flyway migration range
`V0020`–`V0022` and provides a cross-service snapshot of reserved ranges (ACS V0010–V0012,
PAT V0020–V0022, future services V0030+ in +10 blocks). This snapshot lives in
`data-model.md §5` as an informal cross-service record — it is not in the MIG service docs.

`data-model.md §5` explicitly says: "backlog should add a MIG issue to promote it into the
MIG service docs". The MIG service (`neuroassist-niv-migrations`) is declared in the registry
but not yet architected. When MIG is architected, this reserved-range table must be formally
registered in the MIG docs to prevent collision with future services.

## Spec de referencia

- data-model.md (§5 G1, migration reserved ranges)
- SPEC-04 (migration plan, G1 resolved)
- integration-contracts.md (§3 PAT → MIG)

## Escopo

- [ ] criar docs/architecture/backend/services/neuroassist-niv-migrations/reserved-ranges.md com a tabela de faixas reservadas (ACS, PAT e convenção future)
- [ ] referenciar este documento em data-model.md §5 como "promoted to MIG docs"
- [ ] garantir que PAT-013 (Flyway V0020-V0022) cite o documento MIG como fonte de autoridade

## Criterios de aceite

- [ ] AC-1 O ficheiro `docs/architecture/backend/services/neuroassist-niv-migrations/reserved-ranges.md` existe e documenta a faixa PAT V0020-V0022 como reservada
- [ ] AC-2 ACS V0010-V0012 também está registrado no mesmo documento
- [ ] AC-3 data-model.md §5 referencia o documento MIG como fonte de autoridade (sem depender exclusivamente da tabela inline)

## Dependencias

- PAT-013 (precede — Flyway migrations)

## Estimativa

S

## Prioridade
P3
