# MIG — Data Model (Baseline Block + Range Registry)

> MIG owns **no business data and no PHI** (doc 05 §Data Lifecycle). It owns exactly
> **one** persistent table — `migration_range_registry` in `neuroassist_global` — plus
> the baseline infrastructure every schema needs (extensions, the global schema,
> `uuid_generate_v7()`, the per-tenant template baseline) and Flyway's own
> `flyway_schema_history` ledger (created/owned by Flyway, not modelled here).
>
> This file is the **canonical DDL** for MIG's baseline block `V0001–V0009`
> (ADR-004). The ` ```sql ` blocks are executable and are what
> `be-migration-generator.py` consumes into Flyway scripts; each block's first line
> is the `-- schema:` routing annotation (`persistence.arch.json`). Invariants
> `INV-MIG-1..7` are declared in `03-initial-domain-framing.md`.

## 1. Conventions

- **PK strategy:** UUID **v7** (time-ordered) via `uuid_generate_v7()` — the
  project-wide PK convention (`persistence.arch.json`). MIG's own registry table is
  small reference data and uses a natural composite key instead (see §2.1), but the
  function is a **baseline precondition for every other module's tables**, so MIG
  defines it (G5).
- **Timestamps:** `TIMESTAMPTZ`, UTC, `DEFAULT now()`.
- **Schema routing:** the first line of each DDL block is `-- schema: global` or
  `-- schema: tenant`. Global blocks → `neuroassist_global`; tenant blocks → **every**
  `t_<tenantId>` from one template set so all tenants converge to one version.
- **Extensions** live once in `neuroassist_global`; tenant runs keep it on
  `search_path` (INV-MIG-5).
- **Naming:** MIG-owned tables are `migration_`-prefixed to avoid generic-name
  collision in the shared schema (Learning pitfall).

## 0. Extensions and baseline functions (runs first)

Installed once in `neuroassist_global`. `uuid_generate_v7()` **has no standard
Postgres implementation** (the `uuid-ossp` extension stops at v4) — so the baseline
**defines it** as a PL/pgSQL function that builds a v7 UUID (48-bit millisecond
timestamp + version/variant bits + random tail). This **resolves doc 06 G5**.

```sql
-- schema: global
-- V0001__extensions_and_global_schema.sql
CREATE SCHEMA IF NOT EXISTS neuroassist_global;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA neuroassist_global;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"  WITH SCHEMA neuroassist_global;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"   WITH SCHEMA neuroassist_global;
CREATE EXTENSION IF NOT EXISTS "unaccent"  WITH SCHEMA neuroassist_global;

COMMENT ON SCHEMA neuroassist_global IS
  'Shared catalogues (users, RBAC, vocabulary, pairing, audit-global) and MIG registry. Owner: MIG baseline V0001.';
```

```sql
-- schema: global
-- V0002__uuid_generate_v7.sql
-- Time-ordered UUIDv7 (draft RFC 9562). No native Postgres function of this name
-- exists; the baseline provides it so every module's UUID v7 PK default resolves
-- (resolves doc 06 G5). Lives in neuroassist_global; on tenant search_path (INV-MIG-5).
CREATE OR REPLACE FUNCTION neuroassist_global.uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    unix_ts_ms  bigint;
    uuid_bytes  bytea;
BEGIN
    unix_ts_ms := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
    -- 16 random bytes, then overwrite the first 6 with the millisecond timestamp
    uuid_bytes := gen_random_bytes(16);
    uuid_bytes := set_byte(uuid_bytes, 0, (unix_ts_ms >> 40) & 255);
    uuid_bytes := set_byte(uuid_bytes, 1, (unix_ts_ms >> 32) & 255);
    uuid_bytes := set_byte(uuid_bytes, 2, (unix_ts_ms >> 24) & 255);
    uuid_bytes := set_byte(uuid_bytes, 3, (unix_ts_ms >> 16) & 255);
    uuid_bytes := set_byte(uuid_bytes, 4, (unix_ts_ms >>  8) & 255);
    uuid_bytes := set_byte(uuid_bytes, 5,  unix_ts_ms        & 255);
    -- version 7 in the high nibble of byte 6
    uuid_bytes := set_byte(uuid_bytes, 6, (112 | (get_byte(uuid_bytes, 6) & 15)));
    -- RFC 4122 variant (10xx) in the high bits of byte 8
    uuid_bytes := set_byte(uuid_bytes, 8, (128 | (get_byte(uuid_bytes, 8) & 63)));
    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;

COMMENT ON FUNCTION neuroassist_global.uuid_generate_v7() IS
  'Time-ordered UUIDv7 PK generator (baseline V0002, resolves doc 06 G5). Depends on pgcrypto.gen_random_bytes.';
```

> **Invariants:** `gen_random_bytes` comes from `pgcrypto`, so V0002 must run after
> V0001. The function is **repeatable-safe** (`CREATE OR REPLACE`) but ships as a
> **versioned** baseline script because every module's PK default references it — it
> is a precondition, not a reseed.

## 2. MIG-owned tables

### 2.1 `migration_range_registry` [global]

The authoritative, machine-checkable map of reserved `V00xx` blocks to owner modules
(ADR-004). It **closes PAT gap G1**: the reserved ranges stop being prose scattered
across eight `doc 05` files and become a single queryable table that the range-guard
(`RangeRegistry.java`) validates before any apply. One row per reserved block. The
natural key is the `(block_from, block_to)` range; blocks must not overlap
(INV-MIG-2, enforced by the guard, not by a DB constraint since range-overlap is not
expressible in a simple UNIQUE).

```sql
-- schema: global
-- V0003__migration_range_registry.sql
CREATE TABLE neuroassist_global.migration_range_registry (
    block_from     VARCHAR(10)  NOT NULL,              -- e.g. 'V0001'
    block_to       VARCHAR(10)  NOT NULL,              -- e.g. 'V0009'
    owner_module   VARCHAR(10)  NOT NULL,              -- e.g. 'MIG', 'ACS', 'PAT'
    schema_target  VARCHAR(10)  NOT NULL,              -- 'global' | 'tenant' | 'both'
    confirmed      BOOLEAN      NOT NULL DEFAULT TRUE,  -- FALSE = proposed, unnumbered on disk (G1)
    description    TEXT         NOT NULL,
    declared_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (block_from, block_to),
    UNIQUE (owner_module, block_from),
    CHECK (schema_target IN ('global', 'tenant', 'both')),
    CHECK (block_from <= block_to)
);

CREATE INDEX idx_mrr_owner ON neuroassist_global.migration_range_registry (owner_module);

COMMENT ON TABLE neuroassist_global.migration_range_registry IS
  'Authoritative reserved Flyway version-block map (ADR-004, closes PAT G1). One row per block; confirmed=false marks a proposed, not-yet-numbered range.';
```

**Invariants:** INV-MIG-2 — a version number belongs to **exactly one** module's
block; blocks never overlap. The DB enforces no-duplicate-start and valid range; the
**no-overlap across different starts** is checked by `RangeRegistry.java` before an
apply (an overlap is a build/guard failure, not a silent DB accept).

### 2.2 Seed of the reserved-block map [global]

Seeded in the baseline. EVNT/GEST/HIST rows carry `confirmed = FALSE` — they are the
`+10`-convention **proposals** that are still unnumbered on disk (G1) and must be
confirmed with each module before that module's migration issues are emitted.

```sql
-- schema: global
-- V0004__seed_migration_range_registry.sql
INSERT INTO neuroassist_global.migration_range_registry
    (block_from, block_to, owner_module, schema_target, confirmed, description)
VALUES
    ('V0001', 'V0009', 'MIG',  'both',   TRUE,  'Baseline: extensions, global schema, uuid_generate_v7, registry, tenant template'),
    ('V0010', 'V0012', 'ACS',  'both',   TRUE,  'caregiver, patient_session, jwt_blacklist'),
    ('V0020', 'V0022', 'PAT',  'both',   TRUE,  'gesture_type (global); patient, command (tenant)'),
    ('V0030', 'V0032', 'EDGE', 'both',   TRUE,  'device_pairing_code (global); edge_device, cached_catalog (tenant); rolling V0033+'),
    ('V0040', 'V0049', 'EVNT', 'tenant', FALSE, 'PROPOSED (+10 convention, unconfirmed): event + indexes'),
    ('V0050', 'V0059', 'GEST', 'global', FALSE, 'PROPOSED (+10 convention, unconfirmed): engine-capability registry'),
    ('V0060', 'V0069', 'HIST', 'both',   FALSE, 'PROPOSED (+10 convention, unconfirmed): audit_record (tenant), audit_record_global, audit_source'),
    ('V0070', 'V0079', 'CONV', 'both',   TRUE,  'tree versions, audio assets; V0077 seeds conv.* authorities'),
    ('V0080', 'V0089', 'TRN',  'both',   FALSE, 'PROPOSED by TRN (trn doc 05): voice consent/model/sample, publication; trn.* authorities')
ON CONFLICT (block_from, block_to) DO NOTHING;
```

> **Note on the orchestrator hint (ADR-004):** the hint proposed `V0080–V0089` for
> MIG, but TRN already proposes that block on disk — so MIG takes the **baseline
> block `V0001–V0009`** instead (the only block that must run before ACS's `V0010`).
> No one may re-add MIG at `V0080–V0089`.

### 2.3 Tenant-template baseline [tenant]

The lowest tenant-scoped script, applied to **every** `t_<tenantId>`. It does not
create business tables (each module authors those in its own block) — it only ensures
the tenant schema is a valid Flyway target on the global search_path. Kept minimal so
new tenants converge with existing ones.

```sql
-- schema: tenant
-- V0005__tenant_template_baseline.sql
-- Applied to every t_<tenantId>. neuroassist_global is on search_path (INV-MIG-5),
-- so extension operator classes (pg_trgm, unaccent) and uuid_generate_v7() resolve
-- here without re-installing anything per tenant.
COMMENT ON SCHEMA CURRENT_SCHEMA IS
  'NeuroAssist NIV tenant schema (care unit). Baseline V0005. Business tables authored by each module in its reserved block.';
```

> **Invariants:** INV-MIG-5 — a tenant run executes with
> `search_path = t_<tenantId>, neuroassist_global`; nothing in the tenant template
> re-installs an extension. Blocks `V0006–V0009` are reserved for future baseline
> housekeeping (global or tenant) and are intentionally left free.

## 3. Flyway history layout (owned by Flyway, not by MIG)

Each schema carries its own `flyway_schema_history` table (Flyway-managed). MIG
**reads** it to compute the next version and the per-schema report; it never writes
it directly.

| Schema | History table | Content |
|---|---|---|
| `neuroassist_global` | `neuroassist_global.flyway_schema_history` | applied state of every **global** block (MIG baseline + each module's global scripts) |
| `t_<tenantId>` (each) | `t_<tenantId>.flyway_schema_history` | applied state of the **tenant-template** set for that tenant |

`THE SYSTEM SHALL read each schema's flyway_schema_history to compute the next version as max(global ∪ tenant histories) + 1 (INV-MIG-4), never a per-schema-local max.`
`THE SYSTEM SHALL treat each committed V*.sql as immutable; validateOnMigrate=true (INV-MIG-3).`

## 4. Schema-level mapping (routing summary)

| Table / object | Schema | Routing annotation | Owner block |
|---|---|---|---|
| extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`, `unaccent`) | `neuroassist_global` | `-- schema: global` | MIG V0001 |
| `uuid_generate_v7()` | `neuroassist_global` | `-- schema: global` | MIG V0002 |
| `migration_range_registry` | `neuroassist_global` | `-- schema: global` | MIG V0003 |
| range-registry seed | `neuroassist_global` | `-- schema: global` | MIG V0004 |
| tenant-template baseline | every `t_<tenantId>` | `-- schema: tenant` | MIG V0005 |
| `flyway_schema_history` | per schema | n/a (Flyway-owned) | — |
| business tables (caregiver, patient, event, …) | per `-- schema:` in each module's data-model | each module's block | ACS/PAT/EDGE/… |

## 5. Migration plan (reserved blocks)

The authoritative reserved-block table lives in §2.2 as **seed data**, and in doc 05
§"Reserved-block registry" as prose. MIG's baseline occupies `V0001–V0009`; the next
version at any time is `max(global ∪ tenant histories) + 1` (INV-MIG-4). A block is a
**reservation**, not a license to insert below the current max (`outOfOrder = false`,
INV-MIG-3).

`IF a new script's version is lower than the current max across global ∪ tenant histories, THEN THE SYSTEM SHALL reject it (outOfOrder=false, INV-MIG-4).`
`IF two reserved blocks overlap on any version number, THEN THE SYSTEM SHALL fail the range-registry guard before applying anything (INV-MIG-2).`
