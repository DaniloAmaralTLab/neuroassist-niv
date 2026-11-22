-- =============================================================================
-- Migration: V1__create_initial_schema.sql
-- Service:   edge-service
-- Generated: 2026-11-20 by be-migration-generator.py
-- Source:    contracts/data-model.md (extraído de 5 blocos ```sql```)
--
-- ATENÇÃO: este arquivo é GERADO. Para alterar DDL:
--   1. Edite contracts/data-model.md (blocos ```sql```).
--   2. Re-rode: python scripts/be-migration-generator.py <service> --spec-dir <path> --force
-- =============================================================================

-- schema: global
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- schema: global
CREATE TABLE device_pairing_code (
    code_hash    text         NOT NULL,
    tenant_id    uuid         NOT NULL,
    device_id    uuid         NOT NULL,
    expires_at   timestamptz  NOT NULL,
    consumed_at  timestamptz  NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (code_hash),
    UNIQUE (device_id)
);
CREATE INDEX idx_pairing_code_expires ON device_pairing_code (expires_at);
CREATE INDEX idx_pairing_code_device  ON device_pairing_code (device_id);
COMMENT ON TABLE device_pairing_code IS 'Global single-use pairing routing tuple (ADR-003); code hashed at rest; resolves code->(tenant_id, device_id) before tenant context; no patient data; swept after expiry/consumption (INV-EDGE-3).';

-- schema: tenant
CREATE TABLE edge_device (
    id                uuid         NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         uuid         NOT NULL,
    patient_id        uuid         NOT NULL,
    lifecycle_state   varchar(16)  NOT NULL DEFAULT 'awaiting_claim',
    connectivity      varchar(8)   NULL,
    last_heartbeat_at timestamptz  NULL,
    paired_at         timestamptz  NULL,
    enrolled_by       uuid         NOT NULL,
    credential_id     text         NULL,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT chk_edge_device_lifecycle
        CHECK (lifecycle_state IN ('awaiting_claim', 'paired', 'deactivated', 'revoked')),
    CONSTRAINT chk_edge_device_connectivity
        CHECK (connectivity IS NULL OR connectivity IN ('online', 'offline')),
    CONSTRAINT chk_edge_device_connectivity_paired
        CHECK (lifecycle_state = 'paired' OR connectivity IS NULL)
);
CREATE INDEX idx_edge_device_tenant          ON edge_device (tenant_id);
CREATE INDEX idx_edge_device_patient         ON edge_device (patient_id);
CREATE INDEX idx_edge_device_watchdog        ON edge_device (lifecycle_state, connectivity, last_heartbeat_at);
CREATE UNIQUE INDEX uq_edge_device_credential ON edge_device (credential_id) WHERE credential_id IS NOT NULL;
COMMENT ON TABLE edge_device IS 'Edge station aggregate; tenant-scoped (INV-EDGE-1); lifecycle awaiting_claim|paired|deactivated|revoked; connectivity meaningful only while paired; credential_id = current edge.device jti/kid (INV-EDGE-2); patient_id/enrolled_by id-only (INV-EDGE-8); no hard delete.';

-- schema: tenant
CREATE TABLE edge_credential_revocation (
    credential_id text         NOT NULL,
    tenant_id     uuid         NOT NULL,
    device_id     uuid         NOT NULL,
    reason        varchar(16)  NOT NULL,
    revoked_at    timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (credential_id),
    CONSTRAINT chk_edge_revocation_reason CHECK (reason IN ('revoke', 'unpair', 'rotate')),
    FOREIGN KEY (device_id) REFERENCES edge_device (id)
);
CREATE INDEX idx_edge_revocation_device ON edge_credential_revocation (device_id);
COMMENT ON TABLE edge_credential_revocation IS 'Immediate edge.device revocation list (G1); consulted by introspection + heartbeat refresh; a listed credential_id is never refreshed and fails introspection (INV-EDGE-6); reason revoke|unpair|rotate (rotate = superseded on reactivation G3).';

-- schema: tenant
CREATE TABLE cached_catalog (
    device_id   uuid         NOT NULL,
    tenant_id   uuid         NOT NULL,
    patient_id  uuid         NOT NULL,
    pat_etag    text         NULL,
    payload     jsonb        NOT NULL,
    fetched_at  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (device_id),
    FOREIGN KEY (device_id) REFERENCES edge_device (id)
);
CREATE INDEX idx_cached_catalog_patient ON cached_catalog (patient_id);
COMMENT ON TABLE cached_catalog IS 'Per-device last-good PAT command catalog served offline (ADR-004, INV-EDGE-5); payload = resolved commands; pat_etag backs If-None-Match refresh to PAT; derived, dropped on unpair/revoke; EDGE owns device-facing ETag and staleness.';
