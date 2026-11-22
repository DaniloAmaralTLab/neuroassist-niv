# INT-EVNT-005 -- AWS End User Messaging prerequisites — confirm project Region, +55 SMS/voice origination availability, sender registration, account plan (operational blocker for Tiers 1–2)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

**Operational blocker before enabling telephony tiers.** `EVNT_ESCALATION_SMS_ENABLED` and
`EVNT_ESCALATION_VOICE_ENABLED` are `false` by default and may only be set to `true` after the
items below are confirmed. All AWS End User Messaging resources must be created in the **project-selected
Region** — no cross-Region is allowed (CLAUDE.md). Until confirmed, Tiers 1–2 record `failed`
reason `channel-disabled` (ESC-5); Tier 0 Web Push operates without any AWS dependency.

**Checklist (operational — no code change in EVNT):**

1. Confirm project Region in **AWS Settings > View all projects > Overview > Additional Info > Region**
2. Verify AWS End User Messaging (SMS + Voice) availability in that Region (supported-services list)
3. Confirm account plan supports AWS End User Messaging (`aws freetier get-account-plan-state`; may require paid plan or advanced-feature activation)
4. Confirm **+55 (Brazil) origination requirements**: long code / short code / sender ID availability; any registration or regulatory onboarding
5. Confirm **voice origination** in the selected Region for Brazilian numbers

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §8 (TODO[architect])
- docs/architecture/backend/services/evnt-service/setup-local.md (AWS_REGION, EVNT_ESCALATION_SMS_ENABLED)

## Escopo
- [ ] Confirm Region in AWS Settings (> View all projects > Overview > Additional Info > Region)
- [ ] Check AWS End User Messaging SMS availability in selected Region (aws supported-services list)
- [ ] Check AWS End User Messaging Voice availability in selected Region
- [ ] Confirm +55 origination type (long code / short code / sender ID) and any registration requirements
- [ ] Confirm account plan (free vs paid; advanced-feature activation if needed)

## Criterios de aceite
- [ ] AC-1 Project Region confirmed and documented in `setup-local.md`
- [ ] AC-2 AWS End User Messaging (SMS) confirmed available in selected Region
- [ ] AC-3 AWS End User Messaging (Voice) confirmed available in selected Region
- [ ] AC-4 +55 origination type selected and registration completed (if required)
- [ ] AC-5 Account plan confirmed as supporting AWS End User Messaging; `EVNT_ESCALATION_SMS_ENABLED=true` and `_VOICE_ENABLED=true` can be set safely

## Dependencias
- EVNT-019 (AwsSmsAdapter — telephony feature-flagged off until this resolves)
- EVNT-020 (AwsVoiceAdapter — telephony feature-flagged off until this resolves)

## Estimativa
S

## Prioridade
P6
