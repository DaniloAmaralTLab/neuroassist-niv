# CONV — Data Model

> Service: `conv-service` · Stack: Java 21 / Spring Boot + Spring Data JPA · PostgreSQL ·
> **schema-per-tenant** (shared `../../../adr/ADR-003-multi-tenancy.md`). Migrations are **Flyway,
> centralized in MIG**; CONV contributes versioned SQL and ships no runner (doc 05).
> The ```` ```sql ```` blocks below are the **canonical DDL** consumed by `be-migration-generator.py`
> / `be-entity-generator.py`.

## 1. Conventions

- **PK strategy:** UUID (`uuid` column, app-assigned via `gen_random_uuid()` default where created server-side).
- **Timestamps:** `timestamptz`, UTC; `created_at`/`updated_at` on mutable aggregates.
- **Tenancy:** every table lives in the per-tenant `conv` schema (`-- schema: tenant`); there is **no**
  CONV-owned global table (JWKS / model-access version live in ACS/`neuroassist_global`). Every query
  runs under a resolved `TenantContext` (`TenantContextHolder.require()` as the first line of each
  application service; INV-CONV-7).
- **Immutability:** `tree_version` rows (and their `category`/`phrase`/`audio_asset` children) are
  **append-only** — never updated in place; a change is a new version (INV-CONV-1). Only the
  lifecycle `status` column transitions (active → superseded → withdrawn).
- **Cross-service references are id-only:** `patient_id` → PAT, `published_by` → ACS/TRN actor id. No
  cross-service foreign keys.
- **Audio bytes** live in blob/object storage (`storage_ref`); Postgres holds only references/manifests.
- **Encoding:** UTF-8; phrase text is English-only (project constraint).

## 2. Entities

### 2.0 Extensions

```sql
-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- ADR-002: trigram assisted lookup (SearchPort v1)
```

### 2.1 `published_tree` [tenant]

Aggregate root, one row per `(tenant, patient)`. Holds the pointer to the single `active` version
(INV-CONV-2) and whether usage logging is opted in for the patient (INV-CONV-6).

```sql
-- schema: tenant
CREATE TABLE published_tree (
    id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
    patient_id         uuid        NOT NULL,
    active_version_id  uuid        NULL,
    usage_opt_in       boolean     NOT NULL DEFAULT false,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (patient_id)
);
CREATE INDEX ix_published_tree_active ON published_tree (active_version_id);
COMMENT ON TABLE published_tree IS 'CONV aggregate root per patient: active version pointer + usage opt-in (INV-CONV-2, INV-CONV-6).';
```

**Invariants:** INV-CONV-2 (at most one `active` version; `active_version_id` references a
`tree_version` whose `status = active`) — enforced in the publish service transaction. INV-CONV-7
(tenant-scoped; row lives in the tenant `conv` schema).

### 2.2 `tree_version` [tenant]

Immutable snapshot of the whole tree + manifest for one patient. The `content_hash` drives the strong
ETag (INV-CONV-4). `status` is the only mutable column.

```sql
-- schema: tenant
CREATE TABLE tree_version (
    id               uuid        NOT NULL DEFAULT gen_random_uuid(),
    published_tree_id uuid       NOT NULL,
    patient_id       uuid        NOT NULL,
    version          integer     NOT NULL,
    etag             varchar(80) NOT NULL,
    content_hash     varchar(80) NOT NULL,
    status           varchar(16) NOT NULL DEFAULT 'active',
    source_version_ref varchar(200) NULL,
    published_by     uuid        NOT NULL,
    published_at     timestamptz NOT NULL DEFAULT now(),
    withdrawn_at     timestamptz NULL,
    PRIMARY KEY (id),
    UNIQUE (patient_id, version),
    CHECK (status IN ('active','superseded','withdrawn')),
    FOREIGN KEY (published_tree_id) REFERENCES published_tree (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_tree_version_one_active
    ON tree_version (patient_id) WHERE status = 'active';
CREATE INDEX ix_tree_version_patient ON tree_version (patient_id, status);
COMMENT ON TABLE tree_version IS 'Immutable per-patient tree snapshot; content_hash drives the strong ETag (INV-CONV-1, INV-CONV-4).';
```

**Invariants:** INV-CONV-1 (immutable — append-only; only `status`/`withdrawn_at` transition).
INV-CONV-2 (partial unique index `uq_tree_version_one_active` enforces exactly one `active` per
patient). INV-CONV-4 (`etag` is a pure function of `content_hash`).

### 2.3 `category` [tenant]

Grouping node within a version (immutable once published). Self-referencing parent for nesting.

```sql
-- schema: tenant
CREATE TABLE category (
    id               uuid        NOT NULL DEFAULT gen_random_uuid(),
    tree_version_id  uuid        NOT NULL,
    external_id      varchar(80) NOT NULL,
    parent_id        uuid        NULL,
    label            varchar(200) NOT NULL,
    display_order    integer     NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE (tree_version_id, external_id),
    FOREIGN KEY (tree_version_id) REFERENCES tree_version (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES category (id) ON DELETE CASCADE
);
CREATE INDEX ix_category_version ON category (tree_version_id, parent_id, display_order);
COMMENT ON TABLE category IS 'Immutable category node inside a tree_version (INV-CONV-1).';
```

### 2.4 `phrase` [tenant]

Leaf the patient plays: English text + reference to an audio asset in the **same** version (INV-CONV-3).

```sql
-- schema: tenant
CREATE TABLE phrase (
    id               uuid        NOT NULL DEFAULT gen_random_uuid(),
    tree_version_id  uuid        NOT NULL,
    category_id      uuid        NOT NULL,
    external_id      varchar(80) NOT NULL,
    text             varchar(500) NOT NULL,
    display_order    integer     NOT NULL DEFAULT 0,
    asset_id         varchar(80) NOT NULL,
    text_search      tsvector    NULL,
    PRIMARY KEY (id),
    UNIQUE (tree_version_id, external_id),
    FOREIGN KEY (tree_version_id) REFERENCES tree_version (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE CASCADE
);
CREATE INDEX ix_phrase_version ON phrase (tree_version_id, category_id, display_order);
CREATE INDEX ix_phrase_search ON phrase USING gin (text_search);
CREATE INDEX ix_phrase_trgm ON phrase USING gin (text gin_trgm_ops);
COMMENT ON TABLE phrase IS 'Immutable playable leaf; asset_id must resolve in the same version manifest (INV-CONV-3). text_search/trgm back the optional caregiver-side SearchPort (ADR-002), never the patient loop.';
```

**Invariants:** INV-CONV-3 (`asset_id` references an `audio_asset.asset_id` in the same
`tree_version_id` — validated by the publish service, `422 dangling-audio-reference` otherwise).
The `text_search`/`pg_trgm` indexes back only the optional caregiver/TRN-side `SearchPort` (ADR-002);
the patient's live search is client-side over the cached bundle (INV-CONV-5).

### 2.5 `audio_asset` [tenant]

Manifest entry: reference to the pre-synthesized clip. `voice_model_ref` is **sensitive, erasable**
personal data (ADR-005/ADR-006), not the voice model itself.

```sql
-- schema: tenant
CREATE TABLE audio_asset (
    id               uuid        NOT NULL DEFAULT gen_random_uuid(),
    tree_version_id  uuid        NOT NULL,
    asset_id         varchar(80) NOT NULL,
    storage_ref      varchar(400) NOT NULL,
    voice_model_ref  varchar(200) NULL,          -- PERSONAL-DATA: erasable per-subject key ref (ADR-005/006)
    media_type       varchar(60) NOT NULL DEFAULT 'audio/mpeg',
    duration_ms      integer     NOT NULL,
    content_hash     varchar(80) NOT NULL,
    erased           boolean     NOT NULL DEFAULT false,  -- crypto-shred marker (ADR-006)
    erased_at        timestamptz NULL,
    PRIMARY KEY (id),
    UNIQUE (tree_version_id, asset_id),
    CHECK (duration_ms >= 0),
    FOREIGN KEY (tree_version_id) REFERENCES tree_version (id) ON DELETE CASCADE
);
CREATE INDEX ix_audio_asset_version ON audio_asset (tree_version_id);
COMMENT ON TABLE audio_asset IS 'Manifest entry for a pre-synthesized clip. voice_model_ref + storage_ref are crypto-shredded on erasure (ADR-005/006); erased=true -> 410 Gone.';
COMMENT ON COLUMN audio_asset.voice_model_ref IS 'PERSONAL-DATA (biometric-adjacent): erasable per-subject key reference; crypto-shred on erasure (HIST ADR-006).';
```

**Invariants:** INV-CONV-3 (every active-version phrase `asset_id` has a matching row). On erasure,
`erased = true`, `voice_model_ref`/`storage_ref` rendered unreadable (per-subject key deleted), the
immutable row retained (ADR-006).

### 2.6 `usage_signal` [tenant]

Opt-in, minimal telemetry: `phrase_id` + timestamp only. **No free text** (INV-CONV-6). Isolated from
the tree aggregate; short, bounded retention (§5); erasable with the patient's data. Never a HIST fact.

```sql
-- schema: tenant
CREATE TABLE usage_signal (
    id               uuid        NOT NULL DEFAULT gen_random_uuid(),
    patient_id       uuid        NOT NULL,
    phrase_id        varchar(80) NOT NULL,
    occurred_at      timestamptz NOT NULL,
    recorded_at      timestamptz NOT NULL DEFAULT now(),
    idempotency_key  varchar(200) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (patient_id, idempotency_key)
);
CREATE INDEX ix_usage_signal_patient ON usage_signal (patient_id, occurred_at);
COMMENT ON TABLE usage_signal IS 'Opt-in minimal usage (phrase_id + timestamp, NO free text); INV-CONV-6. Short retention (data-model §5); never a HIST audit fact.';
```

**Invariants:** INV-CONV-6 (no free text column by construction; written only when
`published_tree.usage_opt_in = true`; `idempotency_key` unique per patient — SPEC-05).

## 3. Relations

```
published_tree (1) ──< tree_version (N)        [active_version_id → one active]
tree_version   (1) ──< category (N)
tree_version   (1) ──< phrase (N)              phrase.asset_id ─(logical, same version)→ audio_asset.asset_id
tree_version   (1) ──< audio_asset (N)
category       (1) ──< phrase (N)
usage_signal                                   [isolated; patient_id only]
patient_id  ──(id-only, no FK)──> PAT
published_by ──(id-only, no FK)──> ACS/TRN actor
```

## 4. Migration plan (Flyway block — CONV owns **V0070–V0079**)

CONV's reserved Flyway range is **V0070–V0079**. Verified across all modules: ACS `V0010–V0019`,
PAT `V0020–V0029`, EDGE `V0030–V0039`, EVNT/GEST `V0040–V0059`, HIST `V0060–V0069`; **no module uses
`V007x`**, so `V0070–V0079` is the next free block (confirmed by grep of every
`services/*/contracts/data-model.md` and the backend `issues/` tree on 2026-11-20).

| Migration | Schema | Content |
|---|---|---|
| `V0070__conv_extensions.sql` | global | §2.0 pgcrypto + pg_trgm |
| `V0071__conv_published_tree.sql` | tenant | §2.1 `published_tree` |
| `V0072__conv_tree_version.sql` | tenant | §2.2 `tree_version` (+ partial unique active index) |
| `V0073__conv_category.sql` | tenant | §2.3 `category` |
| `V0074__conv_phrase.sql` | tenant | §2.4 `phrase` (+ FTS/trgm indexes) |
| `V0075__conv_audio_asset.sql` | tenant | §2.5 `audio_asset` |
| `V0076__conv_usage_signal.sql` | tenant | §2.6 `usage_signal` |
| `V0077__iam_permissao_conv.sql` | global | seed `conv.tree.read`, `conv.audio.read`, `conv.usage.record`, `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` + bump `neuroassist_global.modelo_acesso_versao` (RBAC process, doc 05) |

> `V0078–V0079` reserved for CONV follow-ups. The IAM permission seed + model-access version bump
> (`V0077`) follows the project RBAC process; the six authority codes are computed with the
> generator's English verb table (D-639), not invented.

## 5. Data lifecycle

- **Tree versions** — retained immutably for traceability; `superseded` versions kept so the
  `TreePublished` audit trail resolves. Pruning of very old `superseded` versions is a post-MVP policy.
- **Audio assets** — biometric-adjacent personal data; on erasure the per-subject key is deleted
  (crypto-shred), `erased = true`, the immutable record retained with payload unreadable; the version
  transitions to `withdrawn` and `AudioAssetsErased` is audited (ADR-005/ADR-006).
- **Usage signals** — minimal, opt-in, **short bounded retention (default 90 days)**, erasable with
  the patient's data; product telemetry only, never a compliance fact (INV-CONV-6).
- **Station offline cache** — owned by the station (FE), not CONV persistence; replaced atomically on
  refresh; staleness observable via `version`/`etag` (ADR-003).

## 6. Schema-level mapping

| Table | Schema |
|---|---|
| (extensions) | global |
| `published_tree` | tenant (`conv`) |
| `tree_version` | tenant (`conv`) |
| `category` | tenant (`conv`) |
| `phrase` | tenant (`conv`) |
| `audio_asset` | tenant (`conv`) |
| `usage_signal` | tenant (`conv`) |
| IAM permission seed | global (`neuroassist_global`) |
