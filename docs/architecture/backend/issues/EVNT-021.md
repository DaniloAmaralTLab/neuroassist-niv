# EVNT-021 -- Configure escalation environment variables and VAPID key-pair setup (EVNT_ESCALATION_* timing, EVNT_WEBPUSH_VAPID_* keys, channel enable/disable flags)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Binds all SAFETY-1 configuration into an `EscalationProperties` bean. Configurable timings
(seconds): `EVNT_ESCALATION_SWEEP_SECONDS=5`, `EVNT_ESCALATION_PUSH_AFTER_SECONDS=0`,
`EVNT_ESCALATION_SMS_AFTER_SECONDS=30`, `EVNT_ESCALATION_VOICE_AFTER_SECONDS=90`. Channel
enable/disable flags: `EVNT_ESCALATION_SMS_ENABLED=false`, `EVNT_ESCALATION_VOICE_ENABLED=false`
(telephony off by default). VAPID keys: `EVNT_WEBPUSH_VAPID_PUBLIC_KEY` and
`EVNT_WEBPUSH_VAPID_PRIVATE_KEY` (required for Tier 0 — service fails to start if absent with a
clear error). `AWS_REGION` must equal the project-selected Region. All env var names match
`setup-local.md` exactly. Provider max retries: `EVNT_ESCALATION_PROVIDER_MAX_RETRIES=2`.

## Spec de referencia
- SPEC-11 §default timings
- docs/architecture/backend/services/evnt-service/setup-local.md

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/notification/EscalationProperties.java`
- [ ] configurar `src/main/resources/application.yml` (default values, Tier 0 required keys)
- [ ] startup validation: fail-fast with descriptive message if `EVNT_WEBPUSH_VAPID_PUBLIC_KEY` or `_PRIVATE_KEY` absent
- [ ] unit test `src/test/java/com/neuroassist/evnt/infrastructure/notification/EscalationPropertiesTest.java`

## Criterios de aceite
- [ ] AC-1 `EscalationProperties` loads all 8 env vars with correct types and defaults
- [ ] AC-2 Application fails to start with a clear error if VAPID keys are absent (not a NullPointerException at first push)
- [ ] AC-3 `EVNT_ESCALATION_SMS_ENABLED` and `_VOICE_ENABLED` default to `false` — no telephony calls without explicit opt-in
- [ ] AC-4 All env var names match `setup-local.md` exactly (no rename drift)
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.notification.EscalationPropertiesTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- EVNT-016 (precede — EscalationPolicy reads timing from these properties)

## Estimativa
S

## Prioridade
P6
