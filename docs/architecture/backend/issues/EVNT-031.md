# EVNT-031 -- DetectionLapseService — resolve endpoint POST /evnt/detection-lapses/{lapseId}/resolution with 404 guard (SPEC-12 LAPSE-5, api-contract §10.2)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EDGE calls `POST /evnt/detection-lapses/{lapseId}/resolution` on the device's first `RUNNING`
heartbeat (station recovered). Same service-client identity as the raise. Sets `resolved_at =
now()` and `status = resolved`; stops escalation on the next sweep (LAPSE-5: the lapse leaves
the open set). **Idempotent**: a replayed resolve on an already-resolved lapse returns `200 OK`
with no second audit. `404 Not Found` for an unknown `lapseId` (EDGE keeps its episode open and
retries — EDGE integration-contracts §6.2). Body is empty (`{}`).

## Spec de referencia
- SPEC-12-detection-lapse-alerting.md §Ingest surface / LAPSE-5
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §10.2
- docs/architecture/backend/services/evnt-service/adr/ADR-006-detection-lapse-alerting.md

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/DetectionLapseService.java` (add `resolve` operation)
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/ResolveDetectionLapseResponse.java`
- [ ] update `src/test/java/com/neuroassist/evnt/application/DetectionLapseServiceTest.java` (resolve scenarios)

## Criterios de aceite
- [ ] AC-1 `POST /evnt/detection-lapses/{lapseId}/resolution` on an open lapse: sets `resolved_at`, returns `200 OK` body `{id, status:"resolved", resolvedAt}`, and audits `DetectionLapseResolved` (EVNT-035)
- [ ] AC-2 Replayed resolve on an already-resolved lapse: returns `200 OK` with no second `DetectionLapseResolved` audit (idempotent)
- [ ] AC-3 Unknown `{lapseId}`: returns `404 Not Found` (EDGE retries)
- [ ] AC-4 `./gradlew :evnt-service:test --tests "*.application.DetectionLapseServiceTest"` exits 0 for resolve scenarios

## Dependencias
- EVNT-030 (precede — DetectionLapseService + repository exist)

## Estimativa
S

## Prioridade
P2
