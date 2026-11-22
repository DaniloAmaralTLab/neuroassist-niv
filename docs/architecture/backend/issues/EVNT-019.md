# EVNT-019 -- Implement AwsSmsAdapter — AWS End User Messaging SMS (EVNT_ESCALATION_SMS_ENABLED=false default, ESC-5 advance-on-failure, ESC-6 retry)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Tier 1 out-of-band channel (ADR-005 / SPEC-11): sends an SMS to the caregiver's `phoneE164`
obtained from ACS (INT-EVNT-ACS-001). Implements `EmergencyNotificationPort` for the SMS channel.
**Disabled by default** (`EVNT_ESCALATION_SMS_ENABLED=false`) — enabled only after the AWS
prerequisites are confirmed (INT-EVNT-005): project Region, +55 origination, sender registration,
account plan. When disabled, the tier is recorded `failed` reason `channel-disabled` (ESC-5 —
never a silent gap). Uses AWS End User Messaging (Pinpoint SMS and Voice v2 API) in the
**project-selected Region** (no cross-Region — CLAUDE.md constraint). Per-tier retry ESC-6.
No phone/no consent → `failed` reason `no-contact`/`no-consent`.

## Spec de referencia
- SPEC-11 §Tier 1, ESC-5, ESC-6
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §8

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/notification/AwsSmsAdapter.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/notification/AwsMessagingConfig.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/notification/AwsSmsAdapterTest.java` (disabled channel, no-contact, provider ok, retry)
- [ ] verify `EVNT_ESCALATION_SMS_ENABLED=false` skips send and records `channel-disabled` without throwing

## Criterios de aceite
- [ ] AC-1 `EVNT_ESCALATION_SMS_ENABLED=false` → attempt recorded `failed` reason `channel-disabled`, no AWS API call made
- [ ] AC-2 Caregiver has no `phoneE164` from ACS (INT-EVNT-ACS-001 not yet resolved) → `failed` reason `no-contact`, tier still advances
- [ ] AC-3 `notifyConsent = false` → `failed` reason `no-consent`, no SMS sent
- [ ] AC-4 `EVNT_ESCALATION_SMS_ENABLED=true` and valid phone → SMS sent via AWS End User Messaging in project-selected Region, attempt `sent`
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.notification.AwsSmsAdapterTest"` exits 0

## Dependencias
- EVNT-013 (precede — AcsClient for phone/consent; will degrade gracefully until INT-EVNT-ACS-001 resolved)
- EVNT-016 (precede — EmergencyNotificationPort interface)
- EVNT-021 (precede — SMS enabled/disabled config)
- INT-EVNT-ACS-001 (caregiver phone — operational blocker for Tier 1 live delivery)
- INT-EVNT-005 (AWS prerequisites — operational blocker before enabling)

## Estimativa
M

## Prioridade
P6
