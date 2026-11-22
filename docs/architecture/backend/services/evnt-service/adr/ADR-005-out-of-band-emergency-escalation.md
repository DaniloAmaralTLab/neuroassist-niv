<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-005 — Out-of-band emergency escalation inside EVNT (closes SAFETY-1)

## Status
aceita (Accepted) — decided by the product owner on 2026-11-20. Supersedes the "future signal /
out of v1 scope" framing of SAFETY-1 in ADR-003 (local) — ADR-003 stays accepted for the *in-app*
delivery; ADR-005 adds the *out-of-band* delivery alongside it. Does **not** reopen messaging.

## Contexto
ADR-003 delivers an emergency to the caregiver dashboard by **polling** — and SPEC-03 recorded the
open `TODO[architect] SAFETY-1`: polling cannot reach a caregiver whose dashboard is **backgrounded,
asleep, closed or offline**, so an `emergency` could go unseen. For an assistive / life-safety product
whose only reason to exist is that an emergency *reaches a human*, leaving that to "keep the dashboard
foreground" is not an acceptable clinical posture. The product owner decided (2026-11-20) that an
**out-of-band channel is IN v1**: an emergency must reach a caregiver even when the app is not in the
foreground.

Two framings were considered and rejected:

- **A new module/service for notifications.** Rejected: the escalation clock is tightly coupled to the
  single source of truth (`event.confirmed_at`), and a second service would duplicate the read-time
  active-alarm query and the ACS link resolution. The decision keeps escalation **inside EVNT**.
- **Re-enabling the internal message bus (`stack.messaging.enabled = false`).** Rejected and **not
  reopened.** "Messaging disabled" governs the *internal service bus* (broker fan-out between
  services). Out-of-band escalation is an **outbound integration** to an external provider — it does
  not need the internal bus. The escalation clock is driven by a **scheduled sweep over unconfirmed
  emergencies** executed in-process, entirely over synchronous REST.

## Decisão
EVNT gains an **escalation policy** and a single provider-agnostic outbound port,
`EmergencyNotificationPort`, with per-channel adapters. The policy escalates across channels while an
`emergency` stays **unconfirmed**, and **stops immediately** the instant it is confirmed
(`event.confirmed_at` set — INV-EVNT-5).

1. **Inside EVNT, no new module.** The policy, the port and the sweep live in `evnt-service`. The
   active emergency remains the one read-time query of ADR-010 (INV-EVNT-3); escalation reads the same
   truth.
2. **Channels, escalating (provider-agnostic port):**
   - **Tier 0 — Web Push (VAPID)** at `T+0` (on emergency commit) — the first channel; no external
     telephony cost, reaches a backgrounded browser/PWA via the push service.
   - **Tier 1 — SMS** if still unconfirmed after a configurable delay.
   - **Tier 2 — Voice call** if still unconfirmed after a longer configurable delay — reaches a phone
     with no app installed and no dashboard open.
   - Provider for SMS + Voice = **AWS End User Messaging (SMS + Voice)**, in the AWS project's
     **selected Region** (no cross-Region). The port stays provider-agnostic so the adapter can be
     swapped without touching the policy.
3. **Stop-on-confirm, idempotent, audited, never silent.** A confirmation halts all further tiers; a
   tier is never fired twice for the same event; a provider failure advances to the next tier and is
   **audited**, never swallowed. Every attempt (sent or failed) is recorded to HIST.
4. **Sync-REST clock.** A scheduled sweep (`@Scheduled`, default every 5 s) over unconfirmed
   emergencies computes each event's elapsed time since commit and fires the next **due** tier. No
   broker, no outbox — consistent with the project's sync-REST posture.

Concrete contract and defaults are in **SPEC-11-emergency-escalation.md**; the endpoints (register /
remove a Web Push subscription; read an event's escalation attempts) are in `api-contract.md`; the new
tables (`push_subscription`, `escalation_attempt`) in `data-model.md`; the port/adapters and the AWS
constraints in `integration-contracts.md` / SPEC-10.

## Consequências
- **Positive — SAFETY-1 is closed by design.** An emergency now reaches a caregiver out-of-band
  (push → SMS → voice) independent of the dashboard being foreground/online. The in-app polling path
  (ADR-003) is unchanged and remains the fast path for a foregrounded client.
- **Positive — one source of truth.** Escalation is derived from `event.confirmed_at`; no second state
  machine, no duplicate "alarm" entity (INV-EVNT-3 holds).
- **Positive — reversible provider choice.** `EmergencyNotificationPort` is provider-agnostic; AWS End
  User Messaging is an adapter, not the contract.
- **Negative / residual risk.** Delivery is now *attempted* out-of-band but is **not guaranteed**: a
  voice call still depends on **cellular coverage / a reachable phone**, and Web Push depends on the
  push service and a live subscription. These residual limits are stated explicitly in SPEC-03 (they
  are no longer SAFETY-1 — they are named residual risks). Telephony introduces **cost** and
  **Region/number-provisioning** constraints (AWS End User Messaging, +55 origination) recorded as
  `TODO[architect]`.
- **Cross-module dependency opened.** EVNT needs the caregiver's **phone number**, which ACS does not
  expose today. This ADR does **not** modify ACS; it records the need as a cross-module `INT` issue to
  be opened at backlog (integration-contracts §3.1).
- **New data + Flyway.** Two new per-tenant tables extend the reserved Flyway block to
  `V0040`–`V0044` (data-model §4).
