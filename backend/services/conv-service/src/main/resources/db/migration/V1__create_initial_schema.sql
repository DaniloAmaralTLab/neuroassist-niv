-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   conv-service
-- Generated: 2026-11-22 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 7 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- ADR-002: trigram assisted lookup (SearchPort v1)

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
