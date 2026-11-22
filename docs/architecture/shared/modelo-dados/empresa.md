# Schema `emp_<tenant>` — Operational Template

This document describes the operational schema **template**, replicated 5× (one per tenant of the group).

## Instantiated schemas

| Schema | Tenant |
|---|---|
| `<tenant-schema-1>` | ST Wood |
| `<tenant-schema-2>` | Certa Madeiras |
| `<tenant-schema-3>` | Beludia |
| `<tenant-schema-4>` | Empório Wood (only one with a legacy dump) |
| `<tenant-schema-5>` | Solução |

## Principle

- **Same structure, isolated data.** The DDL is identical across the 5 schemas; what changes is what goes in (sales, NFe, specific customers).
- Each operational microservice uses `TenantContextHolder.require()` before touching any query, and Hibernate's `MultiTenantConnectionProvider` runs `SET search_path TO emp_<id>, neuroassist_global, public` per connection.
- Operational tables **never** carry `tenant_id` as an FK — the schema already isolates.

## Categories and tables by module

### CAD — Master records (from the legacy system)

```
cliente                  -- individuals/companies that buy from the tenant
fornecedor               -- individuals/tenants that sell to us (with allocation across cost centers)
produto                  -- product catalog (with 8 tabs: data, groups, tax, multi-unit,
                            cost & price, stock by location, suppliers, commission)
produto_historico_preco  -- price evolution (auto-populated)
produto_custo_anterior   -- previous weighted average
produto_ultima_compra    -- snapshot of the last purchase
vendedor                 -- sales agents with commissions (product/profit/variable)
gerente                  -- supervisors (relationship with vendedor)
transportadora           -- with fleet (plate, capacity kg/m³, driver)
obra_projeto             -- linked to cliente; groups sales/quotes
grupo_produto            -- hierarchy: Major Group / Group / Subgroup
grupo_estoque            -- parallel hierarchy for physical classification
atributo_produto         -- brands, colors, sizes, types, labels
unidade_medida           -- M³, UN, KG, M², M, PC
local_estoque            -- warehouses per tenant (Main Warehouse, Branch, ...)
classificacao_cliente    -- A/B/C/D
setor_profissao          -- Construction, Carpentry, Engineer, Architect
funcao_vendedor          -- External, Internal, Supervisor, Representative
origem_contato           -- Meta Ads, LinkedIn, Referral, Trade fairs
concorrente              -- catalog for commercial monitoring
motivo                   -- justification for deletion/discount/return
```

### COM — Commercial

```
orcamento                -- initial proposal (with items, discounts)
proposta_comercial       -- evolution of the quote, formal
venda                    -- sales document (generates NFe + receivable)
item_venda               -- product lines
pedido_venda             -- after invoicing, tracks picking/shipping
comissao_calculada       -- commission snapshot per sale × vendedor
historico_desconto       -- discounts previously applied to the customer (I2)
historico_comissao       -- previous commissions of the vendedor
```

### CRM — Sales pipeline

```
lead                     -- initial contact
oportunidade             -- qualified lead
tarefa                   -- to-do list per opportunity
interacao                -- timeline (call/email/whatsapp/visit)
funil                    -- generic pipeline
estagio_funil            -- configurable columns (with color + probability)
motivo_perda             -- catalog of loss reasons
pos_venda                -- contact after sale (NPS, satisfaction)
tag                      -- free-form labels
```

### FIS — Tax (legacy regime, valid until 2033)

```
nfe                      -- NF-e model 55
nfce                     -- NFC-e model 65 (POS)
cte                      -- Transport Waybill (CT-e)
item_nfe                 -- lines
evento_sefaz             -- event timeline (authorization, CC-e, cancellation, contingency)
inutilizacao             -- number range voiding
nota_recebida            -- inbound invoice (purchase)
nota_recebida_item       -- XML × expected reconciliation
grupo_tributacao         -- tax matrix (UF × Person Type × CFOP × CST)
```

### RTC — Tax Reform (LC 214/2025)

```
apuracao_assistida_periodo -- monthly period (In Progress / Adjustment / Completed)
debito_processado          -- CBS/IBS debits computed by the AA
credito_apropriado         -- released credits (when the supplier's debit is extinguished)
credito_a_apropriar        -- pending credits
pagamento_utilizado        -- Split Payment / RAD / PCONT / Basic Credit
darf                       -- collection documents
matriz_fiscal_rtc          -- matrix UF × cClassTrib × CST IBS/CBS × rates
evento_nfe_rtc             -- 17 new events (presumed credit, capitalization, succession, ...)
divergencia_calculo        -- audit Tomathe × Official Calc. × AA
cadastro_cib               -- properties linked to SINTER
```

### FIN — Financial

```
titulo_receber             -- accounts receivable (linked to sale + NFe)
titulo_pagar               -- accounts payable (with allocation to chart of accounts + CC)
movimento_caixa            -- inflows/outflows of any account
caixa_sessao               -- POS opening/closing
caixa                      -- physical cash register record
transferencia_conta        -- between bank accounts/cash registers
cheque                     -- own and third-party (in portfolio/cleared/returned)
conciliacao_bancaria_par   -- match statement × movimento_caixa × AA (tripartite)
banco_conta                -- bank account / card
forma_pagamento            -- catalog (bank slip, PIX, card, transfer, check, cash)
patrimonio                 -- fixed assets (real estate, vehicles, machinery)
patrimonio_depreciacao     -- annual history
plano_contas               -- extended from the master (neuroassist_global)
centro_custo               -- same
```

### EST — Inventory

```
movimento_estoque          -- every inflow/outflow (with origin: sale/purchase/NF/adjustment/transfer)
saldo_estoque              -- snapshot per product × location
transferencia_estoque      -- between warehouses (with items)
inventario                 -- physical count
acerto_estoque             -- manual adjustment (with reason + CC)
curva_abc                  -- ABC classification by revenue (I4)
```

### LOG — Logistics

```
entrega                    -- linked to the sale/NFe
rota                       -- grouping of deliveries by driver/vehicle
motorista                  -- with driver's license, category, expiry
veiculo                    -- plate, capacity, type
frete                      -- cost + status (quote/collected/in transit/delivered)
rastreamento_evento        -- timeline (with map)
status_entrega             -- catalog (Waiting/Picking/On route/Delivered/Returned)
```

### Audit (optional local mirror)

```
exclusao_documento         -- consolidation of the 3 legacy tab*excl tables (sales/items/slips)
                             fields: date, type (Sale/Detail/Slip), doc, reason, author, amount
```

> The *consolidated* audit lives in `neuroassist_global.evento_auditoria`. Here it is only the history of **internal deletions** with more operational detail.

## Conventions specific to the `emp_*` schemas

- **No `tenant_id`** in any table — the schema already isolates.
- PKs: `BIGSERIAL` for sequential documents (NFe, sale, receivable/payable) · `UUID` for domain entities with rules (cliente, produto, vendedor).
- NFe numbering: SEFAZ requires a unique sequence per tenant × series; use a Postgres `sequence` per schema.
- Soft-delete: same as global (`ativo BOOLEAN`). For an "auditable logical" deletion, **record it in `exclusao_documento`** before marking inactive.
- Standard timestamps.

## Migrations

They live in `backend/neuroassist-niv-migrations/src/main/resources/db/migration/tenant/V<N>__<modulo>_<descricao>.sql`.
**They run once per tenant** (loop over the 5 `emp_*` schemas). Examples:
- `V001__cad_cliente.sql`
- `V002__com_venda.sql`
- `V010__rtc_apuracao_assistida.sql`

`neuroassist-niv-migrations` reads `NEUROASSIST-NIV_TENANTS=<tenant-id-1>,<tenant-id-2>,...` and applies them.

## How to add a new tenant (future operation)

1. Insert into `neuroassist_global.tenant` with a new `tenant_id` (e.g.: `emp_novaunidade`).
2. Add `novaunidade` to the `NEUROASSIST-NIV_TENANTS` env var.
3. Restart `neuroassist-niv-migrations` — it will create the schema and run all the Vs.
4. Associate users via `usuario_empresa`.
5. Configure parameters (rates, IE, extended chart of accounts).

## Anti-patterns

- ❌ Adding a `tenant_id` column "just to be safe" — breaks the schema-per-tenant concept.
- ❌ Automatic cross-tenant join in Hibernate — always an explicit query with `UNION ALL`.
- ❌ Forgetting `TenantContextHolder.require()` in an application service (ArchUnit RULE-07 detects it).
- ❌ Hardcoded `'<tenant-schema-1>'` in production code — always via context.

## References

- Canonical DDL: `sql/01_schema_novo.sql`
- ADR-001: [[../multi-tenant]]
- Backend hexagonal patterns: [[../../backend/standards/hexagonal-patterns]]
- Legacy → new mapping: [[../etl-legado/README]]
