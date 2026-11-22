# EVNT-023 -- Implement PushSubscriptionController — POST /evnt/push-subscriptions and DELETE /evnt/push-subscriptions/{subscriptionId}

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

Exposes the two push-subscription management endpoints (caregiver path, ACS resource server,
authorities `evnt.subscription.create` / `evnt.subscription.delete`). `caregiverId` and `tenantId`
come from the JWT (`sub` / `tenantId` claim) — never from the body (INV-EVNT-1). `POST` is
idempotent: same `(tenantId, endpoint)` returns `200 OK` with the existing subscription id (not
a new row). `DELETE` is idempotent for the caller's own rows; a subscription not owned by the
caller (different `caregiverId`) returns `404` (anti-enumeration posture — INV-EVNT-7 extended).
The browser may re-register the same subscription endpoint on page reload — the `200 OK` path
prevents duplicate rows.

## Spec de referencia
- SPEC-11 §push subscription (ADR-005)
- docs/architecture/backend/services/evnt-service/contracts/api-contract.md §6

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/PushSubscriptionController.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/PushSubscriptionRequest.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/api/dto/PushSubscriptionResponse.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/usecase/CreatePushSubscriptionUseCase.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/application/usecase/DeletePushSubscriptionUseCase.java`

## Criterios de aceite
- [ ] AC-1 `POST /evnt/push-subscriptions` with new `{endpoint, keys.p256dh, keys.auth}` → `201 Created` with `Location` header and `{id, createdAt}`
- [ ] AC-2 Same `(tenantId, endpoint)` re-registered → `200 OK` with existing `{id}`, no new row
- [ ] AC-3 `DELETE /evnt/push-subscriptions/{id}` owned by caller → `204 No Content`
- [ ] AC-4 `DELETE` on `{id}` not owned by caller or non-existent → `404 Not Found` (anti-enumeration)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.api.PushSubscriptionControllerTest"` exits 0

## Dependencias
- EVNT-009 (precede — PushSubscriptionRepositoryAdapter)
- EVNT-015 (precede — security config for subscription authorities)

## Estimativa
S

## Prioridade
P7
