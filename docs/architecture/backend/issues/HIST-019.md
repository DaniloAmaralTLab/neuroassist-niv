# HIST-019 -- Observability — Actuator health/readiness (PostgreSQL check DOWN when unreachable); Micrometer counters + timers; structured logging (never log personal payload fields); X-Correlation-Id generated when absent + echoed on every response

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

HIST is a synchronous dependency of every write path; its observability surface is the reconcile
window for the commit+durable-retry producers. Required metrics and behaviors (SPEC-07):

**Metrics (Micrometer):**
- `hist.audit.appended{source, action, flagged}` — counter per successful append
- `hist.audit.replay` — counter for idempotent replays (200)
- `hist.audit.latency` — timer on the ingest path
- `hist.history.query.latency` — timer on the caregiver timeline query
- `hist.audit.rejected{reason}` — counter for 400/401/403 rejections

**Logging:** `correlationId`, `source`, `action`, `tenantId` on every structured log line;
**never** log personal payload fields (LGPD, ADR-006). `CorrelationIdFilter` (servlet-only, no
duplicate MVC interceptor — Learning: ACS ARCH precedent) injects/generates `X-Correlation-Id`.

**Health:** `/actuator/health` (liveness) + `/actuator/health/readiness` (PostgreSQL connectivity
check — HIST must not accept writes it cannot persist, SPEC-07). Custom health indicators guarded
with `@ConditionalOnProperty` in test profile (Learning: `observability:health-indicator:missing-conditional-on-property-in-test`).

## Spec de referencia

- SPEC-07 (observability + health)
- api-contract.md §6 (X-Correlation-Id mandatory header)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/config/ObservabilityConfig.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/filter/CorrelationIdFilter.java`
- [ ] configurar `backend/services/hist-service/src/test/resources/application-test.yml` (disable custom health indicators)

## Criterios de aceite

- [ ] AC-1 `/actuator/health/readiness` returns `DOWN` when PostgreSQL is unreachable
- [ ] AC-2 Successful ingest increments `hist.audit.appended` with correct `source`, `action`, `flagged` tags
- [ ] AC-3 Idempotent replay (200) increments `hist.audit.replay` counter
- [ ] AC-4 `X-Correlation-Id` present on all responses; generated when absent in the request; propagated from inbound header when present
- [ ] AC-5 Structured logs include `correlationId`, `source`, `action`; no personal payload fields appear in log output
- [ ] AC-6 `CorrelationIdFilter` is registered as a servlet filter only (no duplicate `HandlerInterceptor`)
- [ ] AC-7 `./gradlew :hist-service:test` exits 0

## Dependencias

- HIST-001 (precede)

## Estimativa

M

## Prioridade
P7
