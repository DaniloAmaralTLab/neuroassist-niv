# CONV-021 -- SearchPort adapter v1 — Postgres FTS + pg_trgm over phrase (caregiver/TRN-side only, NOT on patient station path, ADR-002, SPEC-10)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Implements `SearchPortAdapter` v1 — the Postgres FTS + trigram adapter for `SearchPort`
(ADR-002). Uses the `tsvector` column `phrase.text_search` for full-text search and `pg_trgm`
index on `phrase.text` for fuzzy/partial matching, both seeded by V0074. This adapter is for
**caregiver/TRN-side assisted lookup only** — it must NEVER be called on the patient station
path (INV-CONV-5, SPEC-10 §3). The `SearchPort` interface methods must be annotated/documented
with this constraint. The v1 adapter is Postgres-only; a later ES/kNN upgrade replaces it
behind the same port with no contract change (ADR-002).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/search/SearchPortAdapter.java`
- [ ] garantir que nenhum controller patient-session invoca `SearchPort` (ArchUnit test ou revisão manual)

## Criterios de aceite
- [ ] AC-1 `SearchPortAdapter.searchPhrases(query, treeVersionId)` executes a parameterized query using `text_search @@ plainto_tsquery(:query)` OR `text % :query` (trigram) over `phrase.text_search`/`phrase.text` for the given `tree_version_id`
- [ ] AC-2 An IT confirms the adapter returns matching phrases; the `GET /conv/tree` station path does NOT invoke `SearchPort` (INV-CONV-5)
- [ ] AC-3 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-005 (precede — SearchPort interface)
- CONV-010 (precede — PhraseEntity with text_search column)
- CONV-008 (precede — pg_trgm extension and GIN indexes in V0074)

## Estimativa
S

## Prioridade
P6
