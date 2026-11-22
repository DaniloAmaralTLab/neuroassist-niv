# SPEC-11 — Out-of-band Emergency Escalation

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> ADR: `../../adr/ADR-005-out-of-band-emergency-escalation.md`. Closes `SAFETY-1` (SPEC-03).
> Port/adapters: `../../contracts/integration-contracts.md` §3.1, §8. Tables: `../../contracts/data-model.md` §2.2–2.3.

> **This is the life-safety path.** It guarantees an emergency is *attempted* out-of-band — Web Push,
> then SMS, then a voice call — while it stays unconfirmed, so a backgrounded / asleep / offline
> caregiver is still reached. Its limits (no guarantee without cellular coverage / a live push
> subscription) are stated as residual risks in SPEC-03, not hidden.

## Objective

Define, as a testable contract, the escalation policy that EVNT runs **inside the service** when an
`emergency` Event is committed and stays unconfirmed: the channel tiers and their timings, who is
notified, idempotency, retry/backoff, quiet-failure fallback, stop-on-confirm, and the audit trail.
Delivery is driven by a **scheduled sweep over unconfirmed emergencies** (sync REST — no broker,
messaging stays disabled: ADR-005).

## Scope

- **In:** the escalation tier ladder + default timings (configurable), the `EmergencyNotificationPort`
  invocation rules, idempotency per `(event, tier)`, per-tier provider retry/backoff, advance-on-failure
  (never silent), stop-on-confirm, the escalation-attempt audit to HIST.
- **Out:** the in-app polling path (SPEC-03 / ADR-003), the provider wire details (AWS End User
  Messaging — integration-contracts §8), the push-subscription REST surface (api-contract §6), the
  caregiver phone-number source (ACS cross-module TODO — integration-contracts §3.1).

## Policy rules (declared once here, cited as `ESC-n`)

These are escalation-policy rules local to SPEC-11 (they compose with the domain invariants
`INV-EVNT-3`/`INV-EVNT-5`; they do not redeclare them):

- **ESC-1 (unconfirmed-drives-escalation):** escalation runs only WHILE an `emergency` Event has
  `confirmed_at IS NULL`; a confirmation stops it immediately (INV-EVNT-5 is the stop signal).
- **ESC-2 (tier ladder):** channels fire in order Tier 0 Web Push → Tier 1 SMS → Tier 2 Voice, each
  tier gated on the emergency still being unconfirmed at its due time.
- **ESC-3 (recipients):** a tier targets **every caregiver linked to the event's patient** in the
  event's tenant (ACS links — INV-EVNT-7); Web Push targets each of their active `push_subscription`
  rows, SMS/Voice target their ACS-sourced phone number.
- **ESC-4 (idempotency):** a given `(event_id, tier, caregiver_id, channel_target)` is attempted **at
  most once**; the `escalation_attempt` UNIQUE guard (data-model §2.3) makes a repeated sweep a no-op.
- **ESC-5 (advance-on-failure, never silent):** IF a channel attempt fails (provider error/timeout,
  no subscription, no phone), THEN the attempt is recorded `failed` with its reason and the policy
  advances the recipient to the **next** tier at that tier's due time — a failure is never swallowed.
- **ESC-6 (bounded per-tier retry):** within a tier, a transient provider error is retried with capped
  exponential backoff before the attempt is marked `failed` and the next tier becomes eligible.
- **ESC-7 (audit-everything):** every attempt — sent or failed — is audited to HIST as
  `EscalationAttempted` (event-contracts §1.2). The audit payload carries a `maskedTarget` masked
  inside EVNT (phone → last 4 digits; push → endpoint host/label only, api §3.4); the raw
  `channel_target` never leaves EVNT in the audit (G-HIST-3, SPEC-06).

> **Reused for detection-lapse alerting (ADR-006 / SPEC-12, SAFETY-GEST-1).** This same engine —
> `EscalationSweep`, `EscalationPolicy`, `EmergencyNotificationPort`, the tier ladder, timings, ESC-3..
> ESC-7 and the `escalation_attempt` idempotency guard — also escalates an **open `detection_lapse`**.
> The lapse differs only in its subject (`lapse_id` instead of `event_id` on the attempt, data-model
> §2.3.1) and its stop signal (`resolved_at`/`acknowledged_at` instead of `confirmed_at`). A real
> emergency **outranks** a lapse: while a patient has an unconfirmed emergency, no new lapse tier starts
> for that patient (SPEC-12 LAPSE-6). The escalation policy here is otherwise unchanged.

## Default timings (configurable — env)

`T` is measured from **emergency commit** (`event.created_at`). Defaults are safe-by-default and
tunable without a release:

| Tier | Channel | Default due | Env override |
|---|---|---|---|
| 0 | Web Push (VAPID) | `T+0 s` (on commit) | `EVNT_ESCALATION_PUSH_AFTER_SECONDS=0` |
| 1 | SMS (AWS End User Messaging) | `T+30 s` if still unconfirmed | `EVNT_ESCALATION_SMS_AFTER_SECONDS=30` |
| 2 | Voice call (AWS End User Messaging) | `T+90 s` if still unconfirmed | `EVNT_ESCALATION_VOICE_AFTER_SECONDS=90` |

- Sweep cadence: `EVNT_ESCALATION_SWEEP_SECONDS=5` — a `@Scheduled` sweep selects unconfirmed
  emergencies and fires each **due, not-yet-attempted** tier.
- Per-tier provider retry: `EVNT_ESCALATION_PROVIDER_MAX_RETRIES=2`, backoff base `2 s`, cap `10 s`.
- A disabled channel (e.g. telephony not yet provisioned — AWS TODO) is configured
  `EVNT_ESCALATION_SMS_ENABLED` / `EVNT_ESCALATION_VOICE_ENABLED`; a disabled tier is **skipped with a
  recorded `failed` attempt reason `channel-disabled`**, never a silent gap (ESC-5).

## Implementation (components, no code)

- `EscalationPolicy` (domain) — given an `Event` and the elapsed time, computes the set of due tiers
  not yet attempted for each linked caregiver.
- `EscalationSweep` (application, `@Scheduled`) — every `EVNT_ESCALATION_SWEEP_SECONDS`, loads
  unconfirmed emergencies (the `ix_event_active_alarm` partial index), resolves linked caregivers
  (ACS, cached), asks `EscalationPolicy` for due tiers, and invokes `EmergencyNotificationPort` per
  tier; persists one `escalation_attempt` row per attempt under the UNIQUE guard (ESC-4).
- `EmergencyNotificationPort` (outbound port, provider-agnostic) with adapters: `WebPushAdapter`
  (VAPID), `AwsSmsAdapter`, `AwsVoiceAdapter` (AWS End User Messaging) — integration-contracts §8.
- On `confirmAlarm` (api §4.1) the event leaves the unconfirmed set, so the very next sweep fires no
  further tier (ESC-1); in-flight provider calls are allowed to complete but no **new** tier is started.

## Edge cases

- Two sweeps overlap (slow provider): the `escalation_attempt` UNIQUE `(event_id, tier, caregiver_id,
  channel_target)` makes the second a no-op (ESC-4) — no duplicate SMS/voice.
- A caregiver has no `push_subscription`: Tier 0 records a `failed` attempt reason `no-subscription`
  for that caregiver and they still receive Tier 1/2 (ESC-5).
- A caregiver has no phone in ACS: Tier 1/2 record `failed` reason `no-contact`; push still applies.
- Emergency confirmed between Tier 1 due and Tier 2 due: Tier 2 never fires (ESC-1).
- Clock/scheduler restart: due-but-unattempted tiers are recomputed from `created_at` + the
  `escalation_attempt` rows on the next sweep (idempotent — ESC-4), so a restart neither duplicates nor
  skips a tier.

## Acceptance criteria (EARS)

- WHEN an `emergency` Event is committed, THE SYSTEM SHALL attempt Tier 0 Web Push to every linked
  caregiver's active subscriptions at `T+0` (ESC-2, ESC-3).
- WHILE an `emergency` remains unconfirmed at the SMS due time, THE SYSTEM SHALL attempt Tier 1 SMS to
  every linked caregiver's phone, and at the voice due time SHALL attempt Tier 2 voice (ESC-2).
- WHEN an `emergency` is confirmed, THE SYSTEM SHALL start no further escalation tier for that event
  (ESC-1, INV-EVNT-5).
- THE SYSTEM SHALL attempt each `(event_id, tier, caregiver_id, channel_target)` at most once, so a
  repeated sweep creates no duplicate notification (ESC-4).
- IF a channel attempt fails (provider error, no subscription, no contact, or a disabled channel),
  THEN THE SYSTEM SHALL record the attempt as `failed` with its reason, advance the recipient to the
  next tier at its due time, and SHALL NOT silently drop the escalation (ESC-5).
- WHILE a tier's provider error is transient, THE SYSTEM SHALL retry with capped exponential backoff up
  to `EVNT_ESCALATION_PROVIDER_MAX_RETRIES` before marking the attempt `failed` (ESC-6).
- WHEN any escalation attempt completes (sent or failed), THE SYSTEM SHALL audit `EscalationAttempted`
  to HIST with `eventId`, `tier`, `channel`, `caregiverId`, `status` and `providerMessageId`
  (event-contracts §1.2, ESC-7).
- THE SYSTEM SHALL drive escalation from a scheduled in-process sweep over unconfirmed emergencies and
  SHALL NOT require the internal message bus (messaging stays disabled — ADR-005).
