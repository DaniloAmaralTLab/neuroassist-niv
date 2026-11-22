# Migration status — by entity

> Snapshot of the state of each legacy entity migrated to `<tenant-schema-4>`.
> Update on every ETL run.

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Migration validated — count matches, financial sum matches, spot-check OK |
| 🟡 | Migrated with caveats (~95-99%; some records omitted or inferred) |
| ⚠️ | Partially migrated — understand the gap before using in production |
| ❌ | Not migrated yet |
| ⊘ | Decided **not to migrate** (retired entity or replaced by a new concept) |

## Canonical table

| Module | Entity | Status | Source table (legacy) | Target table (`<tenant-schema-4>`) | Rebuilder script | ETL script | Notes |
|---|---|---|---|---|---|---|---|
| CAD | Customers | ✅ | `tabclientes` + `tabclientesempresas` | `cliente` | (matching CNPJ+name) | `04_etl_clientes.sql` | 99% reconciliation |
| CAD | Suppliers | ✅ | `tabfornecedores` | `fornecedor` | — | `05_etl_cadastros.sql` | OK |
| CAD | Products | ✅ | `tabprodutos` + `tabprodempresas` | `produto` | — | `05_etl_cadastros.sql` | OK |
| CAD | Sales agents | ✅ | `tabvendedores` + `tabvendedoresempresas` | `vendedor` | — | `05_etl_cadastros.sql` | OK |
| CAD | Carriers | ✅ | `tabtransp` | `transportadora` | — | `05_etl_cadastros.sql` | No fleet data — re-register |
| CAD | Product groups | ✅ | `tabgrandegrupo` + `tabgrupo` + `tabsubgrupo` | `grupo_produto` | — | `05_etl_cadastros.sql` | Hierarchy OK |
| CAD | Works/Projects | 🟡 | `tabobras` | `obra_projeto` | (customer matching) | `05_etl_cadastros.sql` | 95% (some without a linked customer) |
| EST | Stock locations | ✅ | `tablocaisestoque` | `local_estoque` | — | `06_etl_estoque.sql` | OK |
| EST | Stock balance | ✅ | `tabestoqueatual` | `saldo_estoque` | — | `06_etl_estoque.sql` | Snapshot of the dump day |
| EST | Historical movements | 🟡 | `tabestoquehis` (19,306 rows) | `movimento_estoque` | — | `06_etl_estoque.sql` | OK; some without a clear origin |
| COM | Sales | 🟡 | `tabvendas` + `tabvendasdetalhe` (PKs lost) | `venda` + `item_venda` | `07_reconstruir_vendas.py` | `08_etl_vendas.sql` | 99% — heuristic date+customer+amount+vendedor |
| COM | Quotes | 🟡 | `taborcamentos` | `orcamento` | `09_reconstruir_orcamentos.py` | `10_etl_orcamentos.sql` | 95% — some without a customer |
| COM | Orders | ❌ | `tabpedidos` | `pedido_venda` | — | (to do) | Wait for the pilot |
| COM | Commissions | ❌ | `tabcomissao` | `comissao_calculada` | — | (to do) | Recalculate instead of migrating |
| FIS | NF-e | ✅ | `tabnfe` + `tabnfeitens` (44-digit NFe key preserved) | `nfe` + `item_nfe` | `11_reconstruir_nf.py` | `12_etl_nf.sql` | 100% — NFe key is a natural PK |
| FIS | SEFAZ events | 🟡 | `tabdetalhesfiscais` (1,685) + `tabnfref` (24) + `tabinutilizacao` (8) | `evento_sefaz` + `inutilizacao` | — | `12_etl_nf.sql` | OK; raw XMLs preserved |
| FIS | Received invoices | ❌ | `tabnotasrec` | `nota_recebida` | — | (to do) | Needed for reconciliation with COM |
| FIS | Tax groups | 🟡 | `tabgrupotrib*` (5 related tables) | `grupo_tributacao` + matrix | — | (to do) | Manual rebuild recommended (rules change a lot) |
| FIN | Accounts Receivable | 🟡 | `tabbolvenda` (2,523) + `tabbolnota` (1,929) | `titulo_receber` | `13_reconstruir_compras.py`* | (to do) | *script exists but is shared; refine |
| FIN | Accounts Payable | ⚠️ | `tabbolcompra` (1,949) + `tabbolcompraplano` (1,783) | `titulo_pagar` + allocation | — | (to do) | Allocation across the chart of accounts has partial data |
| FIN | Cash / Movements | 🟡 | `tabdetalhecaixa` (4,782) + `tabmovcaixa` | `caixa_sessao` + `movimento_caixa` | — | (to do) | History OK; open sessions need manual closing |
| FIN | Checks | 🟡 | `tabchequenosso` (90) + `tabchequespgcompra` (90) | `cheque` | — | (to do) | Current status not always clear |
| FIN | Transfers between accounts | 🟡 | `tabtransf` (265 rows) | `transferencia_conta` | — | (to do) | Some duplicated with `movimento_caixa` |
| FIN | Reconciliation | ⚠️ | `tablogobancario` (64) | `conciliacao_par` | — | (to do) | Small history — probably start over |
| FIN | Assets | 🟡 | `tabresumopatrimonial` (142) + detail (2,114) | `patrimonio` + `patrimonio_depreciacao` | — | (to do) | Manual review before migrating |
| FIN | Chart of accounts | ✅ | `tabplanocontas` | `plano_contas` (after extending the master) | — | `05_etl_cadastros.sql` | OK |
| FIN | Cost centers | ✅ | `tabcentrocusto` | `centro_custo` | — | `05_etl_cadastros.sql` | OK |
| FIN | Banks / Branches / Cards | ✅ | `tabbanco` (36) + `tabagencia` (94) + `tabcartao` (28) | `banco_conta` + (catalogs) | — | `05_etl_cadastros.sql` | Public catalog; reuse |
| FIN | Payment methods | ✅ | `tabformaspg` | `forma_pagamento` | — | `05_etl_cadastros.sql` | OK |
| FIN | Cash registers (POS) | ✅ | `tabcaixa` (7) | `caixa` | — | `05_etl_cadastros.sql` | OK |
| AUD | Audit log | ⊘ | `tablog` | `neuroassist_global.evento_auditoria` | — | — | **Do not migrate** — start from scratch (format changes) |
| AUD | Deletions (3 tables) | 🟡 | `tabvendasexcl` (126) + `tabvendasdetalheexcl` (418) + `tabbolvendaexcl` (411) | `exclusao_documento` (consolidated) | — | (to do) | Consolidate before migrating |
| CRM | (entire module) | ⊘ | — (does not exist in the legacy system) | `lead`, `oportunidade`, `tarefa`, etc. | — | — | **Greenfield** — no data to migrate |
| LOG | Drivers | 🟡 | `tabmotoristas` | `motorista` | — | (to do) | Validate license/category/expiry |
| LOG | Delivery status | ⊘ | `tabentregastatus` (5) | `status_entrega` | — | — | Recreate catalog (few items) |
| LOG | Vehicles / Fleet | ⊘ | `tabanoveiculo` + `tabmarcaveiculo` | — | — | — | **Do not migrate** — out of scope (TELAS_FALTANTES decision) |
| RTC | (entire module) | ⊘ | — (does not exist in the pre-RTC legacy system) | RTC tables | — | — | **Greenfield** (LC 214/2025 starts in 2026) |

## Numeric summary

- **Migrated and validated (✅):** ~14 entities
- **Migrated with caveats (🟡):** ~10 entities
- **Partial (⚠️):** 2 entities (AP, reconciliation)
- **To do (❌):** ~5 entities (orders, commissions, received invoices, accounts payable, etc.)
- **Do not migrate (⊘):** 5 entities (CRM greenfield, RTC greenfield, audit log, delivery status catalog, fleet out of scope)

## "Ready for pilot" criterion

To start a pilot with **one tenant** (Empório Wood, which has the dump):

- [ ] All ✅ remain ✅ after a clean reprocessing
- [ ] All 🟡 reach ≥ 99% (validate sampling + financial sum)
- [ ] AP, reconciliation and assets decided: migrate or start over?
- [ ] CRM, RTC and audit start empty (expected)

## Next actions (prioritized)

1. Upgrade the `.py` rebuilders that still use the old structure (Tomathe vs NeuroAssist NIV).
2. Implement the missing ETLs: orders, received invoices, accounts payable/receivable, cash.
3. Check the consolidation of deletions (3 tables → 1 new entity).
4. Decide on assets: migrate history or start from the current balance.
