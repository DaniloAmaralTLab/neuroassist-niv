# Persistence Conventions — NeuroAssist NIV

> Canonical Postgres + JPA conventions applicable to **all** NeuroAssist NIV entities.
>
> **Source of truth:** `templates/architecture/decisions/persistence.arch.json` (D-066).
> This markdown is generated deterministically. Do not edit by hand — the next render overwrites it.

## Primary Key

- **Strategy:** `uuid_v7`
- **Generator function:** `uuid_generate_v7()`
- **SQL type:** `UUID`

**Rationale:** Time-ordered UUIDs cluster well in B-tree indexes (unlike v4) and avoid index hot-spots that BIGSERIAL would create under high write rate. Single PK strategy across all tables keeps the migration generator and entity generator uniform.

## Required Postgres extensions

`be-migration-generator` emits `CREATE EXTENSION IF NOT EXISTS` in V0001 of each schema. Canonical list:

| Extension | Purpose |
|---|---|
| `uuid-ossp` | Provides uuid_generate_v4 fallback and is required by some uuid_v7 implementations. |
| `pgcrypto` | gen_random_uuid() used in seed migrations; some uuid_v7 implementations build on it. |
| `pg_trgm` | Trigram indexes for substring search on names, codes and descriptions. |
| `unaccent` | Accent-insensitive search (LOWER(unaccent(nome)) LIKE ...). |

## Audit columns

All aggregate roots (all_root_aggregates) carry 4 audit columns:

| Column | Type | Meaning |
|---|---|---|
| `criado_em` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | Creation time |
| `criado_por_usuario_id` | `UUID` | User who created it |
| `atualizado_em` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | Time of the last update |
| `atualizado_por_usuario_id` | `UUID` | User who last updated it |

`be-entity-generator` inserts these columns automatically in roots; in opt-in entities (`applies_to=opt_in`), declare them explicitly in the DDL.

## Soft-delete

Instead of a physical `DELETE`, aggregate roots have:

- **Column:** `ativo`
- **Type:** `BOOLEAN NOT NULL DEFAULT TRUE`
- **Companion table:** `exclusao_documento` — stores the deletion event (reason, user, timestamp) for audit.

List queries filter by `ativo = TRUE` by default; cross-schema audit queries may ignore it.

## Canonical column types

| Canonical name | SQL | Java | When to use |
|---|---|---|---|
| `monetary` | `NUMERIC(15,2)` | `java.math.BigDecimal` | Money amounts (BRL). 13 digits before the decimal handles totals well into the billions, 2 decimals match centavos. |
| `quantity` | `NUMERIC(15,4)` | `java.math.BigDecimal` | Item quantities. 4 decimals accommodate fractional units (kg, m³, hours). |
| `unit_price` | `NUMERIC(15,4)` | `java.math.BigDecimal` | Unit prices that may have sub-cent precision (e.g. tax rates applied per unit). |
| `percentage` | `NUMERIC(5,2)` | `java.math.BigDecimal` | Percentages 0..100 with 2 decimals. Always validated with CHECK (col BETWEEN 0 AND 100). |
| `tenant_id_slug` | `VARCHAR(50)` | `java.lang.String` | Tenant id slug like 'emp_alpha' (matches schema name). |
| `code_short` | `VARCHAR(20)` | `java.lang.String` | Short codes (UFs, CFOPs, status enums, numbered identifiers like 'ORC-2026-00042'). |
| `name_long` | `VARCHAR(150)` | `java.lang.String` | Long human names (cliente.nome, produto.descricao). |

Use these when writing DDL — it avoids precision drift between tables (one has `NUMERIC(10,2)`, another `NUMERIC(15,2)`, reconciliation breaks).

## Human-readable numbering

Documents with a human-readable number (quotes, sales, orders, proposals) follow the pattern:

- **Pattern:** `<PREFIX>-<YEAR>-<SERIAL>`
- **Example:** `ORC-2026-00042`
- **Serial padding:** 5 digits (zero-pad)
- **Postgres sequence:** `seq_<entity>_numero` (one per entity)
- **SQL type:** `VARCHAR(20)`

The serial comes from `nextval('seq_orcamento_numero')` + current year.

## Schema annotation

Each DDL block declares its target schema in the first comment; `be-migration-generator` routes the block to `db/migration/<schema>/V<N>__<modulo>_<descricao>.sql`.

- **Comment prefix:** `-- schema: <schema>`
- **Valid values:** `global`, `tenant`

Example:

```sql
-- schema: tenant
CREATE TABLE orcamento (
    orcamento_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    ...
);
```

First line of every DDL block declares its target schema. be-migration-generator routes the block to db/migration/<schema>/V<N>__<module>_<description>.sql accordingly.

## Foreign Keys

| Relationship type | Strategy |
|---|---|
| Same schema | `physical_fk` (explicit REFERENCES) |
| Cross schema | `logical_fk` (UUID without REFERENCES, validation in service) |

Cross-schema FK uses a UUID column WITHOUT REFERENCES; referential integrity is enforced in the application service (with a lookup that fails with not_found before persisting).

**Rationale:** Postgres does support cross-schema FK in principle but it complicates per-tenant schema lifecycle (drop, restore, migration). Logical FK with service-level validation keeps schemas independently movable.

## Snapshot pattern (ADR-005)

Fields suffixed with `_snapshot` (e.g. `cliente_nome_snapshot`, `vendedor_regra_comissao_snapshot`) capture the **state at the moment of the decision** and become immutable from:

```
status IN ('CONFIRMADA','FATURADA','CANCELADA')
```

Fields suffixed with _snapshot are immutable once the parent aggregate transitions to a closed state. Enforced in the application service (rejects updates) and in the cancellation policy (cancellation creates a new immutable record rather than mutating the original).

## Encoding

`UTF-8` in all schemas — do not use LATIN1 or WIN1252 (it hampers consistent accent handling of the migrated legacy data).

## How to evolve this convention

1. Edit `templates/architecture/decisions/persistence.arch.json` — adjust the specific field (add `column_type`, change `applies_to`, etc.).
2. Validate: `python scripts/arch_decisions.py validate --aspect persistence`.
3. Bump `version` and `last_changed`.
4. Re-render this markdown.
5. Migrate existing tables if the change is breaking (renamed audit columns, for example) — a single `neuroassist-niv-migrations` migration to align all schemas.

## Anti-patterns

- ❌ Editing this markdown directly — it is generated. The next render overwrites it.
- ❌ Using `NUMERIC(10,2)` or `NUMERIC(12,4)` ad hoc — always reference a canonical `column_type` from the catalog above. Add a new type via JSON if needed.
- ❌ Forgetting audit columns on an aggregate root — `be-entity-generator` complains (future Phase 2 hook).
- ❌ Physical cross-schema FK — always validate logical FK in service.
- ❌ Mutating a `_snapshot` field after `status IN ('CONFIRMADA','FATURADA','CANCELADA')` — invariant violation.
- ❌ Inventing your own numbering pattern (`ORC2026/00042` instead of `ORC-2026-00042`) — breaks parsing/global searches.
