# EDGE-010 -- API — HeartbeatController + RecordHeartbeat use case (record, token refresh G1, DeviceCameOnline)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Create `HeartbeatController` (`POST /edge/heartbeat`, authority `edge.heartbeat.record` from device
token) and `RecordHeartbeatUseCase`: records `lastHeartbeatAt=now()`, sets `connectivity=online`,
issues a **refreshed short-TTL token** (G1) when the current token is within its refresh window, and
audits `DeviceCameOnline` when the device was `offline`. Heartbeat on a non-`paired` device → `403`
(INV-EDGE-4). Heartbeat with a revoked `credentialId` → `401` (INV-EDGE-6, checks revocation list).

## Spec de referencia
- SPEC-02 (RecordHeartbeat use case, G1 token refresh, DeviceCameOnline)
- SPEC-01 (heartbeat endpoint §3.1)
- SPEC-06 (G1 short-TTL refresh, INV-EDGE-4/6)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/HeartbeatController.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/HeartbeatRequest.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/HeartbeatResponse.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/RecordHeartbeatUseCase.java`
## Criterios de aceite
- [ ] AC-1 Heartbeat on a `paired` device returns `200` with `connectivity=online` and `refreshedToken` when within refresh window (G1)
- [ ] AC-2 Heartbeat on a non-`paired` device returns `403` (INV-EDGE-4)
- [ ] AC-3 Heartbeat with a revoked `credentialId` returns `401` (INV-EDGE-6)
- [ ] AC-4 `DeviceCameOnline` audit is recorded when device was `offline` before the heartbeat
- [ ] AC-5 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-007 (PairDevice precedes), EDGE-009 (revocation list)

## Estimativa
S

## Prioridade
P2
