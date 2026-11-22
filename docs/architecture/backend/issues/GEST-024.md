# GEST-024 -- BDD feature capability-declare-validation — PAT fail-closed, uniqueness, global invariants (INV-GEST-1, INV-GEST-2, INV-GEST-3)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the executable Gherkin feature `capability-declare-validation.feature` and its step
definitions. Covers: PAT vocabulary validation on declare (absent code → `400`, PAT down → `503`
fail-closed), uniqueness upsert on the `(engineVersion, gestureTypeCode)` pair (INV-GEST-2), and
global invariant verification (no `tenant_id` scoping, INV-GEST-3).

NOTE (learning pitfall): when generating step definitions for the `POST /gest/capabilities` endpoint,
read `CapabilityService.declare()` signature (`engineVersion`, `gestureTypeCode`, `supportStatus`,
`notes`, `actorId`) to ensure step parameters map to the service API, not to the validation envelope.

## Spec de referencia
- SPEC-08 (BDD — feature capability-declare-validation coverage map)
- SPEC-03 (vocabulary validation, fail-closed)
- contracts/api-contract.md §3.4

## Escopo
- [ ] implementar `src/test/resources/features/capability-declare-validation.feature`
- [ ] implementar `src/test/java/com/neuroassist/gest/bdd/steps/CapabilityDeclareValidationSteps.java`

## Resultado esperado
All scenarios pass. PAT-absent-code → `400`. PAT-unreachable → `503`. Duplicate-pair → upsert, `200`.

## Criterios de aceite
- [ ] AC-1: Scenario "unknown gesture type code" uses `code=WINK_LEFT` absent from PAT → `400 gesture-type-code-unknown` (INV-GEST-1).
- [ ] AC-2: Scenario "PAT vocabulary unavailable" stubs PAT at WireMock to return `503` → GEST responds `503 pat-vocabulary-unavailable` with `Retry-After` header.
- [ ] AC-3: Scenario "re-declare updates status" declares `(1.3.0, BLINK)` twice with different `supportStatus` → second declare responds `200` and the row is updated (INV-GEST-2 unique upsert).
- [ ] AC-4: Scenario "global registry — no tenant scoping" verifies that the same capability is returned for callers from two different tenants (INV-GEST-3).
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for all scenarios in this feature file.

## Dependencias
- GEST-010 (precede — CapabilityService declare)
- GEST-015 (precede — GestureVocabularyPort + PatGestureTypeClient WireMock)
- GEST-019 (precede — authority guard)

## Estimativa
L

## Prioridade
P8
