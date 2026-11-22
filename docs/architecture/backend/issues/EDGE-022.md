# EDGE-022 -- Application — EvaluateLiveness watchdog (@Scheduled, transition-only audit, SPEC-05)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Create `EvaluateLivenessScheduler`: a `@Scheduled` bean that scans `paired` devices every
`EDGE_WATCHDOG_SCAN_INTERVAL_SECONDS` seconds. For each device where
`now - last_heartbeat_at > EDGE_HEARTBEAT_OFFLINE_THRESHOLD_SECONDS`, the scheduler attempts an
**optimistic UPDATE** (`UPDATE edge_device SET connectivity='offline' WHERE id=? AND connectivity='online'
AND lifecycle_state='paired'`) and audits `DeviceWentOffline` **only when the update affects a row**
(transition-only — SPEC-05). Repeated scans of an already-`offline` device emit nothing. Default
threshold: 90s; scan interval: 30s (setup-local.md).

## Spec de referencia
- SPEC-02 (EvaluateLiveness watchdog, DeviceWentOffline)
- SPEC-05 (transition-only audit, no re-emit)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/EvaluateLivenessScheduler.java`
## Criterios de aceite
- [ ] AC-1 Scheduler does NOT re-emit `DeviceWentOffline` for a device already `offline` (transition-only — SPEC-05)
- [ ] AC-2 `DeviceWentOffline` audit contains `lastHeartbeatAt` and `thresholdMs` in payload (event-contracts.md §1.2)
- [ ] AC-3 Scan uses an optimistic UPDATE (not SELECT-then-UPDATE) to handle concurrent heartbeats (SPEC-05)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0 (scheduler unit test with mocked time)

## Dependencias
- EDGE-010 (RecordHeartbeat flips back to online), EDGE-013 (EdgeDeviceJpaAdapter watchdog update)

## Estimativa
S

## Prioridade
P6
