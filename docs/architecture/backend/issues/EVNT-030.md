# EVNT-030 -- DetectionLapseService — raise endpoint POST /evnt/detection-lapses with idempotency (SPEC-12 LAPSE-1/LAPSE-2, api-contract §10.1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Contexto

Implements the service-client ingest path for SAFETY-GEST-1: EDGE raises a detection-lapse
episode via `POST /evnt/detection-lapses` carrying an ACS-issued **service-client JWT** for the
`edge-service` principal (authority `evnt.detection-lapse.create`). EVNT persists one
`detection_lapse` row and returns `201 Created` (new episode) or `200 OK` (idempotent replay on
`(tenantId, Idempotency-Key)` — LAPSE-2). The `Idempotency-Key` header is **required**;
`deviceId`/`patientId`/`tenantId` come from the **trusted payload** of this service-client call,
not from a station token (SPEC-12 §ingest surface). `cause ∈ {NOT_RUNNING, HEARTBEAT_STOPPED}`;
`detectionState ∈ {RUNNING, PAUSED, DEGRADED, UNAVAILABLE, UNKNOWN}`.

## Spec de referencia
- SPEC-12-detection-lapse-alerting.md §Ingest surface / LAPSE-1 / LAPSE-2
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §10.1
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.4

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/DetectionLapseController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/CreateDetectionLapseRequest.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/DetectionLapseResponse.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/DetectionLapseService.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/DetectionLapse.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/DetectionLapseRepositoryPort.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/DetectionLapseRepositoryAdapter.java`
- [ ] implementar `src/test/java/com/neuroassist/evnt/application/DetectionLapseServiceTest.java`

## Criterios de aceite
- [ ] AC-1 `POST /evnt/detection-lapses` with valid service-client token + first-seen `(tenantId, Idempotency-Key)`: returns `201 Created`, persists one `detection_lapse` row `status=open`, responds with `Location: /evnt/detection-lapses/{id}` (LAPSE-1)
- [ ] AC-2 Replay of consumed `(tenantId, Idempotency-Key)`: returns `200 OK` with the existing lapse body; no second row inserted (LAPSE-2)
- [ ] AC-3 Idempotent replay of an already-resolved or acknowledged lapse: returns `200 OK` with the closed lapse; starts no second escalation (LAPSE-2 ordering safety)
- [ ] AC-4 `edge.device` station token or missing `evnt.detection-lapse.create` authority: returns `401`/`403` (never the station token — SPEC-12)
- [ ] AC-5 Missing required fields (`deviceId`, `patientId`, `tenantId`, `cause`, `lapseStartedAt`) or invalid enum value: returns `400 validation-error`
- [ ] AC-6 `./gradlew :evnt-service:test --tests "*.application.DetectionLapseServiceTest"` exits 0

## Dependencias
- EVNT-028 (precede — detection_lapse table)

## Estimativa
M

## Prioridade
P2
