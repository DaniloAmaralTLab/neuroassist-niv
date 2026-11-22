# GEST-025 -- ETag If-None-Match 304 handling and Feign circuit-breaker retry with Retry-After on 503 for PAT/HIST/ACS

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Harden the HTTP caching layer and the Feign client resilience. Add `ConditionalGetFilter` (or
equivalent `@GetMapping` handling) to compare `If-None-Match` with the computed `ETag` and short-circuit
to `304 Not Modified` on reads and support-check. Add `FeignResilienceConfig` with retry and circuit-
breaker (Resilience4j or Spring Retry) for `PatGestureTypeClient`, `HistAuditClient`, and `AcsClient`.
PAT/HIST are write-only integrations with fail-closed policy — circuit breaker is defensive, not a
fallback relaxation. Add `Retry-After: 30` header on all GEST `503` responses.

## Spec de referencia
- SPEC-05 (idempotency — retried requests must converge)
- SPEC-07 (observability — 304 cache-hit ratio metric)
- contracts/api-contract.md §0.1 (If-None-Match / ETag), §4 (503 with Retry-After)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/integration/FeignResilienceConfig.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/api/ConditionalGetFilter.java`

## Resultado esperado
`If-None-Match` matching current `ETag` returns `304` with no body. Feign retry on transient 5xx
(max 1 retry; PAT/HIST fail-closed policy still applies after retry). `503` responses include
`Retry-After: 30`. `./gradlew :gest-service:test` exits 0.

## Criterios de aceite
- [ ] AC-1: `GET /gest/engines`, `GET /gest/capabilities`, and `POST /gest/capabilities/support-check` return `304 Not Modified` when `If-None-Match` equals the current `ETag` (no body).
- [ ] AC-2: `FeignResilienceConfig` applies a maximum of 1 retry on transient `5xx` for `PatGestureTypeClient` and `HistAuditClient`; fail-closed after retry exhausted.
- [ ] AC-3: All GEST `503` responses include `Retry-After: 30` header.
- [ ] AC-4: `gest.support_check.cache_hit` counter increments on each `304` response to `support-check`.
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `ConditionalGetFilterTest` and `FeignResilienceConfigTest`.

## Dependencias
- GEST-011 (precede — ETagService)
- GEST-015 (precede — PatGestureTypeClient)
- GEST-016 (precede — AcsClient)
- GEST-017 (precede — HistAuditClient)
- GEST-021 (precede — GestMetrics cache-hit counter)

## Estimativa
M

## Prioridade
P9
