# EDGE-028 -- Application — extend `RecordHeartbeatUseCase` for detection-state persistence and lapse resolution (ADR-005)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Extends the `RecordHeartbeatUseCase` (EDGE-010) with ADR-005 logic:
1. Persist `detectionState` / `detectionStateSince` / `reason` / `engineVersion` from the heartbeat
   request; advance `lastDetectingAt` when the state is `RUNNING` (INV-EDGE-9).
2. When the heartbeat reports `detectionState = RUNNING` **and** an open `EdgeDetectionLapse`
   episode exists for the device, resolve that episode (call `ResolveDetectionLapseUseCase`,
   audit `DetectionLapseResolved`, notify EVNT — EDGE-033). The heartbeat path itself only
   triggers the resolution; it does not raise a lapse.
3. The heartbeat response must echo `detectionState` back to the station (api-contract §3.1).

An absent `detectionState` → recorded as `UNKNOWN`; `UNKNOWN` is not `RUNNING` and does not
advance `lastDetectingAt` and does not resolve an open lapse (INV-EDGE-9, SPEC-02).

## Spec de referencia
- SPEC-02 (RecordHeartbeat use case + detection state + lapse resolution on RUNNING, INV-EDGE-9)
- SPEC-05 (idempotency: resolve episode exactly once — `resolved_at` set once)
- api-contract.md §3.1–§3.2 (request fields + backwards compatibility)
- event-contracts.md §1.2 (`DetectionLapseResolved` audit)

## Escopo
- [ ] estender `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/RecordHeartbeatUseCase.java` — chamar `edgeDevice.recordDetectionState(...)` com o valor do request (ou UNKNOWN se ausente) antes de persistir; após persistir, se `detectionState == RUNNING` e existe episódio aberto, chamar `ResolveDetectionLapseUseCase`
- [ ] estender `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/HeartbeatController.java` — passar os campos de detection do `HeartbeatRequest` para o use case e incluir `detectionState` no `HeartbeatResponse`

## Criterios de aceite
- [ ] AC-1 A heartbeat with `detectionState = RUNNING` on a device with an open lapse episode triggers `ResolveDetectionLapseUseCase` and audits `DetectionLapseResolved` (event-contracts §1.2)
- [ ] AC-2 A heartbeat with absent `detectionState` stores `UNKNOWN`, does NOT advance `lastDetectingAt`, and does NOT resolve an open lapse (INV-EDGE-9)
- [ ] AC-3 A heartbeat with `detectionState = PAUSED/DEGRADED/UNAVAILABLE` does NOT close the lapse (not `RUNNING`)
- [ ] AC-4 `HeartbeatResponse` includes `detectionState` reflecting the persisted value (api-contract §3.1)
- [ ] AC-5 `./gradlew :edge-service:test` exits 0 (unit tests for the extended use case with mock ports)

## Dependencias
- EDGE-010 (RecordHeartbeatUseCase foundation — precede)
- EDGE-027 (DetectionState enum + EdgeDevice fields — precede)
- EDGE-029 (EdgeDetectionLapse aggregate + repository port — needed to query open episode)
- EDGE-033 (ResolveDetectionLapseUseCase — called by this use case on RUNNING)

## Estimativa
S

## Prioridade
P2
