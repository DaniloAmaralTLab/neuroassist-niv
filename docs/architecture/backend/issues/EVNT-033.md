# EVNT-033 -- PatientDetectionLapseService — list detection lapses GET /evnt/patients/{patientId}/detection-lapses (SPEC-12 LAPSE-3, api-contract §11.1)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Exposes the **distinct** "station not detecting" caregiver surface (LAPSE-3): separate from the
emergency `active-alarm` list; a lapse is never rendered as an emergency. Query param
`?status=open|all` (default `open`). Scoped by tenant + ACS caregiver↔patient link (INV-EVNT-7):
unlinked/cross-tenant → `404`. Ordered `lapse_started_at DESC`. Response envelope:
`{ patientId, lapses: [{ id, deviceId, cause, detectionState, status, lapseStartedAt,
acknowledgedAt, resolvedAt }] }`.

## Spec de referencia
- SPEC-12-detection-lapse-alerting.md §Caregiver surface / LAPSE-3
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §11.1

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/PatientDetectionLapseController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/ListDetectionLapsesResponse.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/PatientDetectionLapseService.java`
- [ ] implementar `src/test/java/com/neuroassist/evnt/application/PatientDetectionLapseServiceTest.java`

## Criterios de aceite
- [ ] AC-1 `GET /evnt/patients/{patientId}/detection-lapses?status=open` returns only lapses with `resolved_at IS NULL AND acknowledged_at IS NULL`, newest first, for a linked caregiver (LAPSE-3)
- [ ] AC-2 `?status=all` returns lapses in all statuses (open, resolved, acknowledged)
- [ ] AC-3 Unlinked/cross-tenant caller: returns `404 Not Found` (INV-EVNT-7); never discloses existence
- [ ] AC-4 Response envelope contains `patientId` and `lapses[]` with all fields per api-contract §11.1; active-alarm endpoint does NOT include lapses (LAPSE-3)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.application.PatientDetectionLapseServiceTest"` exits 0

## Dependencias
- EVNT-030 (precede — detection_lapse repository)
- EVNT-013 (precede — AcsCaregiverFeignClient for link resolution INV-EVNT-7)

## Estimativa
S

## Prioridade
P2
