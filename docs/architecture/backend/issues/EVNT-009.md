# EVNT-009 -- Implement PushSubscription JPA entity and PushSubscriptionRepositoryAdapter (uq endpoint, revoked_at 410 path)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Persistence adapter for the `push_subscription` table (tenant schema). The `uq_push_sub_endpoint`
unique constraint on `(tenant_id, endpoint)` makes duplicate registration idempotent — the adapter
catches `DataIntegrityViolationException` and returns the existing subscription (`200 OK` path at
api §6.1). A Web Push `410 Gone` from the push service (detected in EVNT-018 `WebPushAdapter`) sets
`revoked_at = now()` on the matching row — it is a soft retire, not a hard delete, so the audit of
what existed is preserved. Active subscriptions are queried by `(tenantId, caregiverId)` using the
partial index `ix_push_sub_caregiver` (WHERE revoked_at IS NULL).

## Spec de referencia
- SPEC-11 (push subscription lifecycle — ADR-005)
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.2
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §6

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/push/PushSubscription.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/domain/push/PushSubscriptionRepository.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/PushSubscriptionJpaEntity.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/PushSubscriptionJpaRepository.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/PushSubscriptionRepositoryAdapter.java`

## Criterios de aceite
- [ ] AC-1 `save(subscription)` with new `(tenantId, endpoint)` persists the row and returns `201`-path entity
- [ ] AC-2 `save(subscription)` with duplicate `(tenantId, endpoint)` returns the existing subscription (idempotent `200` path — api §6.1)
- [ ] AC-3 `findActiveByCaregiverId(tenantId, caregiverId)` returns only rows where `revoked_at IS NULL`
- [ ] AC-4 `revoke(subscriptionId)` sets `revoked_at = now()` without deleting the row (410 handling)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.persistence.PushSubscriptionRepositoryAdapterTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- EVNT-007 (precede — migrations)
- EVNT-015 (precede — TenantContextHolder)

## Estimativa
M

## Prioridade
P3
