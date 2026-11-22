<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-006 — Detection-lapse alerting inside EVNT (SAFETY-GEST-1)

## Status
aceita (Accepted) — product decision **SAFETY-GEST-1**, decided by the user on 2026-11-20. Composes
with ADR-005 (local, out-of-band emergency escalation): it **reuses** ADR-005's escalation ladder and
`EmergencyNotificationPort` for a new subject (a detection lapse) rather than inventing a second
channel stack. Does **not** reopen messaging (`stack.messaging.enabled = false`) and does **not**
change EDGE.

## Contexto
EDGE now distinguishes "connected" from "detecting": its heartbeat carries a
`detectionState ∈ {RUNNING, PAUSED, DEGRADED, UNAVAILABLE, UNKNOWN}`, and an EDGE scheduled sweep
opens a **detection-lapse episode** for a paired patient station that is connected but has not been
`RUNNING` — or whose heartbeat has stopped — for `N` seconds (`EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS`,
default 120 s). EDGE ADR-005 (`../../edge-service/adr/ADR-005-detection-state-and-lapse-alert.md`) and
integration-contracts §6.2 fix EDGE's side and state that **EVNT owns alerting/escalation**, leaving
the concrete EVNT endpoints an explicit INT TODO. A silent detection stop is "the product's worst
failure mode" (EDGE Risk R1): a patient may try to call for help while the station has quietly stopped
seeing them, and no alarm is raised. The in-app emergency alarm (ADR-003) and its out-of-band
escalation (ADR-005) cannot cover this, because a lapse produces **no** `event` — there is nothing to
poll and nothing to escalate.

EDGE expects from EVNT, over an **ACS-issued service-client JWT** for the `edge-service` principal
(never the `edge.device` station token):

- **raise** — `POST /evnt/detection-lapses` (EDGE use case `RaiseDetectionLapse`), payload
  `{ deviceId, patientId, tenantId, cause (NOT_RUNNING|HEARTBEAT_STOPPED), detectionState, reason,
  lastDetectingAt, lapseStartedAt, engineVersion }`, header `Idempotency-Key` (stable per episode) +
  `X-Correlation-Id`;
- **resolve** — `POST /evnt/detection-lapses/{lapseId}/resolution` on the first `RUNNING` heartbeat.

## Decisão
EVNT **owns the alerting** for a detection lapse. On a raise it opens a `detection_lapse` episode and
surfaces a **distinct "station not detecting" alert** to the patient's linked caregivers — separate
from the emergency active-alarm (a lapse is never rendered as an emergency) — AND escalates it
out-of-band through the **same tiers as EVNT ADR-005** (Tier 0 Web Push → Tier 1 SMS → Tier 2 Voice)
while the lapse stays **unresolved and unacknowledged**. Escalation stops the instant the lapse is
**resolved** (EDGE's resolve call — station back to `RUNNING`) **or acknowledged** by a linked
caregiver.

1. **No new module, reuse the ADR-005 engine.** The `EscalationSweep`, `EscalationPolicy` and the
   provider-agnostic `EmergencyNotificationPort` (Web Push / AWS End User Messaging SMS + Voice) run
   over an open `detection_lapse` exactly as they run over an unconfirmed emergency. The attempt
   record and its idempotency guard (`escalation_attempt`, ESC-4) are generalised to reference either
   an `event` or a `detection_lapse`. One escalation mechanism, one audit path.
2. **Two ingest endpoints (service-client, `edge-service`).** `POST /evnt/detection-lapses` (op
   `create`, authority `evnt.detection-lapse.create`) and
   `POST /evnt/detection-lapses/{lapseId}/resolution` (op `resolve`, authority
   `evnt.detection-lapse.resolve`). `deviceId`/`patientId`/`tenantId` come from the payload of a
   **trusted service-client** call (not a station token); the raise is idempotent on the per-episode
   `Idempotency-Key`. `raise` is not a listed op verb, so the raise op is the canonical `create`
   (api-contract §0).
3. **Caregiver surfaces.** A read list `GET /evnt/patients/{patientId}/detection-lapses` (op `list`,
   authority `evnt.detection-lapse.read`) and an acknowledgement
   `POST /evnt/detection-lapses/{lapseId}/confirmation` (op `confirm`, authority
   `evnt.detection-lapse.confirm` — the same human-ack-stops-escalation shape as
   `evnt.event.confirm`). The lapse is a separate list, **not** the emergency active-alarm envelope.
4. **Emergency outranks a lapse.** A real emergency always wins the caregiver's attention: while the
   patient has an unconfirmed emergency, EVNT starts **no new** lapse tier for that patient and never
   shows a lapse as an emergency; lapse escalation resumes only if the lapse is still open after the
   emergency is confirmed.
5. **Audit.** `DetectionLapseRaised` / `DetectionLapseResolved` / `DetectionLapseAcknowledged` are
   audited to HIST with the standard envelope (event-contracts §1); each out-of-band attempt is audited
   `EscalationAttempted` (ESC-7 reuse).

Concrete contract is in **SPEC-12-detection-lapse-alerting.md**; endpoints in `api-contract.md`
§10–12; the `detection_lapse` table + `escalation_attempt` generalisation in `data-model.md` §2.3–2.4;
the EDGE inbound boundary + the ACS service-client authority for `edge-service` in
`integration-contracts.md` §9.

## Consequências
- **Positive — the worst failure mode is now alerted.** A station that is connected but not detecting
  for `N` seconds produces a first-class, escalated caregiver alert, independent of any `event` and
  independent of the dashboard being foreground (same out-of-band reach as an emergency).
- **Positive — one escalation engine.** Reusing the ADR-005 ladder/port means no second notification
  stack, one idempotency guard, one audit fact family for attempts. The lapse differs only in its
  subject and its stop signal (`resolved_at`/`acknowledged_at` instead of `confirmed_at`).
- **Positive — the boundary stays thin.** EDGE owns liveness truth and raises/resolves; EVNT owns
  alerting. EVNT never detects lapses itself.
- **Negative / residual risk.** EVNT still only **attempts** out-of-band delivery — a voice call needs
  cellular coverage and a reachable phone; Web Push needs a live subscription (same residual limits as
  ADR-005, SPEC-03). Windows shorter than `N`, and anything before the first successful pairing, are
  **not** covered (EDGE Risk R6 — nothing has lapsed yet). SMS/voice still depend on the ACS caregiver
  phone (cross-module `INT-EVNT-ACS-001`, integration-contracts §3.1) and on AWS End User Messaging
  provisioning (§8). Until provisioned, those tiers record a `channel-disabled` / `no-contact` failed
  attempt — never silent (ESC-5).
- **Cross-module INT opened.** ACS must mint an `edge-service` service-client JWT carrying
  `evnt.detection-lapse.create` and `evnt.detection-lapse.resolve` (EVNT-namespace authorities). This
  ADR does **not** modify ACS; the need is recorded as an `INT` to open at backlog
  (integration-contracts §9). This closes EDGE integration-contracts §6.2's INT TODO on the EVNT side.
- **Data + Flyway.** One new per-tenant table (`detection_lapse`) and an additive generalisation of
  `escalation_attempt`; the reserved EVNT Flyway block extends `V0040`–`V0046` (data-model §4); the
  next service block still starts at `V0050`, so no range collision.
