# EDGE-034 -- BDD — `DetectionLapseSteps.java` (PendingException stubs only, no duplicate patterns) + feature copy to `src/test/resources/features/`

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Adds BDD coverage for ADR-005 (SAFETY-GEST-1) by wiring the pre-authored
`detection-lapse.feature` (at `docs/architecture/backend/services/edge-service/tests/cucumber/`)
into the Cucumber runtime.

**Existing step patterns that must NOT be re-defined here** (already implemented in EDGE-024/025
step classes):
- `Given a tenant "T1" with a patient "P1"` (BaseStepDefinitions or EnrollmentSteps)
- `Given a paired device "D1" with a live edge.device token holding "<authority>"` (EnrollmentSteps)
- `Then the response status is <code>` (BaseStepDefinitions)
- `Then the device connectivity is "<state>"` (HeartbeatSteps or RevocationSteps)
- `When a caregiver reads GET /edge/devices/D1` (DeviceManagementSteps)
- `Then an "<action>" audit is recorded to HIST` (BaseStepDefinitions)
- `When the device posts a heartbeat` (HeartbeatSteps — no detection state)

**New step patterns defined ONLY in `DetectionLapseSteps.java`** (20 new patterns, each defined
exactly once, PendingException body only):
- `Given the detection-lapse threshold is {int} seconds`
- `When the device posts a heartbeat with detectionState {string}`
- `When the device posts a heartbeat without a detectionState`
- `Given the device last reported detectionState {string} beyond the lapse threshold`
- `Given the device last reported detectionState {string} for {int} seconds`
- `Given the device has sent no heartbeat beyond the lapse threshold`
- `When the detection-lapse sweep scans`
- `When the detection-lapse sweep scans again`
- `Then the device detectionState is {string}`
- `Then the device lastDetectingAt is updated`
- `Then the device lastDetectingAt is not updated`
- `Then a detection-lapse episode is opened with cause {string}`
- `Then no detection-lapse episode is opened`
- `Then the lapse is raised to EVNT with a service-client token and an idempotency key`
- `Given device {string} already has an open detection-lapse episode`
- `Then no second detection-lapse episode is opened`
- `And no second raise is sent to EVNT`
- `Then the open detection-lapse episode is resolved`
- `And EVNT is notified to resolve the episode`
- `And EVNT is unreachable`
- `Then the detection-lapse episode stays open and unraised`
- `Then the lapse is scheduled for retry`

Note: edge-service already has 29 duplicate step patterns from earlier phases (EDGE-024/025 Ledger).
`DetectionLapseSteps.java` MUST NOT introduce any pattern that already exists elsewhere.

## Spec de referencia
- SPEC-08 (BDD — feature file table: `detection-lapse.feature`; reusable steps section)
- ADR-005-detection-state-and-lapse-alert.md (covered scenarios)
- integration-contracts.md §6.2 (EVNT raise/resolve shape for the step stubs)

## Escopo
- [ ] copiar `docs/architecture/backend/services/edge-service/tests/cucumber/detection-lapse.feature` para `backend/services/edge-service/src/test/resources/features/detection-lapse.feature`
- [ ] criar `backend/services/edge-service/src/test/java/com/neuroassist/edge/bdd/steps/DetectionLapseSteps.java` — anotação `@CucumberContextConfiguration` ou extensão do contexto Spring Boot existente; implementar **exatamente** os 22 novos patterns listados acima com corpo `throw new io.cucumber.java.PendingException()` apenas; cada método anotado `@Given`/`@When`/`@Then`/`@And` usando **Cucumber Expressions** (não regex); nenhum pattern duplicado de EDGE-024/025
- [ ] verificar (compilar) que nenhum pattern de `DetectionLapseSteps.java` duplica os de `EnrollmentSteps`, `HeartbeatSteps`, `CatalogSteps`, `RevocationSteps` (ArchUnit ou revisão manual via `grep` antes do commit)

## Criterios de aceite
- [ ] AC-1 `detection-lapse.feature` is present under `src/test/resources/features/` and all 10 scenarios compile with Cucumber (no "undefined step" error at startup)
- [ ] AC-2 `DetectionLapseSteps.java` contains exactly the step patterns listed above; no pattern matches any definition already in EDGE-024/025 step classes (zero duplicate Cucumber Expression patterns)
- [ ] AC-3 All step bodies throw `PendingException` only (no implementation yet — that is EDGE-033/028/031 scope)
- [ ] AC-4 `./gradlew :edge-service:test --tests "*.detection-lapse*"` runs the feature and reports all scenarios as PENDING (not FAILED and not UNDEFINED)

## Dependencias
- EDGE-024 (BDD setup + existing step infrastructure — precede)
- EDGE-025 (step definitions for catalog/revocation features — precede, provides context for no-duplicate check)
- EDGE-027 (DetectionState enum — needed for step stubs to compile if they reference the enum type)

## Estimativa
S

## Prioridade
P8
