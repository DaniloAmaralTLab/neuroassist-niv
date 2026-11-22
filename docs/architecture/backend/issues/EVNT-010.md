# EVNT-010 -- Implement EscalationAttempt JPA entity and EscalationAttemptRepositoryAdapter (uq_escalation_tier idempotency guard, FK to event)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Persistence adapter for the `escalation_attempt` table (tenant schema). The `uq_escalation_tier`
UNIQUE constraint on `(event_id, tier, caregiver_id, channel_target)` enforces ESC-4 at the DB:
a repeated sweep is a no-op because a second insert for the same tuple is rejected. The adapter
catches `DataIntegrityViolationException` on that unique key and silently returns (the row already
exists — the tier was already attempted). The `fk_escalation_event` FK keeps attempts consistent
with their parent event (within-service FK is allowed — it is not a cross-service reference).
Queries: unconfirmed emergencies with due-but-unattempted tiers for the sweep (EVNT-017), and
all attempts for an event ordered by `attemptedAt` for the api read (EVNT-022).

## Spec de referencia
- SPEC-11 §ESC-4 (idempotency)
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.3

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/escalation/EscalationAttempt.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/escalation/EscalationAttemptRepository.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/EscalationAttemptJpaEntity.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/EscalationAttemptJpaRepository.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/EscalationAttemptRepositoryAdapter.java`

## Criterios de aceite
- [ ] AC-1 `save(attempt)` with new `(eventId, tier, caregiverId, channelTarget)` persists the row
- [ ] AC-2 `save(attempt)` with duplicate `(eventId, tier, caregiverId, channelTarget)` is a no-op (uq_escalation_tier — ESC-4)
- [ ] AC-3 `findByEventId(eventId)` returns all attempts ordered by `attemptedAt` ASC
- [ ] AC-4 `findDueTiers(eventId, now)` returns `(tier, caregiverId, channel)` tuples not yet in `escalation_attempt` and past their scheduled time
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.persistence.EscalationAttemptRepositoryAdapterTest"` exits 0

## Dependencias
- EVNT-002 (precede — Event aggregate)
- EVNT-007 (precede — migrations; FK to event)
- EVNT-015 (precede — TenantContextHolder)

## Estimativa
M

## Prioridade
P3
