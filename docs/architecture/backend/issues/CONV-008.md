# CONV-008 -- Flyway V0070–V0076 — CONV schema: extensions (pgcrypto+pg_trgm) + 6 tenant tables (data-model.md §2–§4)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Contexto

Creates Flyway migrations V0070–V0076 (CONV's reserved block per data-model.md §4). These
migrations are contributed to MIG (`neuroassist-niv-migrations` service) which owns the
centralized runner — CONV ships SQL only, no Flyway runner (doc 04/05). V0070 runs in the
`global` schema (pgcrypto + pg_trgm extensions). V0071–V0076 create the six tenant-scoped
tables in the `conv` schema: `published_tree`, `tree_version` (with the partial unique index
`uq_tree_version_one_active` for INV-CONV-2), `category`, `phrase` (FTS + trigram indexes for
`SearchPort` ADR-002), `audio_asset`, and `usage_signal`. DDL matches data-model.md §2 exactly.
Block V0078–V0079 reserved for CONV follow-ups.

## Escopo
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0070__conv_extensions.sql`
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0071__conv_published_tree.sql`
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0072__conv_tree_version.sql`
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0073__conv_category.sql`
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0074__conv_phrase.sql`
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0075__conv_audio_asset.sql`
- [ ] implementar `backend/services/neuroassist-niv-migrations/src/main/resources/db/migration/V0076__conv_usage_signal.sql`
- [ ] verificar que V0070–V0076 não colidem com outros módulos (ACS V0010s, PAT V0020s, EDGE V0030s, EVNT/GEST V0040–V0059, HIST V0060–V0069)

## Criterios de aceite
- [ ] AC-1 `V0070__conv_extensions.sql` creates `pgcrypto` and `pg_trgm` extensions in the global schema without error on a clean PostgreSQL container
- [ ] AC-2 `V0072__conv_tree_version.sql` includes `CREATE UNIQUE INDEX uq_tree_version_one_active ON tree_version (patient_id) WHERE status = 'active'` (partial unique index, INV-CONV-2)
- [ ] AC-3 `V0074__conv_phrase.sql` includes GIN indexes on `text_search` and `text gin_trgm_ops` (ADR-002 SearchPort)
- [ ] AC-4 All six migrations apply cleanly in a Testcontainers PostgreSQL IT (`./gradlew :neuroassist-niv-migrations:integrationTest` exits 0)

## Dependencias
- CONV-001 (precede — conv-service module exists as context)
- HIST-related MIG issues (MIG range V0060–V0069 must already be in-flight to verify no overlap)

## Estimativa
S

## Prioridade
P3
