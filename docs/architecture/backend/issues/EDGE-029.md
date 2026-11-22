# EDGE-029 -- Domain — `EdgeDetectionLapse` aggregate + `EdgeDetectionLapseRepositoryPort` + `LapseCause` enum (ADR-005)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

The lapse-episode ledger introduced by ADR-005 (SAFETY-GEST-1) requires a new domain aggregate and
port in the domain layer of `edge-service`. `EdgeDetectionLapse` holds the per-device episode
(one open at a time — INV-EDGE-10): `deviceId`, `patientId`, `tenantId`, `cause` (`NOT_RUNNING` or
`HEARTBEAT_STOPPED`), `detectionState`, `lastDetectingAt`, `startedAt`, `evntIdempotencyKey`
(stable per-episode UUID), `raisedToEvntAt` (null until EVNT succeeds), and `resolvedAt` (null
while open). `EdgeDetectionLapseRepositoryPort` provides the inbound port the application layer
uses: `findOpenEpisode(deviceId)`, `save(lapse)`, and `close(lapseId, resolvedAt)`.

`LapseCause` enum (`NOT_RUNNING | HEARTBEAT_STOPPED`) lives in the domain layer and maps the two
arms of the sweep rule defined in SPEC-02 and data-model.md §2.5.

## Spec de referencia
- SPEC-02 (EvaluateDetectionLapse + RaiseDetectionLapse + ResolveDetectionLapse use cases, INV-EDGE-10)
- SPEC-04 (data-model.md §2.5 — `edge_detection_lapse` DDL, INV-EDGE-10)
- SPEC-05 (one open episode per device; `uq_edge_detection_lapse_open` backs it at the DB layer)
- data-model.md §2.5 (field names, constraints, invariants)

## Escopo
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/LapseCause.java` (enum: NOT_RUNNING, HEARTBEAT_STOPPED)
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/EdgeDetectionLapse.java` — aggregate com campos: `id: UUID`, `deviceId: UUID`, `patientId: UUID`, `tenantId: UUID`, `cause: LapseCause`, `detectionState: DetectionState`, `detectionReason: String`, `lastDetectingAt: Instant`, `startedAt: Instant`, `evntIdempotencyKey: String`, `raisedToEvntAt: Instant`, `resolvedAt: Instant`; método de fábrica estático `open(...)` que gera um `evntIdempotencyKey` novo (UUID); método `markRaisedToEvnt(Instant)` e `resolve(Instant)`
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/port/EdgeDetectionLapseRepositoryPort.java` — interface: `findOpenByDeviceId(UUID): Optional<EdgeDetectionLapse>`, `save(EdgeDetectionLapse): EdgeDetectionLapse`, `findById(UUID): Optional<EdgeDetectionLapse>`
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/port/EvntLapseNotificationPort.java` — interface: `raise(EdgeDetectionLapse): void` e `resolve(EdgeDetectionLapse): void`; domínio depende desta port, nunca do Feign adapter diretamente

## Criterios de aceite
- [ ] AC-1 `EdgeDetectionLapse.open(...)` generates a non-null `evntIdempotencyKey` (UUID) and sets `raisedToEvntAt = null`, `resolvedAt = null`
- [ ] AC-2 `EdgeDetectionLapseRepositoryPort.findOpenByDeviceId(id)` contract: returns empty if no row with `resolvedAt IS NULL` for that device (INV-EDGE-10)
- [ ] AC-3 `LapseCause.NOT_RUNNING` and `LapseCause.HEARTBEAT_STOPPED` map to `'NOT_RUNNING'` and `'HEARTBEAT_STOPPED'` (the values in `data-model.md §2.5 chk_edge_lapse_cause`)
- [ ] AC-4 `./gradlew :edge-service:compileJava` exits 0; no JPA annotation in domain classes (ArchUnit RULE-03)

## Dependencias
- EDGE-002 (EdgeDevice aggregate — precede, domain co-residence)
- EDGE-027 (DetectionState enum — precede)

## Estimativa
S

## Prioridade
P3
