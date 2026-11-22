-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   pat-service
-- Generated: 2026-11-20 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 4 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- schema: global
CREATE TABLE gesture_type (
    id           uuid         NOT NULL DEFAULT gen_random_uuid(),
    code         varchar(48)  NOT NULL,
    display_name varchar(80)  NOT NULL,
    description  varchar(255) NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (code)
);
CREATE INDEX idx_gesture_type_code ON gesture_type (code);
COMMENT ON TABLE gesture_type IS 'PAT-owned global primitive vocabulary (ADR-002); code globally unique; append-only in MVP; a name only, not an assertion of engine support (INV-PAT-6).';

-- Seed: initial primitive vocabulary (append-only; codes are stable keys).
INSERT INTO gesture_type (code, display_name, description) VALUES
  ('BLINK',         'Blink',             'A single deliberate eyelid closure.'),
  ('DOUBLE_BLINK',  'Double blink',      'Two deliberate eyelid closures in quick succession.'),
  ('EYEBROW_RAISE', 'Eyebrow raise',     'Raising the eyebrows and holding briefly.'),
  ('LOOK_LEFT',     'Look left',         'Directing the gaze to the left.'),
  ('LOOK_RIGHT',    'Look right',        'Directing the gaze to the right.'),
  ('LOOK_UP',       'Look up',           'Directing the gaze upward.'),
  ('MOUTH_OPEN',    'Mouth open',        'Opening the mouth and holding briefly.'),
  ('SMILE',         'Smile',             'A deliberate smile.')
ON CONFLICT (code) DO NOTHING;

-- schema: tenant
CREATE TABLE patient (
    id          uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id   uuid         NOT NULL,
    label       varchar(120) NOT NULL,
    device_id   uuid         NULL,
    status      varchar(16)  NOT NULL DEFAULT 'active',
    created_by  uuid         NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_patient_status CHECK (status IN ('active', 'inactive'))
);
CREATE INDEX idx_patient_tenant ON patient (tenant_id);
COMMENT ON TABLE patient IS 'Assisted person; tenant-scoped (INV-PAT-1); soft active/inactive, never hard-deleted; device_id opaque ref to EDGE (no FK).';

-- schema: tenant
CREATE TABLE command (
    id                   uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id            uuid         NOT NULL,
    patient_id           uuid         NOT NULL,
    label                varchar(120) NOT NULL,
    urgency              varchar(16)  NOT NULL,
    sensitivity          varchar(8)   NOT NULL,
    primary_primitive_id   uuid       NOT NULL,
    secondary_primitive_id uuid       NULL,
    min_gesture_time_ms  integer      NOT NULL,
    max_gesture_time_ms  integer      NOT NULL,
    status               varchar(16)  NOT NULL DEFAULT 'active',
    created_by           uuid         NOT NULL,
    created_at           timestamptz  NOT NULL DEFAULT now(),
    updated_at           timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_command_urgency     CHECK (urgency IN ('emergency', 'routine')),
    CONSTRAINT chk_command_sensitivity CHECK (sensitivity IN ('low', 'medium', 'high')),
    CONSTRAINT chk_command_status      CHECK (status IN ('active', 'retired')),
    CONSTRAINT chk_command_window
        CHECK (min_gesture_time_ms > 0 AND max_gesture_time_ms >= min_gesture_time_ms),
    CONSTRAINT chk_command_distinct_primitives
        CHECK (secondary_primitive_id IS NULL OR secondary_primitive_id <> primary_primitive_id),
    FOREIGN KEY (patient_id) REFERENCES patient (id)
);
CREATE INDEX idx_command_patient_status ON command (patient_id, status);
CREATE INDEX idx_command_tenant         ON command (tenant_id);
COMMENT ON TABLE command IS 'Gesture->need command with per-command calibration (ADR-003); belongs to one patient same tenant (INV-PAT-2); soft active/retired (INV-PAT-5); primitive ids validated at application layer, no cross-schema FK to gesture_type (G2).';
