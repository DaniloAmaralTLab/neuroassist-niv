# GEST-022 -- BDD feature engine-capability-registry — declare/retire/deprecate/authority (INV-GEST-2, INV-GEST-5, INV-GEST-6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the executable Gherkin feature `engine-capability-registry.feature` and its step
definitions. Covers the core write lifecycle: declare (new pair + re-declare after retire), retire
(terminal, idempotent), deprecate (blocks new declarations), and the authority guard on write paths
(INV-GEST-5). Uses the step vocabulary from SPEC-08.

NOTE (learning pitfall): step definitions for POST validate endpoints MUST match the actual
`CapabilityService` and `EngineVersionService` API (inputs: engineVersion, gestureTypeCode,
supportStatus) — do NOT generate steps matching a different shape. Read the service interfaces before
authoring step stubs.

## Spec de referencia
- SPEC-08 (BDD — feature engine-capability-registry coverage map)
- contracts/api-contract.md §2.3–2.4, §3.4–3.5

## Escopo
- [ ] implementar `src/test/resources/features/engine-capability-registry.feature`
- [ ] implementar `src/test/java/com/neuroassist/gest/bdd/steps/EngineCapabilityRegistrySteps.java`

## Resultado esperado
All scenarios in `engine-capability-registry.feature` pass with `./gradlew :gest-service:test`.
Scenarios cover: declare new pair, re-declare after retire (INV-GEST-6), deprecate blocks new declare,
read-only token on write path gets `403` (INV-GEST-5).

## Criterios de aceite
- [ ] AC-1: Scenario "declare a new capability" uses step `Given code "BLINK" on engine "1.3.0" has no declaration` and results in `201 Created`.
- [ ] AC-2: Scenario "re-declare after retire" issues a declare for `(1.3.0, BLINK)` where the existing row is `unsupported` → allowed, responds `200` with `EngineCapabilityDeclared` audit recorded (INV-GEST-6).
- [ ] AC-3: Scenario "deprecate blocks new declare" sets engine `1.2.0` to deprecated then attempts a declare → `409 engine-version-deprecated`.
- [ ] AC-4: Scenario "authority guard" uses an `edge.device` token without `gest.capability.create` authority and gets `403` (INV-GEST-5).
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 running all scenarios in this feature file.

## Dependencias
- GEST-010 (precede — CapabilityService declare)
- GEST-011 (precede — CapabilityService retire)
- GEST-014 (precede — JPA persistence adapter)
- GEST-019 (precede — authority guard)

## Estimativa
L

## Prioridade
P8
