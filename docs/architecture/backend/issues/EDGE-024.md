# EDGE-024 -- BDD setup — EmbeddedPostgres + Cucumber wiring + step-definition base (all 4 features, 32 scenarios)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

BDD foundation + step definitions for the enrollment and heartbeat features. Configure
EmbeddedPostgres, the Cucumber runner (`CucumberIT`), and the shared step base (tenant setup,
token fixtures, device fixtures) referenced by all features (SPEC-08). Write step definitions for:
`device-enrollment-and-pairing.feature` (SPEC-02 enroll → claim; single-use code; mobile reuse;
INV-EDGE-1/2/3) and `heartbeat-liveness.feature` (SPEC-02 heartbeat + watchdog; online⇄offline;
short-TTL refresh; INV-EDGE-4). Feature files are pre-authored in
`docs/architecture/backend/services/edge-service/tests/cucumber/`.

## Spec de referencia
- SPEC-08 (BDD feature map, reusable steps, invariant traceability)
- SPEC-02 (device lifecycle, heartbeat)

## Escopo
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/bdd/CucumberIT.java`
- [ ] implementar `backend/services/edge-service/src/test/resources/application-test.yml`
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/bdd/StepDefinitionBase.java`
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/bdd/DeviceEnrollmentSteps.java`
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/bdd/HeartbeatLivenessSteps.java`
## Criterios de aceite
- [ ] AC-1 `./gradlew :edge-service:integrationTest` runs `CucumberIT` without loading unimplemented Spring beans
- [ ] AC-2 `device-enrollment-and-pairing.feature` scenarios all pass (enrollment, claim, duplicate-claim rejection)
- [ ] AC-3 `heartbeat-liveness.feature` scenarios all pass (online/offline flip, watchdog, token refresh)
- [ ] AC-4 Each scenario has a `# SPEC-XX INV-EDGE-N` comment header (SPEC-08)

## Dependencias
- EDGE-006, EDGE-007, EDGE-010, EDGE-022 (use cases under test), EDGE-013, EDGE-014 (JPA adapters)

## Estimativa
S

## Prioridade
P8
