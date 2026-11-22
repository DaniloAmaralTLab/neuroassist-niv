# EVNT-024 -- Configure health endpoint, Actuator readiness (DB only), structured MDC logging (tenantId, correlationId), Micrometer escalation metrics

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

`GET /evnt/health` (public — api §7.1): `200 OK` when DB is up; `503` when DB is down. Actuator
readiness reflects the DB only as a hard dependency; PAT/ACS/EDGE/HIST reachability is reported
as per-dependency detail, not as an overall `503` (SPEC-07). MDC: every request must carry
`tenantId` (from JWT claim) and `correlationId` (from `X-Correlation-Id`) in the log context —
wired via a servlet filter. Micrometer metrics: at minimum `evnt.escalation.attempts` counter
(by `channel`, `status`) and `evnt.alarm.unconfirmed.count` gauge for the sweep loop. Structured
JSON logging format for production.

## Spec de referencia
- SPEC-07 (observability + health)
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §7

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/health/EvntHealthIndicator.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/observability/MdcFilter.java`
- [ ] configurar Actuator e métricas em `application.yml`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/health/EvntHealthIndicatorTest.java`

## Criterios de aceite
- [ ] AC-1 `GET /evnt/health` → `200 OK` when DB is reachable; `503 Service Unavailable` when DB is down
- [ ] AC-2 PAT/ACS/EDGE/HIST down does NOT cause `503` on `/evnt/health` (reported as dependency detail only — SPEC-07)
- [ ] AC-3 Every authenticated request log line contains `tenantId` and `correlationId` in MDC
- [ ] AC-4 `evnt.escalation.attempts` Micrometer counter incremented after each escalation attempt with `channel` and `status` tags
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.health.EvntHealthIndicatorTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- EVNT-015 (precede — MDC filter extracts tenantId from JWT)
- EVNT-017 (precede — escalation sweep emits metrics)

## Estimativa
S

## Prioridade
P8
