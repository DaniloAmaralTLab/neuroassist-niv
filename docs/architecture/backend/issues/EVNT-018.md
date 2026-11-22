# EVNT-018 -- Implement EmergencyNotificationPort + WebPushAdapter (VAPID, push_subscription rows, 410 → revoked_at, ESC-6 retry)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Tier 0 out-of-band channel (ADR-005 / SPEC-11): sends a Web Push notification to each of the
caregiver's active `push_subscription` rows using the VAPID key pair
(`EVNT_WEBPUSH_VAPID_PUBLIC_KEY` / `EVNT_WEBPUSH_VAPID_PRIVATE_KEY`). The `EmergencyNotificationPort`
is the provider-agnostic outbound port; `WebPushAdapter` implements it for VAPID. Per-tier retry:
up to `EVNT_ESCALATION_PROVIDER_MAX_RETRIES` with capped exponential backoff (ESC-6). A `410 Gone`
response from the push service sets `push_subscription.revoked_at = now()` on the matching row
(soft retire — EVNT-009). No subscription → attempt recorded `failed` reason `no-subscription`,
tier still advances (ESC-5). Tier 0 is unaffected by INT-EVNT-ACS-001 (phone data not needed).

## Spec de referencia
- SPEC-11 §Tier 0, ESC-5, ESC-6
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §8

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/notification/WebPushAdapter.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/notification/VapidKeyConfig.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/notification/WebPushAdapterTest.java` (send ok, 410 → revoke, no-subscription, retry)
- [ ] verify VAPID key pair loaded from env at startup; fail fast with clear error if absent

## Criterios de aceite
- [ ] AC-1 Valid subscription + VAPID keys → push send succeeds, attempt recorded `sent`
- [ ] AC-2 Push service returns `410 Gone` → `push_subscription.revoked_at` set, attempt recorded `failed` reason `endpoint-gone`
- [ ] AC-3 No active subscription for the caregiver → attempt recorded `failed` reason `no-subscription`, tier advances (ESC-5)
- [ ] AC-4 Transient provider error → retried up to `EVNT_ESCALATION_PROVIDER_MAX_RETRIES` with backoff before marking `failed` (ESC-6)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.notification.WebPushAdapterTest"` exits 0

## Dependencias
- EVNT-009 (precede — PushSubscriptionRepositoryAdapter for revoked_at path)
- EVNT-016 (precede — EmergencyNotificationPort interface defined in domain)
- EVNT-021 (precede — VAPID env configuration)

## Estimativa
M

## Prioridade
P6
