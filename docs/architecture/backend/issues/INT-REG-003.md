# INT-REG-003 -- Integration test: lifecycle log events (registration, renewal, eviction) are shipped to Elasticsearch

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto
Lifecycle logs (registration, renewal, eviction) must reach Elasticsearch for operator observability and to support the `techlab-architecture-specs-v2` corpus. This integration test verifies that log events produced by REG actually arrive in Elasticsearch. It is best-effort: failure to ship does not break the registry, but the integration must be verified end-to-end.

## Spec de referencia
- SPEC-07 (Observability and Health — lifecycle logging to Elasticsearch)
- SPEC-10 (Integrations — outbound observability stack)
- contracts/integration-contracts.md §2

## Escopo
- [ ] implementar `src/test/java/com/neuroassist/registry/integration/LifecycleLogShippingIT.java` — start REG with Elasticsearch available (via Testcontainers or a local stack); register and de-register a mock client; query Elasticsearch for log entries with `event=REGISTERED` and `event=CANCELLED`; assert at least one entry for each event type is found
- [ ] add `@Tag("integration")` to the class
- [ ] add Testcontainers Elasticsearch dependency to `build.gradle.kts` (scope `testImplementation`) if not already present

## Criterios de aceite
- [ ] AC-1: `./gradlew :services:neuroassist-niv-service-registry:test` (with integration tag) exits 0
- [ ] AC-2: Elasticsearch query after test returns at least one document with `event=REGISTERED` and the correct `app`/`instanceId` fields
- [ ] AC-3: REG continues responding to `GET /eureka/apps` correctly even when the Elasticsearch container is stopped mid-test (best-effort logging invariant)

## Dependencias
- REG-008 (precede — lifecycle logging must be implemented)
- INT-REG-001 (precede)

## Estimativa
S

## Prioridade
P7
