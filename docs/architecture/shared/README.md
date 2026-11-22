# Architecture -- Shared (Backend + Frontend)

Documents that span BE and FE, or that describe contracts/data/rules that both consume.

## Structure

```
docs/architecture/shared/
├── modelo-dados/              # Postgres modeling (canonical DDL)
│   ├── README.md              # Index
│   ├── neuroassist-niv-global.md      # Global schema (users, RBAC, catalogues)
│   ├── tenant.md             # Template of the emp_* schema
│   └── relacionamentos.md     # FK map between modules
├── contratos/                 # API contracts (OpenAPI generated per service)
│   ├── README.md
│   ├── iam-openapi.yaml
│   ├── cadastros-openapi.yaml
│   └── ...
├── rbac/                      # Roles and permissions model
│   ├── README.md
│   ├── papeis.md              # List of canonical roles
│   ├── permissoes.md          # List of permissions per module
│   └── matriz-papel-permissao.md
├── multi-tenant.md           # ADR: schema-per-tenant, TenantContextHolder, propagation
└── etl-legado/                # Legacy → new mapping (replaces the root MAPEAMENTO_DADOS_LEGADO.md in the long run)
    ├── README.md              # For now, just an index to the root .md files
    └── status-por-entidade.md # table: clients ✅, products ✅, sales ✅ 99%, purchases ⚠️
```

## Critical documents to read first

1. **`multi-tenant.md`** — defines how the system isolates the group's tenants. Everything depends on this.
2. **`modelo-dados/README.md`** — points to `sql/01_schema_novo.sql` (canonical DDL).
3. **`rbac/README.md`** — NeuroAssist NIV without functional RBAC is error #1 of the prototype (see memory `prototipo-madeiraerp`).
4. **`etl-legado/status-por-entidade.md`** — what is ready to migrate, what needs rework.

## Root documents that are still the source of truth

These stay where they are until they are consolidated here:

- `MODELO_DADOS.md` — narrative conceptual model
- `MAPEAMENTO_DADOS_LEGADO.md` — legacy → new mapping
- `PLANO_MIGRACAO.md` — migration phases
- `PROVA_CONCEITO_CLIENTES.md`, `PROVA_CONCEITO_VENDAS.md` — executed proofs of concept
- `ANALISE_RECUPERACAO_CHAVES.md` — critical finding about PKs in the legacy dump
- `ANALISE_COMPLETA.md` — general diagnosis
- `TELAS_FALTANTES.md` — legacy screens missing in MadeiraERP
- `INVESTIGACAO_COMPRAS.md` — specific case (purchase items missing from the dump)
