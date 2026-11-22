# GEST-015 -- GestureVocabularyPort and PatGestureTypeClient Feign adapter (PAT vocabulary validation, fail-closed INV-GEST-1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto
Implement the outbound integration with PAT's gesture-type vocabulary. `GestureVocabularyPort` is the
domain port; `PatGestureTypeClient` is the Feign adapter. Called ONLY on the declare path (never on
reads/support-check). Fail-closed: if PAT is unreachable, `CapabilityService.declare()` must fail with
`503 pat-vocabulary-unavailable` + `Retry-After` (INV-GEST-1). Include a WireMock-based test.

## Spec de referencia
- SPEC-03 (vocabulary validation, fail-closed)
- SPEC-10 (integrations — INT-GEST-PAT-1 context)
- contracts/hub-integration.md §2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/port/GestureVocabularyPort.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/integration/PatGestureTypeClient.java`
- [ ] implementar `src/test/java/com/neuroassist/gest/infrastructure/integration/PatGestureTypeClientTest.java`

## Resultado esperado
`GestureVocabularyPort.exists(code)` returns `true` when PAT reports the code present. PAT
unreachable → `ServiceUnavailableException` propagated to service layer → `503` with `Retry-After`.
WireMock test covers both happy path and 503.

## Criterios de aceite
- [ ] AC-1: `GestureVocabularyPort` is an interface in `domain.port` with method `boolean exists(String gestureTypeCode)` throwing `ServiceUnavailableException` when downstream is unavailable.
- [ ] AC-2: `PatGestureTypeClient` is a Feign client in `infrastructure.integration` calling `GET /pat/gesture-types` with `url_prop: pat.base-url`.
- [ ] AC-3: Absent code from PAT response returns `false` (service layer maps to `400 gesture-type-code-unknown`).
- [ ] AC-4: PAT returning `5xx` or connection timeout → `ServiceUnavailableException` (service layer maps to `503 pat-vocabulary-unavailable` with `Retry-After: 30`).
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `PatGestureTypeClientTest` with WireMock stubs.

## Dependencias
- GEST-001 (precede — module scaffold)

## Estimativa
M

## Prioridade
P4
