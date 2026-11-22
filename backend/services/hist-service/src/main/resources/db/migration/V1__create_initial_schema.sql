-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   hist-service
-- Generated: 2026-11-20 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 7 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

-- schema: tenant
CREATE TABLE audit_record (
    id               text        NOT NULL,
    source           text        NOT NULL,
    action           text        NOT NULL,
    actor_type       text        NOT NULL,
    actor_id         text        NULL,
    tenant_id        text        NOT NULL,
    subject_type     text        NOT NULL,
    subject_id       text        NOT NULL,
    occurred_at      timestamptz NOT NULL,
    received_at      timestamptz NOT NULL DEFAULT now(),
    correlation_id   text        NOT NULL,
    payload_version  integer     NOT NULL DEFAULT 1,
    payload          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    payload_encrypted boolean    NOT NULL DEFAULT false,
    idempotency_key  text        NOT NULL,
    flagged          boolean     NOT NULL DEFAULT false,
    record_hash      text        NULL,
    prev_hash        text        NULL,
    PRIMARY KEY (id),
    UNIQUE (idempotency_key),
    CONSTRAINT ck_audit_record_actor_type
        CHECK (actor_type IN ('caregiver','edge-device','system','service-client'))
);

CREATE INDEX ix_audit_record_subject_time ON audit_record (tenant_id, subject_id, occurred_at DESC);
CREATE INDEX ix_audit_record_correlation  ON audit_record (correlation_id);
CREATE INDEX ix_audit_record_action_src   ON audit_record (action, source, subject_type);
CREATE INDEX ix_audit_record_flagged      ON audit_record (flagged) WHERE flagged = true;

COMMENT ON TABLE audit_record IS 'Append-only tenant-scoped audit trail (INV-HIST-1). No UPDATE/DELETE.';
COMMENT ON COLUMN audit_record.idempotency_key IS 'ADR-003 hybrid key: explicit when supplied, else composite source|subject_type|subject_id|action|occurred_at.';
COMMENT ON COLUMN audit_record.record_hash IS 'ADR-002 Option B reserved (nullable); unused in MVP.';

-- schema: global
CREATE TABLE audit_record_global (
    id               text        NOT NULL,
    source           text        NOT NULL,
    action           text        NOT NULL,
    actor_type       text        NOT NULL,
    actor_id         text        NULL,
    tenant_id        text        NULL,
    subject_type     text        NOT NULL,
    subject_id       text        NOT NULL,
    occurred_at      timestamptz NOT NULL,
    received_at      timestamptz NOT NULL DEFAULT now(),
    correlation_id   text        NOT NULL,
    payload_version  integer     NOT NULL DEFAULT 1,
    payload          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key  text        NOT NULL,
    flagged          boolean     NOT NULL DEFAULT false,
    record_hash      text        NULL,
    prev_hash        text        NULL,
    PRIMARY KEY (id),
    UNIQUE (idempotency_key),
    CONSTRAINT ck_audit_record_global_actor_type
        CHECK (actor_type IN ('caregiver','edge-device','system','service-client'))
);

CREATE INDEX ix_audit_record_global_subject_time ON audit_record_global (subject_id, occurred_at DESC);
CREATE INDEX ix_audit_record_global_correlation  ON audit_record_global (correlation_id);
CREATE INDEX ix_audit_record_global_action_src   ON audit_record_global (action, source, subject_type);

COMMENT ON TABLE audit_record_global IS 'Append-only global-schema audit trail for tenant-less GEST facts (ADR-004 Option A).';

-- schema: tenant
CREATE TABLE audit_subject_key (
    subject_type   text        NOT NULL,
    subject_id     text        NOT NULL,
    key_material   bytea       NOT NULL,
    status         text        NOT NULL DEFAULT 'active',
    created_at     timestamptz NOT NULL DEFAULT now(),
    shredded_at    timestamptz NULL,
    legal_basis_ref text       NULL,
    PRIMARY KEY (subject_type, subject_id),
    CONSTRAINT ck_audit_subject_key_status CHECK (status IN ('active','shredded'))
);

COMMENT ON TABLE audit_subject_key IS 'ADR-006 crypto-shred: per-subject DEK. Erasure deletes the key; audit rows are retained.';

-- schema: global
CREATE TABLE audit_retention_policy (
    fact_class       text        NOT NULL,
    retention_days   integer     NULL,
    legal_hold       boolean     NOT NULL DEFAULT false,
    lawful_basis_ref text        NULL,
    updated_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (fact_class),
    CONSTRAINT ck_audit_retention_days CHECK (retention_days IS NULL OR retention_days > 0)
);

COMMENT ON TABLE audit_retention_policy IS 'ADR-006: retention per fact class + legal hold. Periods TBD with counsel (nullable).';

-- schema: global
CREATE TABLE audit_source (
    source          text        NOT NULL,
    display_name    text        NOT NULL,
    allowed_actions jsonb       NOT NULL DEFAULT '[]'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source)
);

COMMENT ON TABLE audit_source IS 'Producer registry (service id -> allowed actions). Optional at MVP; attribution/validation only.';

-- schema: tenant  (V0065 — additive; supports the patient-scoped timeline read and the whole-period summary, §7)
CREATE INDEX ix_audit_record_patient_time
    ON audit_record (tenant_id, (payload ->> 'patientId'), occurred_at DESC);

-- schema: tenant  (and mirrored for global tables)
GRANT INSERT, SELECT ON audit_record TO hist_app;
GRANT INSERT, SELECT ON audit_subject_key TO hist_app;
GRANT DELETE ON audit_subject_key TO hist_app;   -- crypto-shred key deletion ONLY (ADR-006)
REVOKE UPDATE, DELETE ON audit_record FROM hist_app;
