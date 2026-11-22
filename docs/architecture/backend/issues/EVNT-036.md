# EVNT-036 -- BDD — detection-lapse-alerting.feature copy + DetectionLapseAlertingSteps.java stubs, 28 new step patterns (SPEC-12 LAPSE-1..LAPSE-7)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

End-to-end BDD scenarios for SAFETY-GEST-1 (SPEC-12 LAPSE-1..LAPSE-7). The feature file
`docs/architecture/backend/services/evnt-service/tests/cucumber/detection-lapse-alerting.feature`
must be copied to `src/test/resources/features/` and a new step-definition class
`DetectionLapseAlertingSteps.java` created with **PendingException stubs only for the 28 step
patterns not already defined** in SharedSteps, GestureReportIngestionSteps,
AlarmDeliveryPollingSteps, EventReadScopingSteps, FeedbackRecordingSteps or
OutOfBandEscalationSteps. Duplicate count must be 0.

Steps already covered by existing files and NOT to be duplicated:
- `caregiver {string} is linked to patient {string} in tenant {string}` — OutOfBandEscalationSteps
- `escalation timings are push {string} s, sms {string} s, voice {string} s` — OutOfBandEscalationSteps
- `caregiver {string} has an active push subscription {string}` — OutOfBandEscalationSteps
- `caregiver {string} has phone {string} from ACS with consent` — OutOfBandEscalationSteps
- `the escalation sweep runs` — OutOfBandEscalationSteps
- `the escalation sweep runs at {string} s` — OutOfBandEscalationSteps

## Spec de referencia
- SPEC-12-detection-lapse-alerting.md
- docs/architecture/backend/services/evnt-service/tests/cucumber/detection-lapse-alerting.feature

## Escopo
- [ ] implementar `src/test/resources/features/detection-lapse-alerting.feature`
- [ ] implementar `src/test/java/com/neuroassist/evnt/bdd/steps/DetectionLapseAlertingSteps.java`
- [ ] 28 new step patterns (see Criterios de aceite AC-1); each pattern registered exactly once; PendingException stubs only
- [ ] Scenario Outline placeholder `{string}` quoted for channel and cause parameters (e.g. `a Tier {int} {string} attempt is recorded for lapse {string} and caregiver {string}`)

## Criterios de aceite
- [ ] AC-1 `DetectionLapseAlertingSteps.java` defines exactly 28 new step patterns with PendingException stubs; duplicate-pattern count across all *Steps.java files is 0 (see step list in Contexto)
- [ ] AC-2 Feature file at `src/test/resources/features/detection-lapse-alerting.feature` is byte-identical to the source in `docs/.../tests/cucumber/detection-lapse-alerting.feature`
- [ ] AC-3 `./gradlew :evnt-service:compileTestJava` exits 0 (no compilation errors in the new steps class)
- [ ] AC-4 `./gradlew :evnt-service:test` with the new feature reports all scenarios as `PENDING` (not `UNDEFINED`), confirming every step is claimed

## Dependencias
- EVNT-030 (precede — DetectionLapseService raise exists)
- EVNT-031 (precede — resolve)
- EVNT-032 (precede — acknowledge)
- EVNT-033 (precede — list)
- EVNT-034 (precede — EscalationSweep lapse path)
- EVNT-025 (precede — CucumberSpringContext base)

## Estimativa
M

## Prioridade
P8
