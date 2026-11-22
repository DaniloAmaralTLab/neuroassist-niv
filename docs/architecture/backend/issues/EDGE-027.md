# EDGE-027 -- Domain — `DetectionState` enum + extend `EdgeDevice` with detection-state fields + extend heartbeat DTOs (ADR-005)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ADR-005 (SAFETY-GEST-1) distinguishes "connected but not detecting" from "offline" on the edge
device. This issue adds the domain vocabulary: a `DetectionState` enum
(`RUNNING | PAUSED | DEGRADED | UNAVAILABLE | UNKNOWN`) to `edge-service`'s domain layer, extends
the `EdgeDevice` aggregate with five new nullable fields (`detectionState`, `detectionStateSince`,
`detectionReason`, `engineVersion`, `lastDetectingAt`), and extends the heartbeat request/response
DTOs to carry those fields. An absent `detectionState` on the heartbeat is recorded as `UNKNOWN`
and **never** treated as `RUNNING` (INV-EDGE-9, backwards-compatible).

## Spec de referencia
- SPEC-02 (§Decisões técnicas — detection state, INV-EDGE-9)
- api-contract.md §3.1 (heartbeat payload + response fields)
- ADR-005-detection-state-and-lapse-alert.md §Decisão point 1 and 2

## Escopo
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/DetectionState.java` (enum: RUNNING, PAUSED, DEGRADED, UNAVAILABLE, UNKNOWN)
- [ ] estender `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/EdgeDevice.java` — adicionar campos `detectionState: DetectionState`, `detectionStateSince: Instant`, `detectionReason: String`, `engineVersion: String`, `lastDetectingAt: Instant`; adicionar método `recordDetectionState(DetectionState, Instant, String, String): void` que avança `lastDetectingAt` somente quando o estado é `RUNNING`
- [ ] estender `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/HeartbeatRequest.java` — adicionar campos opcionais `detectionState`, `detectionStateSince`, `reason`, `engineVersion`
- [ ] estender `backend/services/edge-service/src/main/java/com/neuroassist/edge/api/dto/HeartbeatResponse.java` — adicionar campo `detectionState` refletindo o estado persistido

## Criterios de aceite
- [ ] AC-1 `DetectionState.UNKNOWN` exists and `DetectionState.fromHeartbeat(null)` returns `UNKNOWN` (INV-EDGE-9: absent → UNKNOWN, never RUNNING)
- [ ] AC-2 `EdgeDevice.recordDetectionState(RUNNING, ...)` advances `lastDetectingAt`; any other state does NOT advance `lastDetectingAt`
- [ ] AC-3 `HeartbeatRequest` deserializes with all detection fields absent and produces `detectionState = null` (nullable, backwards-compatible); Jackson `@JsonProperty(required = false)` or equivalent
- [ ] AC-4 `./gradlew :edge-service:compileJava` exits 0

## Dependencias
- EDGE-002 (EdgeDevice aggregate foundation — precede)
- EDGE-010 (HeartbeatController + RecordHeartbeatUseCase — EDGE-028 extends this)

## Estimativa
S

## Prioridade
P2
