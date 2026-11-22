# EVNT-025 -- BDD Cucumber features: gesture-report ingest (EventGenerated, idempotent replay, PAT-unavailable fail-closed, EDGE-token validation)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

End-to-end BDD scenarios for the gesture-report ingest golden path (SPEC-08). Uses Cucumber JVM
with a `CucumberSpringContext` that bootstraps `@SpringBootTest(RANDOM_PORT)` with a singleton
`PostgreSQLContainer` (learning pitfall P8-EVNT-022: H2 incompatible with multi-tenancy JPA config
— always use real Postgres in BDD). Features cover: `EventGenerated` on first report, idempotent
`200` replay, PAT `404` → `404 command-not-found`, PAT `5xx` → `503 catalog-unavailable`, EDGE
token validation (`401` on missing/invalid/revoked device token). WireMock stubs PAT and HIST in-process.

## Spec de referencia
- SPEC-08 (BDD scenarios — ingest features)
- docs/architecture/backend/services/evnt-service/tests/cucumber/ingest-gesture-report.feature

## Escopo
- [ ] implementar `src/test/resources/features/ingest-gesture-report.feature`
- [ ] implementar `src/test/java/com/neuroassist/evnt/bdd/IngestGestureReportSteps.java`
- [ ] implementar `src/test/java/com/neuroassist/evnt/bdd/CucumberSpringContext.java`
- [ ] configurar `src/test/resources/application-test.yml` com PostgreSQLContainer DSN + WireMock stubs

## Criterios de aceite
- [ ] AC-1 Scenario "ingest recognized command" → `201 Created` with event body and `Location` header
- [ ] AC-2 Scenario "idempotent replay" → `200 OK` with the same event, no second `EventGenerated` audit call to WireMock HIST
- [ ] AC-3 Scenario "PAT unavailable" → `503 catalog-unavailable` with `Retry-After`
- [ ] AC-4 Scenario "invalid edge token" → `401 Unauthorized`
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.bdd.IngestGestureReportSteps"` exits 0 against real PostgreSQL Testcontainer

## Dependencias
- EVNT-004 (precede — use case must be implemented)
- EVNT-007 (precede — migrations for schema)
- EVNT-008 (precede — persistence)
- EVNT-012 (precede — PAT client for WireMock stubbing)
- EVNT-015 (precede — security config)

## Estimativa
L

## Prioridade
P9
