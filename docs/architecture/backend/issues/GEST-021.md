# GEST-021 -- Custom Micrometer metrics — declare/retire counts, support-check request rate, 304 cache-hit ratio, PAT/HIST failure counters

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Register custom Micrometer `Counter` and `Timer` metrics for the GEST-specific observability signals
listed in SPEC-07. Metrics are exposed via `/actuator/prometheus` (or `/actuator/metrics`). The
support-check `304` cache-hit ratio is derived from two counters: `gest.support_check.total` and
`gest.support_check.cache_hit`.

## Spec de referencia
- SPEC-07 (observability — key metrics)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/metrics/GestMetrics.java`

## Resultado esperado
All 6 metric signals are registered. `gest.engine_capability.declare.total` increments on each call
to `CapabilityService.declare()`. `./gradlew :gest-service:test` exits 0 for `GestMetricsTest`.

## Criterios de aceite
- [ ] AC-1: `gest.engine_version.register.total` Counter increments on each successful register.
- [ ] AC-2: `gest.engine_capability.declare.total` Counter increments on each successful declare.
- [ ] AC-3: `gest.engine_capability.retire.total` Counter increments on each successful retire.
- [ ] AC-4: `gest.support_check.total` and `gest.support_check.cache_hit` Counters exist; cache-hit ratio is derivable from the two.
- [ ] AC-5: `gest.pat_validation.failure.total` increments when `GestureVocabularyPort` throws `ServiceUnavailableException`.
- [ ] AC-6: `gest.hist_audit.failure.total` increments when `HistAuditPort` throws `AuditUnavailableException`.
- [ ] AC-7: `./gradlew :gest-service:test` exits 0 for `GestMetricsTest`.

## Dependencias
- GEST-008 (precede — EngineVersionService)
- GEST-010 (precede — CapabilityService declare)
- GEST-011 (precede — CapabilityService retire + checkSupport)

## Estimativa
S

## Prioridade
P7
