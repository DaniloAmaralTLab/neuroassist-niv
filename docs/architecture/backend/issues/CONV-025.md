# CONV-025 -- BDD scenarios implementation — full Gherkin coverage: tree-bundle-read (ETag/304/cold-patient), tree-publish (hard-502), tree-retire-and-erase (durable-retry), usage-signal (SPEC-08)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

Fills in the five Cucumber feature files from SPEC-08 §feature-index with real Gherkin scenarios.
Mandatory coverage: `tree-bundle-read.feature` — ETag/304/cold-patient/tenant-isolation;
`audio-playback.feature` — immutable cache/erased→410; `tree-publish.feature` — supersede/
dangling-ref 422/hard-502/idempotency; `tree-retire-and-erase.feature` — `:retire`/crypto-shred/
commit+durable-retry; `usage-signal.feature` — opt-in/no-free-text/opt-out-discard/idempotent.
Scenario Outline placeholders that feed `{string}` steps must be **quoted in the step text**;
Examples table values must be **unquoted** (SPEC-08 §BDD-stub-layout note, D-bdd-duplicate pitfall).
HIST stub asserts canonical envelope + idempotency key (event-contracts §3).

## Escopo
- [ ] implementar `backend/services/conv-service/src/test/resources/features/tree-bundle-read.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/audio-playback.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/tree-publish.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/tree-retire-and-erase.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/usage-signal.feature`
- [ ] validar que nenhum passo de step usa `{string}` com valores já entre aspas na Examples table (D-bdd-duplicate pitfall)

## Criterios de aceite
- [ ] AC-1 `tree-publish.feature` includes a scenario that verifies the hard-502 rollback (HIST stub returns 503 → publish returns 502, no `tree_version` row created)
- [ ] AC-2 `tree-retire-and-erase.feature` includes a scenario that verifies commit+durable-retry (HIST unavailable → state committed, audit queued, `200 OK` returned)
- [ ] AC-3 `tree-bundle-read.feature` includes scenarios for cold patient (404), valid ETag (304), and tenant isolation (cross-tenant returns 404)
- [ ] AC-4 `usage-signal.feature` includes scenarios for free-text rejection (400) and opt-out silent discard (202, no row written)
- [ ] AC-5 `./gradlew :conv-service:integrationTest` exits 0 with all scenarios passing

## Dependencias
- CONV-024 (precede — BDD scaffold and step classes exist)
- CONV-018 (precede — retire implemented)
- CONV-019 (precede — erase implemented)

## Estimativa
S

## Prioridade
P8
