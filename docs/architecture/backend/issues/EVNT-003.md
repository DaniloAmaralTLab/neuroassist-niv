# EVNT-003 -- Implement GestureReportController — POST /evnt/gesture-reports (edge.device path, authority evnt.event.ingest)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Exposes `POST /evnt/gesture-reports` as the **device path** (EDGE resource server): validates an
`edge.device` token (authority `evnt.event.ingest`), extracts `deviceId/patientId/tenantId` from
the token claims only (never the body — INV-EVNT-6), and delegates to `IngestGestureReportUseCase`.
The controller enforces the RFC 7807 error surface: `400 validation-error`, `401 unauthorized`,
`403 forbidden`, `404 command-not-found`, `503 catalog-unavailable`, `502 audit-unavailable`
(api-contract §2 and §8). `Location: /evnt/events/{id}` on `201`.

## Spec de referencia
- SPEC-01 (api surface §2.1)
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/GestureReportController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/GestureReportRequest.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/EventResponse.java`
- [ ] bean validation annotations on `GestureReportRequest` (`commandId`, `reportId`, `occurredAt` required; `confidence` 0..1; `recognitionWindowMs` >= 0)
- [ ] unit test for controller layer `src/test/java/com/neuroassist/evnt/api/GestureReportControllerTest.java`

## Criterios de aceite
- [ ] AC-1 `POST /evnt/gesture-reports` with valid `edge.device` token returns `201 Created` with `Location` header
- [ ] AC-2 Idempotent replay of same `(deviceId, reportId)` returns `200 OK` with the existing event body
- [ ] AC-3 Body without `commandId`, `reportId`, or `occurredAt` returns `400 validation-error`
- [ ] AC-4 Request with caregiver ACS token (wrong issuer for device path) returns `401 Unauthorized` (INV-EVNT-6)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.api.GestureReportControllerTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- EVNT-002 (precede — domain types)
- EVNT-015 (precede — security config for edge.device path)

## Estimativa
M

## Prioridade
P2
