# INT-EVNT-ACS-001 -- ACS to expose caregiver notification contacts (phoneE164, smsCapable, voiceCapable, notifyConsent, preferredLocale) for SAFETY-1 Tiers 1–2

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

**Cross-module dependency — do NOT edit ACS code or ACS contracts.** EVNT's out-of-band
escalation (SPEC-11, ADR-005) requires a caregiver's phone number and consent for Tiers 1–2
(SMS, voice). ACS does not expose a caregiver phone today: `GET /acs/caregivers/{id}/links`
returns link scoping only. This issue tracks the **ACS-side work** needed before EVNT can
deliver Tiers 1–2 to real phones. Until resolved, EVNT records `failed` reason `no-contact`
for every Tier 1/2 attempt (ESC-5 — never silent). Tier 0 Web Push is fully operational
without this change.

The fields EVNT needs per linked caregiver:

| Field | Purpose |
|---|---|
| `phoneE164` | SMS/voice destination (`+55…`) |
| `smsCapable` | whether the number can receive SMS |
| `voiceCapable` | whether the number supports voice calls |
| `notifyConsent` | explicit caregiver consent for out-of-band contact |
| `preferredLocale` | voice/SMS message language (optional) |

Candidate shapes (ACS decides): extend existing `links` response with a `contact` block, or
add a new endpoint `GET /acs/caregivers/{id}/notification-contacts`. This issue is the
coordination point; the actual change lives in the ACS backlog.

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §3.1
- SPEC-11 (ESC-3: recipients, ESC-5: advance-on-failure)

## Escopo
- [ ] ACS team to decide and implement the exposure shape (extend links or new endpoint)
- [ ] EVNT to update `CaregiverLinksPort` / `AcsCaregiverFeignClient` (EVNT-013) once ACS shape is confirmed
- [ ] EVNT-019 (AwsSmsAdapter) and EVNT-020 (AwsVoiceAdapter) to consume `phoneE164`/`smsCapable`/`voiceCapable`/`notifyConsent` once available
- [ ] Integration test: Tier 1/2 attempt with `notifyConsent = false` → recorded `failed no-consent` (never sent)
- [ ] Integration test: Tier 1/2 attempt with `phoneE164` present → escalation proceeds to AWS End User Messaging

## Criterios de aceite
- [ ] AC-1 ACS exposes `phoneE164`, `smsCapable`, `voiceCapable`, `notifyConsent`, `preferredLocale` per linked caregiver via a stable REST endpoint
- [ ] AC-2 `CaregiverLinksPort` updated in EVNT to include the new contact fields (EVNT-013)
- [ ] AC-3 `AwsSmsAdapter` reads `phoneE164` and `notifyConsent` from ACS response; `no-contact` reason is eliminated for provisioned caregivers
- [ ] AC-4 Caregiver with `notifyConsent = false` → SMS/voice attempt recorded `failed no-consent` with no AWS API call
- [ ] AC-5 Existing Tier 0 Web Push path unaffected by ACS shape change (phone data not needed for Tier 0)

## Dependencias
- EVNT-013 (AcsCaregiverFeignClient — will be updated when ACS shape is confirmed)
- EVNT-019 (AwsSmsAdapter — depends on this for real phone delivery)
- EVNT-020 (AwsVoiceAdapter — depends on this for real phone delivery)

## Estimativa
M

## Prioridade
P4
