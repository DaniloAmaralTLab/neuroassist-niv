-- schema: tenant
-- V0005__tenant_template_baseline.sql
-- Applied to every t_<tenantId>. neuroassist_global is on search_path (INV-MIG-5),
-- so extension operator classes (pg_trgm, unaccent) and uuid_generate_v7() resolve
-- here without re-installing anything per tenant.
COMMENT ON SCHEMA CURRENT_SCHEMA IS
  'NeuroAssist NIV tenant schema (care unit). Baseline V0005. Business tables authored by each module in its reserved block.';
