# EVNT-032 -- DetectionLapseService — acknowledge endpoint POST /evnt/detection-lapses/{lapseId}/confirmation (SPEC-12 LAPSE-5, api-contract §12.1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Caregiver acknowledgement of the "station not detecting" alert (op `acknowledgeDetectionLapse`,
canonical `confirm` verb). Linked caregiver calls `POST /evnt/detection-lapses/{lapseId}/confirmation`
(authority `evnt.detection-lapse.confirm`). Sets `acknowledged_at = now()` and
`acknowledged_by = JWT sub`; stops escalation on the next sweep (LAPSE-5 — the lapse leaves the
open set). **Idempotent**: a replay on an already-acknowledged (or resolved) lapse returns `200 OK`
with no second audit. `404` for unlinked/cross-tenant (INV-EVNT-7). Body empty (`{}`).

## Spec de referencia
- SPEC-12-detection-lapse-alerting.md §Caregiver surface / LAPSE-5
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §12.1

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/DetectionLapseService.java` (add `acknowledge` operation)
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/AcknowledgeDetectionLapseResponse.java`
- [ ] update `src/test/java/com/neuroassist/evnt/application/DetectionLapseServiceTest.java` (acknowledge scenarios)

## Criterios de aceite
- [ ] AC-1 Linked caregiver acknowledges an open lapse: sets `acknowledged_at`/`acknowledged_by = sub`, returns `200 OK` body `{id, status:"acknowledged", acknowledgedAt, acknowledgedBy}`, and audits `DetectionLapseAcknowledged` (EVNT-035)
- [ ] AC-2 Replayed acknowledgement of an already-acknowledged (or resolved) lapse: returns `200 OK` with no second `DetectionLapseAcknowledged` audit (idempotent)
- [ ] AC-3 Unlinked/cross-tenant `{lapseId}`: returns `404 Not Found` (INV-EVNT-7)
- [ ] AC-4 `./gradlew :evnt-service:test --tests "*.application.DetectionLapseServiceTest"` exits 0 for acknowledge scenarios

## Dependencias
- EVNT-030 (precede — DetectionLapseService + repository exist)

## Estimativa
S

## Prioridade
P2
