-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   trn-service
-- Generated: 2026-11-22 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 10 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram assisted dedup fallback when ES is degraded (ADR-006)

-- schema: tenant
CREATE TABLE training_session (
    id                  uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           varchar(50)  NOT NULL,
    patient_id          uuid         NOT NULL,
    opened_by           uuid         NOT NULL,
    status              varchar(16)  NOT NULL DEFAULT 'open',
    dialog_context_ref  varchar(200) NULL,
    opened_at           timestamptz  NOT NULL DEFAULT now(),
    closed_at           timestamptz  NULL,
    created_at          timestamptz  NOT NULL DEFAULT now(),
    created_by          uuid         NULL,
    updated_at          timestamptz  NOT NULL DEFAULT now(),
    updated_by          uuid         NULL,
    PRIMARY KEY (id),
    CHECK (status IN ('open','closed'))
);
CREATE INDEX ix_training_session_patient ON training_session (tenant_id, patient_id, status);
COMMENT ON TABLE training_session IS 'TRN authoring session for one patient; parents proposals. dialog_context_ref points to minimal context, never a raw LLM transcript (ADR-004). Tenant-scoped (INV-TRN-8).';

-- schema: tenant
CREATE TABLE proposal (
    id            uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     varchar(50)  NOT NULL,
    session_id    uuid         NOT NULL,
    patient_id    uuid         NOT NULL,
    type          varchar(16)  NOT NULL,
    label         varchar(200) NULL,
    text          varchar(500) NULL,
    parent_ref    varchar(80)  NULL,
    state         varchar(24)  NOT NULL DEFAULT 'draft',
    origin        varchar(16)  NOT NULL DEFAULT 'assistant',
    created_at    timestamptz  NOT NULL DEFAULT now(),
    created_by    uuid         NULL,
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    updated_by    uuid         NULL,
    PRIMARY KEY (id),
    CHECK (type IN ('category','phrase')),
    CHECK (origin IN ('assistant','caregiver')),
    CHECK (state IN ('draft','proposed','caregiver_approved','patient_approved','approved',
                     'synthesizing','indexed','published','rejected','withdrawn','erased')),
    CHECK ( (type = 'phrase'   AND text  IS NOT NULL)
         OR (type = 'category' AND label IS NOT NULL) ),
    FOREIGN KEY (session_id) REFERENCES training_session (id) ON DELETE CASCADE
);
CREATE INDEX ix_proposal_session ON proposal (session_id, state);
CREATE INDEX ix_proposal_patient ON proposal (tenant_id, patient_id, state);
CREATE INDEX ix_proposal_text_trgm ON proposal USING gin (text gin_trgm_ops);
COMMENT ON TABLE proposal IS 'Draft category/phrase + lifecycle state (ADR-003). LLM reaches only draft/proposed (INV-TRN-2); no raw transcript retained (ADR-004).';

-- schema: tenant
CREATE TABLE authorization (
    proposal_id                 uuid         NOT NULL,
    tenant_id                   varchar(50)  NOT NULL,
    caregiver_confirmed_by      uuid         NULL,
    caregiver_confirmed_at      timestamptz  NULL,
    patient_confirmed_by        varchar(120) NULL,
    patient_assent_method       varchar(40)  NULL,
    patient_assent_evidence_ref varchar(200) NULL,
    patient_relationship        varchar(40)  NULL,
    patient_confirmed_at        timestamptz  NULL,
    created_at                  timestamptz  NOT NULL DEFAULT now(),
    updated_at                  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (proposal_id),
    FOREIGN KEY (proposal_id) REFERENCES proposal (id) ON DELETE CASCADE,
    CHECK ( caregiver_confirmed_by IS NULL
         OR patient_confirmed_by   IS NULL
         OR caregiver_confirmed_by::text <> patient_confirmed_by )
);
COMMENT ON TABLE authorization IS 'Dual-authorization VO 1:1 with proposal (ADR-002). Both halves required and DISTINCT for approved (INV-TRN-1). patient_relationship set when a guardian substitutes for a non-verbal patient; NULL on self-assent. Patient assent is a domain fact, not a trn.* authority (ACS INV-3).';

-- schema: tenant
CREATE TABLE consent_record (
    id                        uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id                 varchar(50)  NOT NULL,
    patient_id                uuid         NOT NULL,
    scope                     varchar(24)  NOT NULL DEFAULT 'voice_cloning',
    granted_by_patient        boolean      NOT NULL DEFAULT false,
    granted_by_representative boolean      NOT NULL DEFAULT false,
    representative_ref        varchar(120) NULL,
    status                    varchar(16)  NOT NULL DEFAULT 'granted',
    evidence_ref              varchar(200) NULL,
    granted_at                timestamptz  NOT NULL DEFAULT now(),
    revoked_at                timestamptz  NULL,
    revoked_by                uuid         NULL,
    created_at                timestamptz  NOT NULL DEFAULT now(),
    updated_at                timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CHECK (scope IN ('voice_cloning')),
    CHECK (status IN ('granted','revoked')),
    CHECK (status <> 'granted' OR (granted_by_patient AND granted_by_representative))
);
CREATE UNIQUE INDEX uq_consent_one_active
    ON consent_record (tenant_id, patient_id, scope) WHERE status = 'granted';
COMMENT ON TABLE consent_record IS 'Voice-cloning consent of patient + legal representative, before any synthesis (ADR-005, INV-TRN-3). granted requires BOTH halves; at most one active consent per patient+scope.';

-- schema: tenant
CREATE TABLE voice_model (
    id                    uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id             varchar(50)  NOT NULL,
    patient_id            uuid         NOT NULL,
    vendor_voice_model_id varchar(200) NULL,     -- PERSONAL-DATA: ElevenLabs model id (ADR-005)
    voice_model_ref       varchar(200) NULL,     -- PERSONAL-DATA: erasable per-subject key ref (ADR-005/006)
    status                varchar(16)  NOT NULL DEFAULT 'active',
    created_at            timestamptz  NOT NULL DEFAULT now(),
    updated_at            timestamptz  NOT NULL DEFAULT now(),
    erased_at             timestamptz  NULL,
    PRIMARY KEY (id),
    CHECK (status IN ('active','erased'))
);
CREATE UNIQUE INDEX uq_voice_model_one_active
    ON voice_model (tenant_id, patient_id) WHERE status = 'active';
COMMENT ON COLUMN voice_model.vendor_voice_model_id IS 'PERSONAL-DATA (biometric-adjacent): ElevenLabs voice-model id; deleted at the vendor on erasure (ADR-005).';
COMMENT ON COLUMN voice_model.voice_model_ref IS 'PERSONAL-DATA: erasable per-subject key reference; crypto-shred on erasure (ADR-005/006).';

-- schema: tenant
CREATE TABLE voice_sample (
    id           uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    varchar(50)  NOT NULL,
    patient_id   uuid         NOT NULL,
    storage_ref  varchar(400) NOT NULL,     -- PERSONAL-DATA: blob ref under per-subject key (ADR-005)
    content_hash varchar(80)  NOT NULL,
    captured_at  timestamptz  NOT NULL DEFAULT now(),
    erased       boolean      NOT NULL DEFAULT false,
    erased_at    timestamptz  NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX ix_voice_sample_patient ON voice_sample (tenant_id, patient_id, erased);
COMMENT ON TABLE voice_sample IS 'Patient voice recordings; bytes in blob storage under a per-subject crypto key (ADR-005). Crypto-shredded on erasure (erased=true).';

-- schema: tenant
CREATE TABLE audio_asset (
    id              uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       varchar(50)  NOT NULL,
    patient_id      uuid         NOT NULL,
    proposal_id     uuid         NULL,
    asset_id        varchar(80)  NOT NULL,
    storage_ref     varchar(400) NOT NULL,     -- PERSONAL-DATA: synthesized clip ref under per-subject key
    voice_model_ref varchar(200) NULL,         -- PERSONAL-DATA: erasable per-subject key ref (ADR-005/006)
    media_type      varchar(60)  NOT NULL DEFAULT 'audio/mpeg',
    duration_ms     integer      NOT NULL,
    content_hash    varchar(80)  NOT NULL,
    status          varchar(16)  NOT NULL DEFAULT 'available',
    created_at      timestamptz  NOT NULL DEFAULT now(),
    erased_at       timestamptz  NULL,
    PRIMARY KEY (id),
    UNIQUE (tenant_id, patient_id, asset_id),
    CHECK (duration_ms >= 0),
    CHECK (status IN ('available','erased')),
    FOREIGN KEY (proposal_id) REFERENCES proposal (id) ON DELETE SET NULL
);
CREATE INDEX ix_audio_asset_patient ON audio_asset (tenant_id, patient_id, status);
COMMENT ON TABLE audio_asset IS 'Synthesized clip handed to CONV in the publish manifest (assetId/storageRef/voiceModelRef/contentHash). Crypto-shred on erasure (ADR-005/006). INV-TRN-4: every published phrase has an available asset.';

-- schema: tenant
CREATE TABLE publication (
    id              uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       varchar(50)  NOT NULL,
    patient_id      uuid         NOT NULL,
    approval_id     uuid         NOT NULL,
    idempotency_key varchar(200) NOT NULL,
    conv_version_id uuid         NULL,
    status          varchar(16)  NOT NULL DEFAULT 'pending',
    attempt_count   integer      NOT NULL DEFAULT 0,
    last_error      varchar(500) NULL,
    published_at    timestamptz  NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (tenant_id, approval_id),
    UNIQUE (tenant_id, idempotency_key),
    CHECK (status IN ('pending','published','failed'))
);
CREATE INDEX ix_publication_patient ON publication (tenant_id, patient_id, status);
COMMENT ON TABLE publication IS 'One immutable publication per approval, idempotent on trn:publish:<approvalId> (INV-TRN-6). conv_version_id returned by CONV (api-contract §5).';

-- schema: tenant
CREATE TABLE outbound_job (
    id              uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       varchar(50)  NOT NULL,
    patient_id      uuid         NULL,
    job_type        varchar(32)  NOT NULL,
    target_ref      varchar(200) NULL,
    idempotency_key varchar(200) NOT NULL,
    status          varchar(16)  NOT NULL DEFAULT 'pending',
    attempt_count   integer      NOT NULL DEFAULT 0,
    next_attempt_at timestamptz  NOT NULL DEFAULT now(),
    last_error      varchar(500) NULL,
    payload         jsonb        NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (tenant_id, job_type, idempotency_key),
    CHECK (job_type IN ('synthesize','index','publish','retire','erase_conv_audio','audit')),
    CHECK (status IN ('pending','in_progress','done','failed'))
);
CREATE INDEX ix_outbound_job_due ON outbound_job (status, next_attempt_at);
COMMENT ON TABLE outbound_job IS 'Broker-free durable-retry queue (ADR-007). Idempotent per (job_type, idempotency_key). Never-blocked facts (erase_conv_audio, revocation audit) are enqueued and retried until accepted (INV-TRN-9).';
