# GEST-020 -- Actuator /health with DB and ACS-JWKS readiness probes and X-Correlation-Id MDC propagation

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement Spring Boot Actuator with `/actuator/health` exposing liveness and readiness. Readiness
probes: DB connectivity (global schema) and ACS JWKS endpoint reachability. PAT and HIST are NOT
readiness gates (only write-time dependencies). Also implement a servlet filter that extracts
`X-Correlation-Id` from the incoming request (or generates a UUID if absent), binds it to the SLF4J
MDC, and echoes it on every outgoing response.

## Spec de referencia
- SPEC-07 (observability and health)
- contracts/api-contract.md §0.1 (X-Correlation-Id mandatory header)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/health/GestHealthIndicator.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/web/CorrelationIdFilter.java`

## Resultado esperado
`GET /actuator/health` returns `200 { "status": "UP", "components": { "db": {...}, "acsJwks": {...} } }`.
Every response includes the `X-Correlation-Id` header. HIST/PAT failure does NOT affect readiness.

## Criterios de aceite
- [ ] AC-1: `GET /actuator/health` reports `db` (DataSource check) and `acsJwks` (JWKS endpoint reachability) as readiness indicators.
- [ ] AC-2: PAT or HIST being unavailable does NOT set health status to DOWN.
- [ ] AC-3: `CorrelationIdFilter` binds the incoming `X-Correlation-Id` to `MDC.put("correlationId", ...)` and echoes it in the response header.
- [ ] AC-4: When `X-Correlation-Id` is absent from the request, the filter generates a UUID and uses it.
- [ ] AC-5: Logs produced within a request contain the `correlationId` MDC field.
- [ ] AC-6: `./gradlew :gest-service:test` exits 0 for `GestHealthIndicatorTest` and `CorrelationIdFilterTest`.

## Dependencias
- GEST-001 (precede — module scaffold)
- GEST-013 (precede — JPA adapter for DB health check)

## Estimativa
M

## Prioridade
P7
