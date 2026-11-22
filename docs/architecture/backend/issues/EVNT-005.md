# EVNT-005 -- Implement ConfirmAlarmUseCase — idempotent confirmation, AlarmConfirmed HIST audit, 409 on routine event

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Explicit caregiver acknowledgement of an emergency: sets `confirmedAt = now()` and
`confirmedBy = JWT sub`, removing the event from the active-alarm query. Idempotent: a second
confirm on an already-confirmed emergency returns `200 OK` with the existing `confirmedAt/confirmedBy`
and does NOT emit a second `AlarmConfirmed` audit (INV-EVNT-5). Attempting to confirm a `routine`
event returns `409 Conflict` type `not-confirmable` without touching the row. The domain invariant
`ck_event_confirm_emergency` backs this at the DB level. Calls `AuditPort.record(AlarmConfirmed)`
within the same request on the first confirm.

## Spec de referencia
- SPEC-01 §4 (api surface confirmation)
- SPEC-05 (idempotency INV-EVNT-5)
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §4.1
- docs/architecture/backend/services/evnt-service/contracts/event-contracts.md §1.2 (AlarmConfirmed)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/usecase/ConfirmAlarmUseCase.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/EventConfirmationController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/ConfirmationResponse.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/application/ConfirmAlarmUseCaseTest.java`

## Criterios de aceite
- [ ] AC-1 First confirm on an unconfirmed `emergency` sets `confirmedAt/confirmedBy` and calls `AuditPort.record(AlarmConfirmed)` exactly once
- [ ] AC-2 Second confirm on an already-confirmed `emergency` returns `200 OK` with existing `confirmedAt` and does NOT call audit again (INV-EVNT-5)
- [ ] AC-3 Confirm on a `routine` event returns `409 Conflict` type `not-confirmable` without modifying the row
- [ ] AC-4 `./gradlew :evnt-service:test --tests "*.application.ConfirmAlarmUseCaseTest"` exits 0

## Dependencias
- EVNT-002 (precede — Event aggregate)
- EVNT-008 (precede — EventRepository)
- EVNT-013 (precede — ACS link scoping on the controller path)
- EVNT-014 (precede — HistAuditFeignClient)

## Estimativa
S

## Prioridade
P2
