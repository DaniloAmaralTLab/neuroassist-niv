# EVNT-020 -- Implement AwsVoiceAdapter — AWS End User Messaging Voice (EVNT_ESCALATION_VOICE_ENABLED=false default, ESC-5 advance-on-failure, ESC-6 retry)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Tier 2 out-of-band channel (ADR-005 / SPEC-11): places a voice call to the caregiver's `phoneE164`
(INT-EVNT-ACS-001). Structurally identical to `AwsSmsAdapter` (EVNT-019) but via AWS End User
Messaging Voice API in the project-selected Region. **Disabled by default**
(`EVNT_ESCALATION_VOICE_ENABLED=false`). When disabled, records `failed` reason `channel-disabled`
(ESC-5). `voiceCapable` and `preferredLocale` from ACS (INT-EVNT-ACS-001) govern whether the call
is placed and the message language. All cross-Region and Lambda@Edge constraints from CLAUDE.md apply.

## Spec de referencia
- SPEC-11 §Tier 2, ESC-5, ESC-6
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §8

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/notification/AwsVoiceAdapter.java`
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/notification/AwsVoiceAdapterTest.java` (disabled, no-contact, provider ok, retry)
- [ ] reuse `AwsMessagingConfig` from EVNT-019

## Criterios de aceite
- [ ] AC-1 `EVNT_ESCALATION_VOICE_ENABLED=false` → attempt recorded `failed` reason `channel-disabled`, no AWS API call
- [ ] AC-2 Caregiver has no `phoneE164` or `voiceCapable = false` → `failed` reason `no-contact`
- [ ] AC-3 `EVNT_ESCALATION_VOICE_ENABLED=true` and valid phone → voice call placed via AWS End User Messaging Voice in project-selected Region
- [ ] AC-4 `./gradlew :evnt-service:test --tests "*.notification.AwsVoiceAdapterTest"` exits 0

## Dependencias
- EVNT-013 (precede — AcsClient for phone/voiceCapable)
- EVNT-019 (precede — AwsMessagingConfig shared)
- EVNT-021 (precede — voice enabled/disabled config)
- INT-EVNT-ACS-001 (caregiver phone — operational blocker for live delivery)
- INT-EVNT-005 (AWS prerequisites — operational blocker before enabling)

## Estimativa
S

## Prioridade
P6
