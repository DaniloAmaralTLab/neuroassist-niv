# EVNT-002 -- Define Event domain aggregate with Urgency and Feedback enums and invariants

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

The `Event` aggregate is the single EVNT-owned entity (ADR-004 local: one table, no separate
"active alarm" entity — INV-EVNT-3). It carries two mutable axes (`confirmedAt/confirmedBy`,
`feedback`) and two immutable snapshots (`urgency`, `commandLabel`) captured from PAT at generation
(INV-EVNT-2). The domain class must enforce the invariants: only an `emergency` can be confirmed
(INV-EVNT-5); `confirmed_at` and `confirmed_by` are set together (`ck_event_confirm_pair`).
No JPA annotations here — domain is pure (ADR-001-hexagonal-architecture.md).

## Spec de referencia
- SPEC-02 (event generation invariants)
- SPEC-05 (idempotency — INV-EVNT-4/5)
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.1

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/event/Event.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/event/Urgency.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/event/Feedback.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/event/EventRepository.java`
- [ ] unit tests for domain invariants in `src/test/java/com/neuroassist/evnt/domain/EventTest.java`

## Criterios de aceite
- [ ] AC-1 `Event.confirm(caregiverId)` throws `NotConfirmableException` when `urgency == ROUTINE` (INV-EVNT-5)
- [ ] AC-2 `Event.confirm(caregiverId)` is idempotent — a second call on a confirmed event returns the existing `confirmedAt` without changing it (INV-EVNT-5)
- [ ] AC-3 `Urgency` has exactly two values: `EMERGENCY`, `ROUTINE`
- [ ] AC-4 `Feedback` has exactly three values: `NOT_EVALUATED`, `REAL`, `FALSE_POSITIVE`
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.domain.EventTest"` exits 0

## Dependencias
- EVNT-001 (precede)

## Estimativa
S

## Prioridade
P1
