-- schema: global
-- V0004__seed_migration_range_registry.sql
INSERT INTO neuroassist_global.migration_range_registry
    (block_from, block_to, owner_module, schema_target, confirmed, description)
VALUES
    ('V0001', 'V0009', 'MIG',  'both',   TRUE,  'Baseline: extensions, global schema, uuid_generate_v7, registry, tenant template'),
    ('V0010', 'V0012', 'ACS',  'both',   TRUE,  'caregiver, patient_session, jwt_blacklist'),
    ('V0020', 'V0022', 'PAT',  'both',   TRUE,  'gesture_type (global); patient, command (tenant)'),
    ('V0030', 'V0032', 'EDGE', 'both',   TRUE,  'device_pairing_code (global); edge_device, cached_catalog (tenant); rolling V0033+'),
    ('V0040', 'V0049', 'EVNT', 'tenant', FALSE, 'PROPOSED (+10 convention, unconfirmed): event + indexes'),
    ('V0050', 'V0059', 'GEST', 'global', FALSE, 'PROPOSED (+10 convention, unconfirmed): engine-capability registry'),
    ('V0060', 'V0069', 'HIST', 'both',   FALSE, 'PROPOSED (+10 convention, unconfirmed): audit_record (tenant), audit_record_global, audit_source'),
    ('V0070', 'V0079', 'CONV', 'both',   TRUE,  'tree versions, audio assets; V0077 seeds conv.* authorities'),
    ('V0080', 'V0089', 'TRN',  'both',   FALSE, 'PROPOSED by TRN (trn doc 05): voice consent/model/sample, publication; trn.* authorities')
ON CONFLICT (block_from, block_to) DO NOTHING;
