# HIST-013 -- PatientHistoryService + QueryPatientHistory use case — keyset pagination (occurredAt desc, id desc), period/range resolution (today/week/month), 400 on partial from/to

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Implements `GET /hist/patients/{patientId}/history` (api-contract §2) as the caregiver-facing,
patient-scoped read-only timeline. `PatientHistoryController` delegates to `PatientHistoryService`
which runs `QueryPatientHistory`. Key behaviors:

- **Window resolution**: `period` enum (today/week/month) → computed `from`/`to`; explicit
  `from`/`to` overrides `period`; both `from` and `to` are required together (either both or
  neither); only one supplied → `400`.
- **Fact set**: `EventGenerated`, `AlarmConfirmed`, `FeedbackRecorded`, `EscalationAttempted`,
  `DetectionLapseRaised/Resolved/Acknowledged` (EVNT `detection-lapse`) and
  `DetectionLapseStarted/Resolved` (EDGE `edge-device`).
- **Keyset pagination**: cursor is opaque base64 of `(occurred_at, id)` last seen; query
  `ORDER BY occurred_at DESC, id DESC`; `size` range 1..100 (default 20).
- **ACS link scoping**: delegated to `CaregiverLinkScopeChecker` (HIST-012); `403` on scope
  violation.

## Spec de referencia

- SPEC-03 (caregiver history timeline)
- api-contract.md §2 (GET /hist/patients/{patientId}/history, query params, response shape)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/service/PatientHistoryService.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/usecase/QueryPatientHistory.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/controller/PatientHistoryController.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/dto/HistoryEntryResponse.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/dto/PatientHistoryResponse.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/domain/port/out/PatientAuditReadPort.java`

## Criterios de aceite

- [ ] AC-1 `GET /hist/patients/{id}/history` without `period`/`from`/`to` defaults to `period=today`
- [ ] AC-2 Only `from` or only `to` supplied → `400 application/problem+json`
- [ ] AC-3 Explicit `from`+`to` overrides `period`; response `window` matches the supplied range
- [ ] AC-4 Timeline entries ordered newest-first (`occurred_at DESC, id DESC`)
- [ ] AC-5 `nextCursor` present when more records exist; subsequent request with cursor returns next page; `nextCursor` absent on last page
- [ ] AC-6 Fact set includes both EDGE and EVNT `DetectionLapseResolved` as distinct entries when both are present in window
- [ ] AC-7 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-009 (JPA adapter — read path)
- HIST-012 (link scoping)

## Estimativa

L

## Prioridade
P6
