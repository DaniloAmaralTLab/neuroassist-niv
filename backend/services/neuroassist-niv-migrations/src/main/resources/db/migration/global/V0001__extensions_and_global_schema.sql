-- schema: global
-- V0001__extensions_and_global_schema.sql
CREATE SCHEMA IF NOT EXISTS neuroassist_global;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA neuroassist_global;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"  WITH SCHEMA neuroassist_global;
CREATE EXTENSION IF NOT EXISTS "pg_trgm"   WITH SCHEMA neuroassist_global;
CREATE EXTENSION IF NOT EXISTS "unaccent"  WITH SCHEMA neuroassist_global;

COMMENT ON SCHEMA neuroassist_global IS
  'Shared catalogues (users, RBAC, vocabulary, pairing, audit-global) and MIG registry. Owner: MIG baseline V0001.';
