# Schema `neuroassist_global`

**Shared** schema across the tenants of the group. It lives only once in Postgres.

## When to use this schema

- Records of the **group itself** (does not change per tenant): users, roles, permissions.
- **National tax catalogs** that apply to all units: NCM, CFOP, CST/CSOSN, Operation Nature, **RTC tables** (CST IBS/CBS, cClassTrib, cCredPres, NCM-IS).
- **Master chart of accounts** + master Cost Center (template applied and refined per tenant).
- **Consolidated audit** cross-tenant (filterable by `tenant_id`).
- **Catalog of tenants** + group parameters.

> **Principle:** if the data is "of the group" or "of Brazil" (national catalog), it goes here. If it is "day-to-day operations of one unit", it goes in `emp_<unidade>` ([[tenant]]).

## Categories and tables

### IAM (identity and access)

```
usuario                  -- individual who logs in
papel                    -- ADMIN, GERENTE, VENDEDOR, FISCAL, FINANCEIRO, ALMOXARIFE, ...
permissao                -- cad.cliente.read, com.venda.criar, fis.nfe.emitir, ...
papel_permissao          -- N:N papel ↔ permissao
usuario_empresa          -- 1 user can operate N tenants; each association carries a role
modelo_acesso_versao     -- singleton; increments when RBAC changes (invalidates cache)
```

Details in [[../rbac/modelo]] (RBAC) and [[../multi-tenant]] (ADR-001).

### Tenant catalog

```
tenant                  -- 5 units: ST Wood, Certa Madeiras, Beludia, Empório Wood, Solução
                            fields: tenant_id (slug `emp_<x>`), nome_fantasia, razao_social, cnpj,
                                    inscricao_estadual, regime_tributario, ativo, parametros_jsonb
```

`tenant_id` = name of the operational schema (`<tenant-schema-1>`, `<tenant-schema-2>`, ...). It is the key that links `neuroassist_global.*` to `emp_<x>.*`.

### National tax catalogs

```
ncm                      -- ~10,800 NCM codes from the Receita; loaded via CSV import (B1)
cfop                     -- ~150 CFOPs (inbound and outbound, intra/inter/foreign)
cst_icms                 -- 00, 10, 20, 30, 40, 41, 50, 51, 60, 70, 90
cst_pis                  -- 01, 02, 03, ..., 99
cst_cofins               -- same ranges as PIS
csosn                    -- 101..900 (Simples Nacional)
natureza_operacao        -- natural catalog edited by the group (maps to CFOP)
observacao_nf            -- standard DANFE texts (B5)
```

### RTC catalogs (Tax Reform, LC 214/2025)

```
cst_ibs_cbs              -- ~15 new codes (000, 010, 020, 040, 050, 060, ...) — see [[../../../reforma/Glossário RTC v3]]
cclasstrib               -- ~300 combinations of IBS/CBS Tax Classification
ccredpres                -- 5 canonical presumed credit codes
ncm_is                   -- NCMs subject to Selective Tax (beverages, tobacco, vehicles, agrochemicals)
tabela_rtc_versao        -- version control (each update via the RTC portal bumps the version)
```

Details in [[rtc-reforma-tributaria]] (project memory).

### Master chart of accounts

```
plano_contas_master      -- canonical 3-level tree (1.01.01 ...); each tenant extends it
centro_custo_master      -- master CC catalog; each tenant creates its own under the master
```

### Audit

```
evento_auditoria         -- consolidated trail of ALL `neuroassist-niv.*` events (JMS consumer)
                            fields: id, tenant_id (nullable), usuario_id, evento, payload_jsonb,
                                    correlation_id, timestamp, source_service
```

> Pending decision: `evento_auditoria` consolidated in `neuroassist_global` OR split into `emp_<x>.evento_auditoria` (with a sub-table). Trade-off: easy cross-tenant query vs. separate retention/backup.

## Conventions

- All global tables start with a conceptual prefix (`usuario_*`, `papel_*`, etc.).
- PKs: `UUID` for domain entities (user, role) · `BIGSERIAL` for imported catalogs (NCM, CFOP) · slug `VARCHAR(50)` for short canonical entities (tenant_id).
- Soft-delete: field `ativo BOOLEAN NOT NULL DEFAULT true` (do not use `DELETE`).
- Timestamps: `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()` + `atualizado_em TIMESTAMPTZ`.

## Migrations

They live in `backend/neuroassist-niv-migrations/src/main/resources/db/migration/global/V<N>__<tema>_<descricao>.sql`.
They run **once** (they do not replicate per tenant). Examples:
- `V001__iam_papel_permissao.sql`
- `V002__catalogo_ncm.sql`
- `V003__rtc_cclasstrib.sql`

## Anti-patterns

- ❌ Putting operational data (sale, NFe, movement) in `neuroassist_global` — it goes in `emp_<x>`.
- ❌ Duplicating NCM/CFOP per tenant — national catalogs stay in the global schema.
- ❌ Allowing an operational microservice to write to `neuroassist_global` arbitrarily — only `<service>` (RBAC) and `neuroassist-niv-migrations` (seed).
- ❌ Forgetting `tenant_id` in `evento_auditoria` when the event comes from a company operation.

## References

- Canonical DDL: `sql/01_schema_novo.sql`
- ADR-001 schema-per-tenant: [[../multi-tenant]]
- RBAC model: [[../rbac/modelo]]
- Service catalog: [[../../backend/standards/services-catalog]]
