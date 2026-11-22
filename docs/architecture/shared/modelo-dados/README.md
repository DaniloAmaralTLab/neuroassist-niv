# Data Model -- Index

Canonical DDL of NeuroAssist NIV (PostgreSQL 15+).

## Source of truth

**`sql/01_schema_novo.sql`** -- complete DDL (~70 tables) that will be applied by
`neuroassist-niv-migrations`. Do NOT duplicate it here; this README only points to it and categorizes it.

## Related documents (root, still the source of truth)

| Document | Content |
|---|---|
| `MODELO_DADOS.md` | Narrative of the conceptual model (entities, relationships, decisions) |
| `MAPEAMENTO_DADOS_LEGADO.md` | Legacy mapping (`tab*`) → new (entities grouped by module) |
| `ANALISE_RECUPERACAO_CHAVES.md` | Critical finding: the legacy dump omitted the auto-increment PKs of every master/document table; recovery strategies per entity |

## Grouping by schema

### `neuroassist_global` (shared across the tenants)

Planned tables (to be confirmed against `sql/01_schema_novo.sql`):
- `usuario`, `papel`, `permissao`, `usuario_empresa`, `papel_permissao` (IAM)
- `tenant` (catalog of the 5 units + parameters)
- `ncm`, `cfop`, `cst_icms`, `cst_pis_cofins`, `csosn`, `natureza_operacao` (tax catalogs)
- `plano_contas_master`, `centro_custo_master` (group standard chart of accounts)
- `evento_auditoria` (consolidated trail — duplicated per tenant? to be decided)

### `emp_<tenant>` (replicated 5×)

Grouping by module:

| Module | Key tables |
|---|---|
| CAD | `cliente`, `fornecedor`, `produto`, `vendedor`, `transportadora`, `grupo_produto`, `marca` |
| COM | `orcamento`, `proposta`, `venda`, `pedido_venda`, `item_venda`, `comissao` |
| FIS | `nfe`, `nfce`, `cte`, `item_nfe`, `evento_sefaz`, `inutilizacao` |
| FIN | `conta_pagar`, `conta_receber`, `movimento_caixa`, `caixa`, `cheque`, `conciliacao_bancaria`, `banco_conta` |
| EST | `movimento_estoque`, `saldo_estoque`, `inventario`, `local_estoque`, `transferencia_estoque` |
| CRM | `lead`, `oportunidade`, `tarefa`, `interacao`, `funil`, `estagio_funil`, `pos_venda` |
| LOG | `entrega`, `rota`, `motorista`, `veiculo`, `frete` |

Confirm against `sql/01_schema_novo.sql` when the implementation of each module starts.

## How to add/change a table

1. Edit `sql/01_schema_novo.sql` (canonical DDL).
2. Create a migration in `backend/neuroassist-niv-migrations/src/main/resources/db/migration/{global|tenant}/V<N>__<modulo>_<descricao>.sql`.
3. Update this README (category) if it is a new table.
4. Update `MODELO_DADOS.md` (narrative) if it is a modeling decision.
5. Run `./gradlew :neuroassist-niv-migrations:bootRun` locally to validate.
