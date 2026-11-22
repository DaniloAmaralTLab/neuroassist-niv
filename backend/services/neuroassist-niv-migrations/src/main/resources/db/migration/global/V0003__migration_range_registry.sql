-- schema: global
-- V0003__migration_range_registry.sql
CREATE TABLE neuroassist_global.migration_range_registry (
    block_from     VARCHAR(10)  NOT NULL,              -- e.g. 'V0001'
    block_to       VARCHAR(10)  NOT NULL,              -- e.g. 'V0009'
    owner_module   VARCHAR(10)  NOT NULL,              -- e.g. 'MIG', 'ACS', 'PAT'
    schema_target  VARCHAR(10)  NOT NULL,              -- 'global' | 'tenant' | 'both'
    confirmed      BOOLEAN      NOT NULL DEFAULT TRUE, -- FALSE = proposed, unnumbered on disk (G1)
    description    TEXT         NOT NULL,
    declared_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (block_from, block_to),
    UNIQUE (owner_module, block_from),
    CHECK (schema_target IN ('global', 'tenant', 'both')),
    CHECK (block_from <= block_to)
);

CREATE INDEX idx_mrr_owner ON neuroassist_global.migration_range_registry (owner_module);

COMMENT ON TABLE neuroassist_global.migration_range_registry IS
  'Authoritative reserved Flyway version-block map (ADR-004, closes PAT G1). One row per block; confirmed=false marks a proposed, not-yet-numbered range.';
