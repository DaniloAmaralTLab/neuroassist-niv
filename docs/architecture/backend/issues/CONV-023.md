# CONV-023 -- Actuator custom metrics — publish count, audit-502 failures, durable-retry queue depth/age, usage-signal accept/discard (SPEC-07)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Adds Micrometer metrics to the CONV application services and a custom `ConvHealthIndicator`
(SPEC-07). Metrics to instrument: (1) `conv.tree.publish.count` — incremented on every
successful publish; (2) `conv.audit.hard502.count` — incremented on every publish rolled back
due to HIST failure; (3) `conv.audit.retry.queue.size` — gauge of pending durable-retry facts;
(4) `conv.usage.signal.accept.count` and `conv.usage.signal.discard.count` — incremented by
`UsageService.record()`. `ConvHealthIndicator` treats datastore + blob storage as hard
dependencies (503 when down); ACS/PAT/HIST reachability is a readiness detail (never causes
503, INV-CONV-5).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/metrics/ConvMetrics.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/api/health/ConvHealthIndicator.java`
- [ ] registrar `management.endpoints.web.exposure.include: health,metrics,prometheus` em `application.yml`

## Criterios de aceite
- [ ] AC-1 After a successful publish, `GET /actuator/metrics/conv.tree.publish.count` reflects the increment
- [ ] AC-2 After a publish rollback due to HIST 502, `conv.audit.hard502.count` increments
- [ ] AC-3 `GET /conv/health` returns `503` when PostgreSQL is stopped; it returns `200 UP` even when HIST/PAT are unavailable (INV-CONV-5)
- [ ] AC-4 `./gradlew :conv-service:test` exits 0

## Dependencias
- CONV-006 (precede — TreeService.publish metrics hook)
- CONV-015 (precede — AuditPort retry queue gauge)
- CONV-020 (precede — UsageService accept/discard counters)

## Estimativa
S

## Prioridade
P7
