# EDGE-033 -- Application — `EvaluateDetectionLapseScheduler` + `RaiseDetectionLapseUseCase` + `ResolveDetectionLapseUseCase` (ADR-005, lapse sweep, audit to HIST)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Implements the detection-lapse business logic described in SPEC-02 §Implementação (use case
table rows `EvaluateDetectionLapse`, `RaiseDetectionLapse`, `ResolveDetectionLapse`).

**`EvaluateDetectionLapseScheduler`** (`@Scheduled`):
Scan paired devices where `detection_state NOT IN ('RUNNING')` **or** `last_heartbeat_at` has not
been seen for `N` seconds (default `EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS = 120`), AND that do
not already have an open `edge_detection_lapse` row. For each such device, determine `cause`
(`NOT_RUNNING` when the device is still beating but not `RUNNING`; `HEARTBEAT_STOPPED` when
silence exceeds `N`), call `RaiseDetectionLapseUseCase`.

**`RaiseDetectionLapseUseCase`**:
Opens an `EdgeDetectionLapse` row (via `EdgeDetectionLapseRepositoryPort.save(...)`), audits
`DetectionLapseStarted` to HIST (event-contracts §1.2), calls
`EvntLapseNotificationPort.raise(...)` and sets `raisedToEvntAt` on success. If EVNT is
unreachable, leaves `raisedToEvntAt = null` (the adapter in EDGE-032 never throws). One open
episode per device enforced by `uq_edge_detection_lapse_open` DDL (INV-EDGE-10): a concurrent
second save throws `DataIntegrityViolationException`, which is caught and suppressed (idempotent).

**`ResolveDetectionLapseUseCase`** (called by `RecordHeartbeatUseCase` in EDGE-028 on first
`RUNNING` beat): sets `resolvedAt = now()`, audits `DetectionLapseResolved` to HIST
(event-contracts §1.2), calls `EvntLapseNotificationPort.resolve(...)`.

`TenantContextHolder.require()` must be the first call in every application service
(ArchUnit RULE-04, SPEC-02 §Implementação).

## Spec de referencia
- SPEC-02 (EvaluateDetectionLapse + RaiseDetectionLapse + ResolveDetectionLapse use cases; lapse sweep rule; INV-EDGE-10)
- SPEC-05 (idempotency: one open episode per device; `resolved_at` set exactly once)
- event-contracts.md §1.2 (`DetectionLapseStarted` / `DetectionLapseResolved` audit fields)
- integration-contracts.md §6.2 (EARS for raise/resolve; never-drop safety rule)

## Escopo
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/EvaluateDetectionLapseScheduler.java` — `@Scheduled(fixedDelayString = "${edge.detection-lapse.sweep-interval-seconds:30}000")`; queries `EdgeDeviceRepositoryPort` for paired devices that need a lapse opened; calls `RaiseDetectionLapseUseCase` per qualifying device; uses `TenantContextHolder` per tenant scan step
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/RaiseDetectionLapseUseCase.java` — cria `EdgeDetectionLapse` via `EdgeDetectionLapse.open(...)`, persiste, audita `DetectionLapseStarted` via `HistClient`, chama `EvntLapseNotificationPort.raise(...)`, actualiza `raisedToEvntAt`; captura `DataIntegrityViolationException` (segundo episódio aberto) silenciosamente (INV-EDGE-10)
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/ResolveDetectionLapseUseCase.java` — `close(lapseId)`: chama `EdgeDetectionLapseRepositoryPort.findById(lapseId)`, chama `lapse.resolve(now())`, persiste, audita `DetectionLapseResolved` via `HistClient`, chama `EvntLapseNotificationPort.resolve(...)`
- [ ] configurar `backend/services/edge-service/src/main/resources/application.yml` — adicionar `edge.detection-lapse.threshold-seconds: 120` e `edge.detection-lapse.sweep-interval-seconds: 30`

## Criterios de aceite
- [ ] AC-1 When a paired device has had `detection_state != RUNNING` for `>= N` seconds, the sweep opens exactly one `EdgeDetectionLapse` row and raises it to EVNT (INV-EDGE-10; two concurrent sweeps → one succeeds, one is suppressed)
- [ ] AC-2 `RaiseDetectionLapseUseCase` audits `DetectionLapseStarted` to HIST with `cause`, `detectionState`, `reason`, `lastDetectingAt`, `thresholdSeconds`, `engineVersion` (event-contracts §1.2)
- [ ] AC-3 `ResolveDetectionLapseUseCase` audits `DetectionLapseResolved` with `lapseDurationSeconds` and `detectionState` (event-contracts §1.2); `resolved_at` set exactly once (SPEC-05)
- [ ] AC-4 On EVNT unreachable during raise, the episode row stays open (`raisedToEvntAt = null`), no exception propagates to the scheduler, and the next sweep iteration retries (integration-contracts §6.2: never-drop rule)
- [ ] AC-5 A device with an already-open lapse episode is NOT raised again by a repeated sweep (INV-EDGE-10; `uq_edge_detection_lapse_open` backs this at the DB level)
- [ ] AC-6 `./gradlew :edge-service:test` exits 0 (unit tests with mocked Clock + mock ports for all three use cases)

## Dependencias
- EDGE-022 (EvaluateLivenessScheduler — peer scheduler; same `@Scheduled` pattern)
- EDGE-029 (EdgeDetectionLapse + repository port — precede)
- EDGE-031 (JPA adapter for EdgeDetectionLapse — precede for integration tests)
- EDGE-032 (EvntLapseNotificationAdapter — precede)
- EDGE-017 (HistClient — audit sink already in place)
- EDGE-028 (RecordHeartbeatUseCase calls ResolveDetectionLapseUseCase — peer, may run parallel)

## Estimativa
L

## Prioridade
P6
