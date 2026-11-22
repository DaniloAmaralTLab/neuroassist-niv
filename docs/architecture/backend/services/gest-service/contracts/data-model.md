# GEST — Data Model

> Service: `gest-service` · Module **GEST** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot · **Global schema `neuroassist_global`** (INV-GEST-3, local ADR-003) ·
> Migrations: Flyway, run through the centralized **MIG** module against the global schema.
> EARS authoring guide: `../../../standards/ears-notation.md`.

## 1. Conventions

- **PK strategy:** UUID primary keys (`uuid`), generated application-side.
- **Timestamps:** `timestamptz`, UTC. `created_at` / `declared_at` set on insert; `updated_at`
  bumped on every mutation.
- **Soft-retire, no delete:** rows are appended and soft-retired (`support_status = unsupported`,
  `engine_version.status = deprecated`); there is **no** physical delete (INV-GEST-6, append-only).
- **No tenant column:** GEST is global (INV-GEST-3). No table carries `tenant_id`; every row is
  disclosed identically to all tenants.
- **Encoding:** UTF-8. `gesture_type_code` stores PAT vocabulary codes **by value** (never an FK
  into PAT's schema — cross-service reference by code, INV-GEST-1).
- **Schema routing:** every DDL block below begins with `-- schema: global`, so the generator routes
  it to `db/migration/global/` (the `neuroassist_global` schema, MIG-coordinated).

## 2. Entities

### 2.1 `engine_version` [global]

An identifiable release of the on-station detection engine / model bundle. Supporting registry so
capability rows always key to a known version. `version` is the unique external key. `status`
transitions one-way `active → deprecated`; a deprecated version keeps its rows resolvable but accepts
no new declarations (api-contract §2.4).

```sql
-- schema: global
CREATE TABLE engine_version (
    id            uuid        NOT NULL,
    version       text        NOT NULL,
    display_label text        NOT NULL,
    status        text        NOT NULL DEFAULT 'active',
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (version),
    CHECK (status IN ('active', 'deprecated'))
);

CREATE INDEX ix_engine_version_status ON engine_version (status);
COMMENT ON TABLE engine_version IS 'GEST global registry of detection-engine/model versions (INV-GEST-3).';
```

**Invariants:** `version` unique (external key). `status` constrained to the `EngineStatus` enum.
One-way `active → deprecated` is enforced in the service layer (no trigger; api-contract §2.4).

### 2.2 `engine_capability` [global]

The one fact GEST owns: engine version *V* supports gesture-type code *C* with a `support_status`.
Unique on `(engine_version_id, gesture_type_code)` (INV-GEST-2). `gesture_type_code` is a reference
**by value** to PAT's global `GestureType` vocabulary, validated at declare time via
`GET /pat/gesture-types` (INV-GEST-1) — deliberately **not** a foreign key (PAT owns the vocabulary).
Absence of a row means `unknown` (never stored; surfaced only by `support-check`).

```sql
-- schema: global
CREATE TABLE engine_capability (
    id                uuid        NOT NULL,
    engine_version_id uuid        NOT NULL,
    gesture_type_code text        NOT NULL,
    support_status    text        NOT NULL,
    notes             text        NULL,
    declared_by       text        NOT NULL,
    declared_at       timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (engine_version_id, gesture_type_code),
    CHECK (support_status IN ('supported', 'experimental', 'unsupported')),
    FOREIGN KEY (engine_version_id) REFERENCES engine_version (id) ON DELETE RESTRICT
);

CREATE INDEX ix_engine_capability_version ON engine_capability (engine_version_id);
CREATE INDEX ix_engine_capability_code    ON engine_capability (gesture_type_code);
COMMENT ON TABLE engine_capability IS 'GEST global capability registry: (engineVersion, gestureTypeCode) -> supportStatus (INV-GEST-2).';
COMMENT ON COLUMN engine_capability.gesture_type_code IS 'Reference BY VALUE to PAT global GestureType.code; validated at declare (INV-GEST-1), never an FK.';
```

**Invariants:** `(engine_version_id, gesture_type_code)` unique (INV-GEST-2). `support_status`
constrained to the `SupportStatus` enum. `ON DELETE RESTRICT` enforces append-only (an engine version
ever referenced can never be deleted; data-lifecycle §Data Lifecycle of the vision 05). INV-GEST-1
(code exists in PAT) and INV-GEST-6 (terminal re-support only via explicit re-declare) are enforced in
the service layer, not by DDL.

## 3. Relations (ASCII)

```
engine_version (1) ──< (N) engine_capability
       id        ◄────────  engine_version_id (FK, RESTRICT)

engine_capability.gesture_type_code  ·····>  PAT.gesture_type.code   (by value, no FK; INV-GEST-1)
```

## 4. Migration plan (Flyway, global schema)

Reserved Flyway ranges across NeuroAssist NIV global artefacts:

| Module | Reserved range |
|---|---|
| ACS | `V0010`–`V0012` |
| PAT | `V0020`–`V0022` |
| EDGE | `V0030`–`V0032` |
| EVNT | `V0040`–`V0044` |
| **GEST** | **`V0050`–`V0059`** (reserved by this spec) |

GEST scripts (applied to `neuroassist_global` through MIG):

| Script | Contents |
|---|---|
| `V0050__create_engine_version.sql` | `engine_version` table + `ix_engine_version_status` + comment |
| `V0051__create_engine_capability.sql` | `engine_capability` table + unique + FK + indexes + comments |

`V0052`–`V0059` remain reserved for future GEST global changes. GEST owns **no** per-tenant
(`t_<tenantId>`) migration set — it has no per-tenant table (vision 05).

EARS:

- THE SYSTEM SHALL apply all GEST migrations to schema `neuroassist_global` only, and SHALL NOT create any `tenant_id` column (INV-GEST-3).
- IF a migration attempts to delete an `engine_version` referenced by any `engine_capability`, THEN the database SHALL reject it (`ON DELETE RESTRICT`), preserving resolvability for stations on older engines.

## 5. Schema-level mapping

| Table | Schema |
|---|---|
| `engine_version` | `neuroassist_global` (global) |
| `engine_capability` | `neuroassist_global` (global) |
