-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   evnt-service
-- Generated: 2026-11-20 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 4 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

-- schema: global
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid() available if DB-side default ever needed

-- schema: tenant
CREATE TABLE event (
    id             uuid        NOT NULL,
    tenant_id      uuid        NOT NULL,
    patient_id     uuid        NOT NULL,
    command_id     uuid        NOT NULL,
    command_label  text        NOT NULL,
    urgency        text        NOT NULL,
    device_id      uuid        NOT NULL,
    report_id      text        NOT NULL,
    occurred_at    timestamptz NOT NULL,
    confirmed_at   timestamptz NULL,
    confirmed_by   uuid        NULL,
    feedback       text        NOT NULL DEFAULT 'not_evaluated',
    report_meta    jsonb       NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uq_event_device_report UNIQUE (device_id, report_id),
    CONSTRAINT ck_event_urgency  CHECK (urgency IN ('emergency', 'routine')),
    CONSTRAINT ck_event_feedback CHECK (feedback IN ('not_evaluated', 'real', 'false_positive')),
    CONSTRAINT ck_event_confirm_pair CHECK (
        (confirmed_at IS NULL AND confirmed_by IS NULL)
        OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)),
    CONSTRAINT ck_event_confirm_emergency CHECK (
        confirmed_at IS NULL OR urgency = 'emergency')
);

-- Active-alarm read-time query (ADR-010; INV-EVNT-3): newest unconfirmed emergency per patient.
CREATE INDEX ix_event_active_alarm ON event (patient_id, occurred_at DESC)
    WHERE urgency = 'emergency' AND confirmed_at IS NULL;

-- History / recent-events read surface.
CREATE INDEX ix_event_patient_time ON event (patient_id, occurred_at DESC);

COMMENT ON TABLE event IS 'EVNT aggregate: one structured event per recognized gesture; active alarm is a read-time query (ADR-010).';

-- schema: tenant
CREATE TABLE push_subscription (
    id            uuid        NOT NULL,
    tenant_id     uuid        NOT NULL,
    caregiver_id  uuid        NOT NULL,
    endpoint      text        NOT NULL,
    p256dh_key    text        NOT NULL,
    auth_key      text        NOT NULL,
    user_agent    text        NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_used_at  timestamptz NULL,
    revoked_at    timestamptz NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_push_sub_endpoint UNIQUE (tenant_id, endpoint)
);

CREATE INDEX ix_push_sub_caregiver ON push_subscription (tenant_id, caregiver_id)
    WHERE revoked_at IS NULL;
COMMENT ON TABLE push_subscription IS 'Caregiver Web Push (VAPID) subscriptions — Tier 0 out-of-band channel (ADR-005).';

-- schema: tenant
CREATE TABLE escalation_attempt (
    id                  uuid        NOT NULL,
    tenant_id           uuid        NOT NULL,
    event_id            uuid        NOT NULL,
    tier                smallint    NOT NULL,
    channel             text        NOT NULL,
    caregiver_id        uuid        NOT NULL,
    channel_target      text        NOT NULL,
    status              text        NOT NULL DEFAULT 'pending',
    attempt_no          smallint    NOT NULL DEFAULT 1,
    provider_message_id text        NULL,
    error_reason        text        NULL,
    scheduled_for       timestamptz NOT NULL,
    attempted_at        timestamptz NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT uq_escalation_tier UNIQUE (event_id, tier, caregiver_id, channel_target),
    CONSTRAINT ck_escalation_tier    CHECK (tier IN (0, 1, 2)),
    CONSTRAINT ck_escalation_channel CHECK (channel IN ('web_push', 'sms', 'voice')),
    CONSTRAINT ck_escalation_status  CHECK (status IN ('pending', 'sent', 'failed')),
    CONSTRAINT fk_escalation_event FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE
);

CREATE INDEX ix_escalation_event ON escalation_attempt (event_id, tier);
COMMENT ON TABLE escalation_attempt IS 'Out-of-band escalation attempts (push/sms/voice) per emergency; uq enforces one attempt per tier+target (ESC-4).';
