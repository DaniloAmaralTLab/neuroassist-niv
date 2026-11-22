# CONV-024 -- BDD scaffold — 5 feature files + SharedSteps + 5 per-feature step classes + CucumberSpringContext extending BaseIntegrationTest (SPEC-08, D-532)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/14 itens

## Contexto

Creates the BDD test infrastructure scaffold as specified in SPEC-08 (D-532 format — per-feature
step classes, NOT a monolithic `ConvStepDefs.java`). `CucumberSpringContext` extends
`BaseIntegrationTest` (Testcontainers lifecycle — PostgreSQL container), annotated with
`@SpringBootTest` + `@ActiveProfiles("test")`, and NOT the D-215 bdd-profile variant.
Shared/reusable steps live in `SharedSteps.java`; each feature gets its own step class. The
five `.feature` files follow the index in SPEC-08 §feature-index: `tree-bundle-read.feature`,
`audio-playback.feature`, `tree-publish.feature`, `tree-retire-and-erase.feature`,
`usage-signal.feature`. Stubs for `AudioAssetPort` and `AuditPort` are registered as test
beans — no vendor calls (ADR-005).

## Escopo
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/bdd/CucumberSpringContext.java`
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/bdd/steps/SharedSteps.java`
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/bdd/steps/TreeBundleReadSteps.java`
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/bdd/steps/AudioPlaybackSteps.java`
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/bdd/steps/TreePublishSteps.java`
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/bdd/steps/TreeRetireAndEraseSteps.java`
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/bdd/steps/UsageSignalSteps.java`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/tree-bundle-read.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/audio-playback.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/tree-publish.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/tree-retire-and-erase.feature`
- [ ] implementar `backend/services/conv-service/src/test/resources/features/usage-signal.feature`
- [ ] adicionar dependências Cucumber no `build.gradle.kts` (`io.cucumber:cucumber-java`, `io.cucumber:cucumber-spring`, `io.cucumber:cucumber-junit-platform-engine`)
- [ ] criar stubs `@TestConfiguration` para `AudioAssetPort` e `AuditPort`

## Criterios de aceite
- [ ] AC-1 Five `.feature` files exist in `src/test/resources/features/`; Cucumber discovers all five without `DuplicateStepDefinitionException`
- [ ] AC-2 `CucumberSpringContext` extends `BaseIntegrationTest` (not `@CucumberContextConfiguration` only — D-532); `@SpringBootTest` + `@ActiveProfiles("test")` are present
- [ ] AC-3 Six step classes exist: `SharedSteps`, `TreeBundleReadSteps`, `AudioPlaybackSteps`, `TreePublishSteps`, `TreeRetireAndEraseSteps`, `UsageSignalSteps`
- [ ] AC-4 `./gradlew :conv-service:integrationTest` exits 0 with the scaffolded (pending) scenarios

## Dependencias
- CONV-016 (precede — security wired for IT context)
- CONV-017 (precede — TenantContextFilter active in test context)

## Estimativa
S

## Prioridade
P8
