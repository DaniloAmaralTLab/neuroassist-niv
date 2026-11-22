# EDGE-023 -- Observability — Actuator health (offline-first INV-EDGE-5, PAT/ACS as readiness details) + Micrometer metrics + X-Correlation-Id propagation

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Create `EdgeHealthIndicator` for `GET /edge/health` (SPEC-07): datastore liveness is a hard
dependency; ACS/PAT/HIST reachability is a **readiness detail** (not a hard failure of the device
path — INV-EDGE-5). Create `EdgeMetrics` with the 7 Micrometer counters/gauges from SPEC-07:
`edge.devices.connectivity{state}` (gauge), `edge.heartbeat.received`, `edge.watchdog.offline_transitions`,
`edge.catalog.refresh{result=200|304|outage}`, `edge.catalog.served_stale`,
`edge.pairing.claims{result=ok|invalid|conflict}`, `edge.device_token.revocations`. Create
`CorrelationIdFilter`: propagates `X-Correlation-Id` on every response and every downstream call.

## Spec de referencia
- SPEC-07 (health, metrics, X-Correlation-Id, INV-EDGE-5)
- SPEC-01 (§7 — health endpoint)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/health/EdgeHealthIndicator.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/metrics/EdgeMetrics.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/logging/CorrelationIdFilter.java`
## Criterios de aceite
- [ ] AC-1 `GET /edge/health` returns `200 UP` while the datastore is healthy, even when PAT/ACS are unreachable (INV-EDGE-5)
- [ ] AC-2 All 7 metrics in SPEC-07 §Implementação are registered in Micrometer
- [ ] AC-3 `X-Correlation-Id` is echoed on every response and on every HIST audit call (SPEC-07)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-001 (scaffold), EDGE-010 (heartbeat metrics), EDGE-022 (watchdog offline transitions)

## Estimativa
S

## Prioridade
P7
