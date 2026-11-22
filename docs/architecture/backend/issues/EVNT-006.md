# EVNT-006 -- Implement RecordFeedbackUseCase — feedback verdict transition, idempotent same-verdict, FeedbackRecorded HIST audit

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

A caregiver's later verdict on any event (`real` or `false_positive`), independent of confirmation
(two axes — doc 03). Same verdict recorded again → `200 OK`, no second `FeedbackRecorded` audit
(SPEC-05). A **changed** verdict overwrites `feedback` and audits exactly once. `verdict = not_evaluated`
is not an accepted request value (it is the default; `400 validation-error` if supplied). Calls
`AuditPort.record(FeedbackRecorded)` on successful mutation.

## Spec de referencia
- SPEC-01 §5 (feedback surface)
- SPEC-05 (idempotency)
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §5.1
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md §1.2 (FeedbackRecorded)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/usecase/RecordFeedbackUseCase.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/EventFeedbackController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/FeedbackRequest.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/application/RecordFeedbackUseCaseTest.java`

## Criterios de aceite
- [ ] AC-1 `verdict = real` on an un-evaluated event sets `feedback = REAL` and calls `AuditPort.record(FeedbackRecorded)` once
- [ ] AC-2 Same verdict recorded again → `200 OK`, no second audit call
- [ ] AC-3 Changed verdict (e.g. `real` → `false_positive`) overwrites and audits exactly once
- [ ] AC-4 `verdict = not_evaluated` in the request body → `400 Bad Request` type `validation-error`
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.application.RecordFeedbackUseCaseTest"` exits 0

## Dependencias
- EVNT-002 (precede — Event aggregate)
- EVNT-008 (precede — EventRepository)
- EVNT-014 (precede — HistAuditFeignClient)

## Estimativa
S

## Prioridade
P2
