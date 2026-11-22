-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   acs-service
-- Generated: 2026-11-20 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 7 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- schema: global
CREATE TABLE tenant (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    type        varchar(16) NOT NULL,
    name        varchar(160) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_tenant_type CHECK (type IN ('family', 'clinic'))
);
COMMENT ON TABLE tenant IS 'Care unit (family|clinic); onboarded only by platform-ops (INV-5).';

-- schema: global
CREATE TABLE caregiver_identity_lookup (
    username     varchar(120) NOT NULL,
    tenant_id    uuid         NOT NULL,
    caregiver_id uuid         NOT NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (username),
    FOREIGN KEY (tenant_id) REFERENCES tenant (id)
);
CREATE INDEX idx_identity_lookup_tenant ON caregiver_identity_lookup (tenant_id);
COMMENT ON TABLE caregiver_identity_lookup IS 'Global login->tenant router (INV-6); resolves authentication before tenant context. Credential lives in per-tenant caregiver. See data-model TODO[architect] on placement reconciliation.';

-- schema: tenant
CREATE TABLE caregiver (
    id            uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     uuid         NOT NULL,
    username      varchar(120) NOT NULL,
    password_hash varchar(255) NOT NULL,
    role          varchar(24)  NOT NULL,
    status        varchar(16)  NOT NULL DEFAULT 'active',
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (tenant_id, username),
    CONSTRAINT chk_caregiver_role   CHECK (role IN ('caregiver', 'clinic_coordinator')),
    CONSTRAINT chk_caregiver_status CHECK (status IN ('active', 'deactivated'))
);
CREATE INDEX idx_caregiver_tenant ON caregiver (tenant_id);
COMMENT ON TABLE caregiver IS 'Human login; tenant-scoped (INV-1); role from RoleAuthorityPolicy; soft-deactivated, never hard-deleted.';

-- schema: tenant
CREATE TABLE caregiver_patient_link (
    id           uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    uuid        NOT NULL,
    caregiver_id uuid        NOT NULL,
    patient_id   uuid        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (caregiver_id, patient_id),
    FOREIGN KEY (caregiver_id) REFERENCES caregiver (id)
);
CREATE INDEX idx_link_patient ON caregiver_patient_link (patient_id);
COMMENT ON TABLE caregiver_patient_link IS 'Caregiver->Patient authorization edge; patient_id references PAT by id (no FK across service boundary); unique per (caregiver,patient).';

-- schema: tenant
CREATE TABLE patient_session (
    id             uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id      uuid         NOT NULL,
    patient_id     uuid         NOT NULL,
    device_id      uuid         NOT NULL,
    provisioned_by uuid         NOT NULL,
    token_jti      uuid         NOT NULL,
    status         varchar(16)  NOT NULL DEFAULT 'active',
    revoked_by     uuid         NULL,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    revoked_at     timestamptz  NULL,
    PRIMARY KEY (id),
    UNIQUE (token_jti),
    CONSTRAINT chk_session_status CHECK (status IN ('active', 'revoked')),
    CONSTRAINT chk_session_revoked_consistency
        CHECK ((status = 'revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL)
            OR (status = 'active'  AND revoked_by IS NULL     AND revoked_at IS NULL)),
    FOREIGN KEY (provisioned_by) REFERENCES caregiver (id),
    FOREIGN KEY (revoked_by)     REFERENCES caregiver (id)
);
CREATE INDEX idx_session_patient ON patient_session (patient_id);
CREATE INDEX idx_session_status  ON patient_session (status);
COMMENT ON TABLE patient_session IS 'Non-expiring revocable patient session (ADR-012 C); authorities limited to conv.*/gest.* (INV-3); no expires_at by design (ADR-003).';

-- schema: global
CREATE TABLE jwt_blacklist (
    jti              uuid         NOT NULL,
    reason           varchar(40)  NOT NULL,
    blacklisted_at   timestamptz  NOT NULL DEFAULT now(),
    token_expires_at timestamptz  NULL,
    PRIMARY KEY (jti)
);
CREATE INDEX idx_blacklist_expiry ON jwt_blacklist (token_expires_at);
COMMENT ON TABLE jwt_blacklist IS 'Stateless-JWT revocation store (SEC-001); token_expires_at NULL for non-expiring patient sessions (retained until the token can no longer be presented). Entries prunable after natural expiry.';
