-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   gest-service
-- Generated: 2026-11-20 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 2 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

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
