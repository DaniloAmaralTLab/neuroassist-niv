# EVNT-026 -- BDD Cucumber features: alarm confirmation, feedback recording, escalation trail read and push-subscription lifecycle

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

End-to-end BDD scenarios covering the caregiver interaction paths (SPEC-08). Scenarios: `confirmAlarm`
first + idempotent second, `confirmAlarm` on routine → `409`, `recordFeedback` real + changed verdict
+ same-verdict idempotency, `GET escalation-attempts` with masked destinations, `POST push-subscriptions`
idempotent re-register → `200`, `DELETE push-subscriptions/{id}` owned + not-owned → `404`. All
scenarios use PostgreSQL Testcontainer + WireMock for ACS and HIST. CucumberSpringContext from
EVNT-025 is reused.

## Spec de referencia
- SPEC-08 (BDD scenarios — confirmation/feedback/subscription)
- docs/architecture/backend/services/evnt-service/tests/cucumber/alarm-confirmation.feature
- docs/architecture/backend/services/evnt-service/tests/cucumber/out-of-band-escalation.feature (read path)

## Escopo
- [ ] implementar `src/test/resources/features/alarm-confirmation.feature`
- [ ] implementar `src/test/resources/features/feedback-recording.feature`
- [ ] implementar `src/test/resources/features/push-subscription.feature`
- [ ] implementar `src/test/java/com/neuroassist/evnt/bdd/AlarmConfirmationSteps.java`
- [ ] implementar `src/test/java/com/neuroassist/evnt/bdd/FeedbackSteps.java`

## Criterios de aceite
- [ ] AC-1 Scenario "confirm emergency" → `200 OK`, second confirm → `200 OK` same `confirmedAt`, no duplicate audit
- [ ] AC-2 Scenario "confirm routine" → `409 not-confirmable`
- [ ] AC-3 Scenario "record feedback, then change" → first audit `FeedbackRecorded`, second audit `FeedbackRecorded` (changed verdict), same verdict → no second audit
- [ ] AC-4 Scenario "escalation-attempts read" → destinations masked in response (`+55•••••1234`)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.bdd.AlarmConfirmationSteps"` exits 0

## Dependencias
- EVNT-005 (precede)
- EVNT-006 (precede)
- EVNT-010 (precede — escalation attempt persistence for read scenarios)
- EVNT-022 (precede — read surface)
- EVNT-023 (precede — push subscription controller)
- EVNT-025 (precede — CucumberSpringContext)

## Estimativa
L

## Prioridade
P9
