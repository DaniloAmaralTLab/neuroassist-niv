# Cross-module relationships

Map of **FKs and read dependencies** among the ~70 NeuroAssist NIV tables. Use it when implementing a BE module to know which Feign clients to create, and when implementing the FE to know which lib consumes which.

## Principles

1. **Physical FK** exists **only within the same schema** (same module, same bounded context, same tenant).
2. **Cross-schema/cross-module reference** = **API call** (sync Feign) or **JMS event** (async). Never a physical JOIN.
3. **`neuroassist_global` → `emp_<x>`**: the operational schema references the global one by a logical key (e.g.: `cliente.vendedor_responsavel_id` references `usuario.usuario_id` in the global schema, but is validated in code, not by FK).
4. **`emp_<x>` → `emp_<x>` (same tenant)**: physical FK allowed and recommended.

## Dependency map (who-needs-whom)

```
                                       ┌─────────────┐
                                       │   IAM (G)   │
                                       │ usuario     │
                                       │ papel       │
                                       │ permissao   │
                                       │ usuario_emp │
                                       └──────┬──────┘
                                              │ (all consume it for authorization)
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
       ┌──────────┐                    ┌──────────┐                    ┌──────────┐
       │ CAD (E)  │                    │ COM (E)  │                    │ AUD (G)  │
       │ cliente  │◄───────────────────│ venda    │───────────────────►│ evento_  │
       │ produto  │ (Feign sync)       │ orcamento│ (event JMS)        │ audit    │
       │ fornec.  │                    │ pedido   │                    └──────────┘
       │ vendedor │                    └────┬─────┘
       └────┬─────┘                         │
            │                               │ (event: venda.confirmada)
            │ (Feign: GET produto/{id})     │
            │                               ▼
            │                         ┌──────────┐    ┌──────────┐    ┌──────────┐
            │                         │ FIS (E)  │    │ EST (E)  │    │ FIN (E)  │
            │                         │ nfe      │───►│ movimento│    │ titulo_  │
            │                         │ evento_  │    │ saldo    │    │ receber  │
            │                         │ sefaz    │    └──────────┘    └──────────┘
            │                         └────┬─────┘
            │                              │ (event: nfe.autorizada)
            │                              ▼
            │                         ┌──────────┐    ┌──────────┐
            │                         │ RTC (E)  │    │ LOG (E)  │
            │                         │ apuracao │    │ entrega  │
            │                         │ darf     │    │ frete    │
            │                         └────┬─────┘    └──────────┘
            │                              │ (consumes events RTC AA)
            │                              │
            ▼                              ▼
       ┌──────────┐                  ┌──────────┐
       │ CRM (E)  │                  │ FIN (E)  │
       │ lead     │                  │ split    │
       │ oport.   │─event.ganha────► │ payment  │
       │ tarefa   │                  └──────────┘
       └──────────┘
```

> Legend: **(G)** = lives in `neuroassist_global` · **(E)** = lives in `emp_<x>` · **─►** = depends on · **◄──** = is referenced by.

## Table: physical FKs by module

### CAD (intra-schema, intra-module)

| Table | FK |
|---|---|
| `produto.grupo_produto_id` | → `grupo_produto.id` |
| `produto.unidade_principal_id` | → `unidade_medida.id` |
| `cliente.vendedor_id` | → `vendedor.id` |
| `cliente.classificacao_id` | → `classificacao_cliente.id` |
| `vendedor.gerente_id` | → `gerente.id` |
| `vendedor.funcao_id` | → `funcao_vendedor.id` |
| `produto_fornecedor.produto_id` | → `produto.id` |
| `produto_fornecedor.fornecedor_id` | → `fornecedor.id` |
| `fornecedor_dados_bancarios.fornecedor_id` | → `fornecedor.id` |
| `fornecedor_centro_custo.fornecedor_id` | → `fornecedor.id` |
| `obra_projeto.cliente_id` | → `cliente.id` |

### COM (intra-tenant)

| Table | FK |
|---|---|
| `orcamento.cliente_id` | → `cliente.id` (CAD) |
| `orcamento.vendedor_id` | → `vendedor.id` (CAD) |
| `venda.orcamento_id` | → `orcamento.id` |
| `venda.cliente_id` | → `cliente.id` (CAD) |
| `venda.vendedor_id` | → `vendedor.id` (CAD) |
| `item_venda.venda_id` | → `venda.id` |
| `item_venda.produto_id` | → `produto.id` (CAD) |
| `pedido_venda.venda_id` | → `venda.id` |
| `comissao_calculada.venda_id` | → `venda.id` |
| `comissao_calculada.vendedor_id` | → `vendedor.id` (CAD) |

### FIS (intra-tenant + global for catalogs)

| Table | FK |
|---|---|
| `nfe.venda_id` | → `venda.id` (COM) |
| `item_nfe.nfe_id` | → `nfe.id` |
| `item_nfe.produto_id` | → `produto.id` (CAD) |
| `item_nfe.ncm_id` | (logical) → `neuroassist_global.ncm.id` |
| `evento_sefaz.nfe_id` | → `nfe.id` |
| `nota_recebida.fornecedor_id` | → `fornecedor.id` (CAD) |
| `nota_recebida_item.nota_id` | → `nota_recebida.id` |

### RTC (intra-tenant + global for RTC tables + cross-refs in FIN)

| Table | FK |
|---|---|
| `apuracao_periodo.tenant_id` | (implicit by the schema) |
| `debito_processado.periodo_id` | → `apuracao_periodo.id` |
| `debito_processado.nfe_id` | → `nfe.id` (FIS) |
| `credito_apropriado.periodo_id` | → `apuracao_periodo.id` |
| `credito_apropriado.nota_recebida_id` | → `nota_recebida.id` (FIS) |
| `darf.periodo_id` | → `apuracao_periodo.id` |
| `matriz_fiscal_rtc.cclasstrib_codigo` | (logical) → `neuroassist_global.cclasstrib.codigo` |
| `evento_nfe_rtc.nfe_id` | → `nfe.id` (FIS) |

### FIN (intra-tenant, with cross-module via logical reference)

| Table | FK |
|---|---|
| `titulo_receber.venda_id` | → `venda.id` (COM) |
| `titulo_receber.nfe_id` | → `nfe.id` (FIS) — nullable |
| `titulo_receber.cliente_id` | → `cliente.id` (CAD) |
| `titulo_pagar.fornecedor_id` | → `fornecedor.id` (CAD) |
| `titulo_pagar.nota_recebida_id` | → `nota_recebida.id` (FIS) — nullable |
| `titulo_pagar_rateio.titulo_id` | → `titulo_pagar.id` |
| `titulo_pagar_rateio.plano_contas_id` | → `plano_contas.id` |
| `titulo_pagar_rateio.centro_custo_id` | → `centro_custo.id` |
| `movimento_caixa.conta_id` | → `banco_conta.id` |
| `movimento_caixa.titulo_receber_id` | → `titulo_receber.id` — nullable |
| `cheque.titulo_id` | → `titulo_receber.id` or `titulo_pagar.id` (polymorphic via `tipo`) |
| `conciliacao_par.movimento_caixa_id` | → `movimento_caixa.id` |
| `conciliacao_par.apuracao_credito_id` | → `credito_apropriado.id` (RTC) — nullable (tripartite mode) |

### EST (intra-tenant)

| Table | FK |
|---|---|
| `movimento_estoque.produto_id` | → `produto.id` (CAD) |
| `movimento_estoque.local_id` | → `local_estoque.id` (CAD) |
| `movimento_estoque.venda_id` | → `venda.id` (COM) — nullable |
| `movimento_estoque.nota_recebida_id` | → `nota_recebida.id` (FIS) — nullable |
| `transferencia_estoque_item.transferencia_id` | → `transferencia_estoque.id` |
| `transferencia_estoque.local_origem_id` | → `local_estoque.id` (CAD) |
| `transferencia_estoque.local_destino_id` | → `local_estoque.id` (CAD) |

### LOG (intra-tenant)

| Table | FK |
|---|---|
| `entrega.venda_id` | → `venda.id` (COM) |
| `entrega.nfe_id` | → `nfe.id` (FIS) |
| `entrega.transportadora_id` | → `transportadora.id` (CAD) |
| `frete.entrega_id` | → `entrega.id` |
| `rastreamento_evento.entrega_id` | → `entrega.id` |

## Derived Feign Clients (mapping)

| Feign client | Provider | Used by |
|---|---|---|
| `CadClienteClient` | <service> | comercial, crm, financeiro |
| `CadProdutoClient` | <service> | comercial, estoque, fiscal, rtc |
| `CadFornecedorClient` | <service> | financeiro, fiscal, rtc |
| `ComVendaClient` | <service> | fiscal, financeiro, estoque, log |
| `FisNFeClient` | <service> | rtc, financeiro, log |
| `RtcApuracaoClient` | rtc-service | financeiro (tripartite reconciliation) |
| `IamPolicyClient` | <service> | all |
| `EstSaldoClient` | <service> | comercial (validation before a sale) |

Full registry: [[../../backend/standards/services-catalog]] §7.

## JMS events (loose coupling)

| Event | Producer | Main consumers |
|---|---|---|
| `neuroassist-niv.cadastro.cliente.criado` | cadastros | crm, comercial |
| `neuroassist-niv.comercial.venda.confirmada` | comercial | fiscal, estoque, financeiro |
| `neuroassist-niv.fiscal.nfe.autorizada` | fiscal | financeiro, estoque, logistica, rtc |
| `neuroassist-niv.rtc.debito.processado` | rtc | financeiro, auditoria |
| `neuroassist-niv.rtc.credito.apropriado` | rtc | financeiro, auditoria |
| `neuroassist-niv.financeiro.titulo.pago` | financeiro | comercial, rtc (debit extinction) |
| `neuroassist-niv.estoque.movimento.registrado` | estoque | auditoria |
| `neuroassist-niv.logistica.entrega.realizada` | logistica | comercial, auditoria |

Full event catalog: [[../contratos/event-catalog]].

## How to read this map

- **Implementing a new BE module (`/be-architect-vision <MOD>`)**: filter by your module in the "physical FK" table to know your tables, and use the "(CAD)", "(COM)" etc. columns to identify the Feign Clients you need to declare (`infrastructure/clients/`).
- **Implementing an FE feature (`/fe-feature-architect-discover <MOD> <feature>`)**: look at which modules your feature touches and import the generated SDKs from `@neuroassist/shared/contracts/<modulo>`.
- **Defining a new event**: register it in [[../contratos/event-catalog]] **before** publishing — <service> needs to be subscribed.

## Anti-patterns

- ❌ Adding a cross-schema FK (`emp_x.venda.cliente_id` → `neuroassist_global.cliente`) — Postgres accepts it, but it breaks tenant isolation.
- ❌ Explicit cross-tenant JOIN (`<tenant-schema-1>.venda` JOIN `emp_certa.cliente`) — only with a conscious `UNION ALL`, **never** automatic.
- ❌ A microservice querying another's schema/table — always via Feign or JMS event.
- ❌ Hardcoded list of tables in this document — update as `sql/01_schema_novo.sql` evolves.

## References

- Canonical DDL: `sql/01_schema_novo.sql`
- Global schema: [[neuroassist-niv-global]]
- Tenant template: [[tenant]]
- Service catalog + Event Catalog: [[../../backend/standards/services-catalog]]
