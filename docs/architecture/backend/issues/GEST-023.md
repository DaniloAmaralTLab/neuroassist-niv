# GEST-023 -- BDD feature support-check-detectable-gate — detectable flag, ETag/304, no-PAT call (INV-GEST-7, INV-GEST-4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the executable Gherkin feature `support-check-detectable-gate.feature` and its step
definitions. Covers: per-code detectable computation, absent-row `unknown` handling, unknown
engineVersion → all `unknown` (advisory, not error), ETag generation and `304 Not Modified` on
If-None-Match hit, and confirmation that PAT is never called on the support-check path.

## Spec de referencia
- SPEC-08 (BDD — feature support-check-detectable-gate coverage map, INV-GEST-7)
- SPEC-03 (support-check gate — PAT not called on read path)
- contracts/api-contract.md §3.3

## Escopo
- [ ] implementar `src/test/resources/features/support-check-detectable-gate.feature`
- [ ] implementar `src/test/java/com/neuroassist/gest/bdd/steps/SupportCheckSteps.java`

## Resultado esperado
All scenarios in `support-check-detectable-gate.feature` pass. `detectable` logic is verified for
all three `supportStatus` values + absent row. ETag-based `304` scenario passes.

## Criterios de aceite
- [ ] AC-1: Scenario "supported code is detectable" checks `code=BLINK, supportStatus=supported → detectable=true`.
- [ ] AC-2: Scenario "experimental code is detectable" checks `code=DOUBLE_BLINK, supportStatus=experimental → detectable=true`.
- [ ] AC-3: Scenario "unsupported/absent code is not detectable" checks `code=BROW_RAISE` (no declaration) → `supportStatus=unknown, detectable=false`.
- [ ] AC-4: Scenario "unknown engineVersion" sends `engineVersion=9.9.9` → `200` with every code `unknown / detectable=false` (advisory, not `404`).
- [ ] AC-5: Scenario "If-None-Match 304" calls support-check twice with same input; second call with the first response's ETag → `304 Not Modified`.
- [ ] AC-6: `GestureVocabularyPort` is NOT invoked during any `support-check` scenario (PAT not called on read path, SPEC-03).
- [ ] AC-7: `./gradlew :gest-service:test` exits 0 for all scenarios in this feature file.

## Dependencias
- GEST-011 (precede — CapabilityService.checkSupport + ETagService)
- GEST-014 (precede — JPA persistence adapter)

## Estimativa
L

## Prioridade
P8
