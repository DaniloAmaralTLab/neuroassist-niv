# Legacy ETL → NeuroAssist NIV

> Mapping and migration strategy from the **dump of the current production ERP** (single
> Empório Wood unit) to the new multi-tenant structure.

## Canonical source

| Artifact | Location | What it is |
|---|---|---|
| Legacy SQL dump | `BD/` (read-only) | Full backup of the current ERP (`sismaster_emporiowood`) — historical audit, NEVER edit |
| Parsed legacy schema | `sql/02_schema_legado.sql` | DDL extracted from the dump, for reference |
| New schema (target) | `sql/01_schema_novo.sql` | Canonical NeuroAssist NIV DDL (~70 tables) |
| Conversion script | `sql/03_converter.py` | Initial parser: dump → intermediate CSVs |
| Loader | `sql/03_load_all.sql` | Imports intermediate CSVs into Postgres |
| ETL per module | `sql/04..15_*.sql` + `sql/0[679]*_reconstruir_*.py` | 1 pair (.py rebuilder + .sql ETL) per entity |

## Related documents

| Doc | Content |
|---|---|
| [`status-por-entidade.md`](status-por-entidade.md) | Table: what is ready, what is missing, what has caveats (customers ✅, products ✅, sales 99%, purchases ⚠️, ...) |
| `../../../PLANO_MIGRACAO.md` (root) | Migration phases (POC → pilot → cutover) — high-level narrative |
| `../../../MODELO_DADOS.md` (root) | Narrative conceptual model (entities, relationships, decisions) |

## Critical finding: keys omitted in the dump

The legacy dump **omitted the auto-increment PKs** of every master/document table. Recovery strategy per entity:

- **Customers / Products / Suppliers**: matching by CNPJ/CPF + name — 99% reconciliation.
- **Sales**: rebuild the sequence via `data_emissao + cliente_id + valor_total + vendedor_id` — 99%.
- **Quotes**: same as sales — 95% (some without a customer).
- **Invoices**: the NFe key (44 digits) is kept — 100%.
- **Purchases / Slips**: partial data, still under investigation.

Each `.py` rebuilder documents its heuristic in its docstring.

## Migration flow (summary)

```
┌─ 1. Legacy dump (BD/)
│     ↓
│  python sql/03_converter.py        → CSVs in sql/legado_data/
│     ↓
│  psql -f sql/03_load_all.sql       → intermediate tables with synthetic PKs
│     ↓
│  ┌─ per entity ───────────────────────────────┐
│  │  python sql/07_reconstruir_vendas.py       │  ← recovers lost FKs
│  │  psql -f sql/08_etl_vendas.sql             │  ← INSERT INTO <tenant-schema-4>.venda
│  └────────────────────────────────────────────┘
│     ↓
│  Validation: count + sample + financial diff
│     ↓
│  Repeat for customers, products, suppliers, NFe, purchases, etc.
└─

Result: <tenant-schema-4> populated, the other emp_* start empty (greenfield).
```

## How to add a new entity to the ETL

1. Map in `status-por-entidade.md` which legacy table becomes which new table.
2. If there are lost FKs, create `sql/N_reconstruir_<entidade>.py` with a documented heuristic.
3. Create `sql/M_etl_<entidade>.sql` that performs the `INSERT INTO <tenant-schema-4>.<tabela>`.
4. Validate count + spot-check of 10 records + sum of critical numeric fields.
5. Update `status-por-entidade.md` to ✅ or ⚠️ depending on the result.

## When to start using the populated `<tenant-schema-4>`

- After **customers + products + sales + NFe + inventory + financial** reach ≥ 99% reconciled.
- Before that: work with synthetic fixtures in the dev environment (do not use real data, to avoid leaks).

## Anti-patterns

- ❌ Editing files in `BD/` — it is an immutable historical audit.
- ❌ Skipping the rebuild phase (`.py`) and doing ETL directly — keys will diverge.
- ❌ Migrating an entity without first having its dependency migrated (e.g.: sales before customer + product + vendedor).
- ❌ Considering a migration "done" without cross-validation (count + financial sum must match the legacy system).

## References

- Multi-tenant ADR (why only `<tenant-schema-4>` receives a dump): [[../multi-tenant]]
- Target operational schema: [[../modelo-dados/tenant]]
- New FK map: [[../modelo-dados/relacionamentos]]
