# HIST-020 -- BDD wire-up — CucumberSpringContext + CucumberIT (integrationTest scope, DRY-RUN until scaffold); do NOT add new step glue (5 step files already present: 80 patterns, 0 duplicates)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Wires Cucumber into the Spring test context so the 5 existing step files
(`AuditIngestIdempotencySteps`, `AuditWriteFailurePolicySteps`, `CaregiverHistoryReadSteps`,
`EnvelopeReconciliationAndPlacementSteps`, `SharedSteps`) can run as an `integrationTest` suite.

**DO NOT** add new step files or patterns — the 5 files carry 80 patterns with 0 duplicates as
generated in M3-be; adding glue without matching features causes
`AmbiguousStepDefinitionsException` (Learning: `bdd-steps:cucumber-expression:literal-vs-parametrized-ambiguity`).

The `CucumberIT` runner uses `--dry-run` until the scaffold (HIST-001..HIST-021) is complete.
Remove `--dry-run` once all step implementations are non-pending. `BddTestConfig` stubs (for ports
like `AuditTrailPort`, `PatientAuditReadPort`) are `@Primary` beans; if injected into production
singleton services, use `AtomicReference` state + `@Before` reset hook (not `@ScenarioScope`)
to avoid `ScopeNotActiveException` on real HTTP calls (Learning: `bdd:testconfig-singleton-scenarioscope:scope-mismatch-exception`).

## Spec de referencia

- SPEC-08 (BDD test scenarios)
- `docs/architecture/backend/services/hist-service/tests/cucumber/` (feature files)

## Escopo

- [ ] implementar `backend/services/hist-service/src/test/java/com/neuroassist/hist/bdd/CucumberSpringContext.java`
- [ ] implementar `backend/services/hist-service/src/test/java/com/neuroassist/hist/bdd/CucumberIT.java`
- [ ] configurar `backend/services/hist-service/src/test/resources/application-test.yml`

## Criterios de aceite

- [ ] AC-1 `./gradlew :hist-service:integrationTest` exits 0 with `--dry-run` (no step implementation errors, only PendingException)
- [ ] AC-2 No new step files added in this issue (the 5 existing files remain unchanged — no duplicate glue)
- [ ] AC-3 `CucumberIT` runner includes `@CucumberOptions(features = "classpath:features", glue = "com.neuroassist.hist.bdd.steps", dryRun = true)`
- [ ] AC-4 `integrationTest` task in `build.gradle.kts` excludes `**/*Test.class` and includes `**/CucumberIT.class`

## Dependencias

- HIST-001 (build.gradle.kts integrationTest task must exist)
- HIST-009 (Spring context must load; JPA adapters must exist for context boot)

## Estimativa

S

## Prioridade
P8
