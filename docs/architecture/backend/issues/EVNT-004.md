# EVNT-004 -- Implement IngestGestureReportUseCase — PAT command snapshot, Event persist, idempotent replay 200, EventGenerated HIST audit

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

The golden-path use case: receives a gesture report from the controller, resolves `urgency` +
`commandLabel` from PAT via `PatCommandPort` exactly once (ADR-004 local — snapshots, never re-reads),
persists one `Event`, responds `201`. On replay of a known `(deviceId, reportId)` it returns the
existing event `200 OK` without a second persist or audit (INV-EVNT-4). On `EventRepository.save()`
success, calls `AuditPort.record(EventGenerated)` within the same request. Fail-closed on PAT:
`503 catalog-unavailable` on PAT `5xx`/timeout; `404 command-not-found` on PAT `404` — no event
created in either case (ADR-004, Risk R4).

## Spec de referencia
- SPEC-02 (event generation)
- SPEC-05 (idempotency INV-EVNT-4)
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md §1.2 (EventGenerated)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/usecase/IngestGestureReportUseCase.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/port/in/IngestGestureReportCommand.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/application/IngestGestureReportUseCaseTest.java` (PAT ok, PAT 404, PAT 503, idempotent replay, audit called once)
- [ ] integration test stub PAT + HIST to verify 201 round-trip

## Criterios de aceite
- [ ] AC-1 New `(deviceId, reportId)` with PAT returning `{urgency, label}` persists exactly one Event and calls `AuditPort` once with action `EventGenerated`
- [ ] AC-2 Replay of an existing `(deviceId, reportId)` returns the existing event without a second Event persist or audit call (INV-EVNT-4)
- [ ] AC-3 PAT `404` on `commandId` → `404 command-not-found`, no Event created
- [ ] AC-4 PAT `5xx`/timeout → `503 catalog-unavailable`, no Event created, no urgency guessed
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.application.IngestGestureReportUseCaseTest"` exits 0

## Dependencias
- EVNT-002 (precede — Event aggregate)
- EVNT-008 (precede — EventRepository adapter)
- EVNT-012 (precede — PatCommandFeignClient)
- EVNT-014 (precede — HistAuditFeignClient)

## Estimativa
M

## Prioridade
P2
