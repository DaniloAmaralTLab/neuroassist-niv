# SPEC-12 — Detection-lapse alerting (SAFETY-GEST-1)

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> ADR: `../../adr/ADR-006-detection-lapse-alerting.md` (reuses `../../adr/ADR-005-out-of-band-emergency-escalation.md`).
> Endpoints: `../../contracts/api-contract.md` §10–12. Tables: `../../contracts/data-model.md` §2.3–2.4.
> EDGE side: `../../../edge-service/adr/ADR-005-detection-state-and-lapse-alert.md`,
> `../../../edge-service/contracts/integration-contracts.md` §6.2.

> **This is a life-safety path.** A patient station that is connected but has silently stopped
> **detecting** is EDGE's "worst failure mode" (EDGE Risk R1): the patient may try to call for help
> while nothing is watching. EVNT turns EDGE's detection-lapse episode into a distinct caregiver alert
> and escalates it out-of-band — reusing the ADR-005 ladder — until the station recovers or a caregiver
> acknowledges.

## Objective

Define, as a testable contract, how EVNT **alerts** on a detection lapse raised by EDGE: the two
service-client ingest endpoints (raise/resolve), the caregiver read + acknowledgement surface, the
reuse of the SPEC-11 escalation engine over an open `detection_lapse`, idempotency and out-of-order
tolerance, precedence against a real emergency, the stop conditions, and the audit trail.

## Scope

- **In:** the raise/resolve ingest contract (service-client `edge-service`), the caregiver list +
  acknowledgement, the escalation **reuse** of SPEC-11 (tiers, timings, `EmergencyNotificationPort`,
  ESC-3..ESC-7) over a `detection_lapse` subject, emergency precedence, idempotency/ordering, the
  `DetectionLapseRaised/Resolved/Acknowledged` audit.
- **Out:** EDGE's detection-state + lapse-sweep logic (EDGE ADR-005 — EVNT never detects lapses
  itself); the provider wire details (integration-contracts §8); the caregiver phone source (ACS
  cross-module TODO, §3.1); the emergency escalation policy itself (SPEC-11).

## Policy rules (declared once here, cited as `LAPSE-n`)

These compose with the domain invariants (`INV-EVNT-1`, `INV-EVNT-7`) and the SPEC-11 escalation rules
(`ESC-3..ESC-7`); they do not redeclare them.

- **LAPSE-1 (edge-owned raise):** a detection lapse is raised and resolved **only** by EDGE over the
  service-client ingest path; EVNT never detects a lapse itself (EDGE owns device-liveness truth).
- **LAPSE-2 (idempotent episode):** a raise is idempotent on `(tenant_id, idempotency_key)` (the stable
  per-episode key EDGE sends); a replay returns the existing lapse and starts **no** second escalation,
  even if the episode is already resolved/acknowledged (ordering safety).
- **LAPSE-3 (distinct alert):** a lapse surfaces a distinct "station not detecting" alert to the
  patient's linked caregivers (ACS links — INV-EVNT-7), **separate** from the emergency active-alarm;
  a lapse is never rendered as an emergency.
- **LAPSE-4 (escalation reuse):** WHILE a lapse is **open** (`resolved_at IS NULL AND acknowledged_at
  IS NULL`), EVNT escalates it out-of-band through the **same** SPEC-11 ladder — Tier 0 Web Push →
  Tier 1 SMS → Tier 2 Voice — via `EmergencyNotificationPort`, under ESC-3 (recipients), ESC-4
  (idempotency), ESC-5 (advance-on-failure, never silent), ESC-6 (bounded retry), ESC-7 (audit).
- **LAPSE-5 (stop on resolve or ack):** escalation stops the instant the lapse is **resolved** (EDGE's
  resolve — station back to `RUNNING`) **or acknowledged** by a linked caregiver; the next sweep starts
  no further tier (mirrors ESC-1, with two stop signals instead of one).
- **LAPSE-6 (emergency outranks):** WHILE the patient has an unconfirmed `emergency` (INV-EVNT-3), EVNT
  starts **no new** lapse tier for that patient and never promotes a lapse over the emergency; lapse
  escalation resumes only if the lapse is still open after the emergency is confirmed.
- **LAPSE-7 (audit):** `DetectionLapseRaised` / `DetectionLapseResolved` / `DetectionLapseAcknowledged`
  are audited to HIST (event-contracts §1.2); each out-of-band attempt is audited `EscalationAttempted`
  (ESC-7 reuse).

## Ingest surface (service-client — `edge-service`, api-contract §10)

- **Raise** — `POST /evnt/detection-lapses`, op `createDetectionLapse` → authority
  `evnt.detection-lapse.create`. ACS-issued **service-client** JWT (`actorType = service-client`,
  principal `edge-service`); headers `Idempotency-Key` (stable per episode) + `X-Correlation-Id`.
  Payload `{ deviceId, patientId, tenantId, cause, detectionState, reason, lastDetectingAt,
  lapseStartedAt, engineVersion }`. `cause ∈ {NOT_RUNNING, HEARTBEAT_STOPPED}`,
  `detectionState ∈ {RUNNING, PAUSED, DEGRADED, UNAVAILABLE, UNKNOWN}` (valid Java identifiers). `201`
  on a new episode (+ `Location: /evnt/detection-lapses/{id}`); `200` on an idempotent replay.
- **Resolve** — `POST /evnt/detection-lapses/{lapseId}/resolution`, op `resolveDetectionLapse` →
  authority `evnt.detection-lapse.resolve`. Same service-client identity. Idempotent; `200` whether it
  resolves an open lapse or replays a resolved one; `404` on an unknown `lapseId`.

## Caregiver surface (ACS caregiver token, api-contract §11–12)

- **List** — `GET /evnt/patients/{patientId}/detection-lapses?status=open|all`, op
  `listDetectionLapses` → authority `evnt.detection-lapse.read`. Scoped by tenant + ACS link
  (INV-EVNT-7); unlinked/cross-tenant → `404`. This is the distinct "station not detecting" surface,
  separate from `active-alarm` (LAPSE-3).
- **Acknowledge** — `POST /evnt/detection-lapses/{lapseId}/confirmation`, op
  `acknowledgeDetectionLapse`, modelled with the canonical `confirm` verb → authority
  `evnt.detection-lapse.confirm` (same human-ack shape as `evnt.event.confirm`). Sets
  `acknowledged_at`/`acknowledged_by` (JWT `sub`) and stops escalation (LAPSE-5). Idempotent.

## Implementation (components, no code — reuses SPEC-11)

- `DetectionLapseService` (application) — raise (idempotent upsert on `idempotency_key`), resolve,
  acknowledge; writes `detection_lapse`; audits the three lapse facts.
- `EscalationSweep` / `EscalationPolicy` / `EmergencyNotificationPort` (**reused from SPEC-11**) — the
  sweep's "open subjects" set is the union of unconfirmed emergencies (`event`) and open lapses
  (`detection_lapse`); for each open lapse it resolves linked caregivers (ACS, cached), asks the policy
  for due tiers, invokes the port, and persists one `escalation_attempt` per attempt under the ESC-4
  UNIQUE guard. A lapse attempt carries `lapse_id` instead of `event_id` (data-model §2.3).
- Emergency precedence (LAPSE-6) is applied in the policy: for a patient with an unconfirmed emergency,
  the open-lapse subject is skipped until the emergency clears.

## Default timings & config

Reuses the SPEC-11 ladder by default (`EVNT_ESCALATION_PUSH_AFTER_SECONDS=0`,
`EVNT_ESCALATION_SMS_AFTER_SECONDS=30`, `EVNT_ESCALATION_VOICE_AFTER_SECONDS=90`, sweep
`EVNT_ESCALATION_SWEEP_SECONDS=5`). `T` is measured from `detection_lapse.lapse_started_at`. Optional
independent overrides (`EVNT_LAPSE_ESCALATION_*`) default to the emergency values; a disabled telephony
tier records a `channel-disabled` failed attempt, never a silent gap (ESC-5).

## Edge cases

- **Resolve races raise (ordering).** EDGE addresses resolve by the `lapseId` returned from the raise,
  so a resolve cannot precede its raise at EDGE; the residual is **retries**. A replayed raise after
  the episode is already resolved/acknowledged returns the existing closed lapse and starts no new tier
  (LAPSE-2); a replayed resolve is a `200` no-op; a resolve for an unknown `lapseId` is `404` (EDGE
  keeps the episode open and retries — EDGE integration-contracts §6.2).
- **Resolve stops an in-flight tier.** A resolve/ack arriving mid-sweep removes the lapse from the open
  set; the next sweep fires no further tier; an in-flight provider call may complete but no **new** tier
  starts (mirrors ESC-1).
- **Acknowledged but still not detecting.** Acknowledgement stops escalation (a human has it) even
  though the station is not yet `RUNNING`; a later EDGE resolve records `DetectionLapseResolved` for the
  audit trail. EDGE opens one episode per device (INV-EDGE-10), so recovery then a new lapse is a new
  episode with a new idempotency key.
- **Emergency arrives during a lapse.** New lapse tiers pause for that patient (LAPSE-6); they resume
  only if the lapse is still open after the emergency is confirmed.
- **No push subscription / no phone / disabled tier.** Same as SPEC-11: a `failed` attempt with reason
  `no-subscription` / `no-contact` / `channel-disabled`, the recipient advances to the next tier
  (ESC-5); never silent.

## Acceptance criteria (EARS)

- WHEN EDGE raises a detection lapse with a valid `edge-service` service-client token and an
  `Idempotency-Key`, THE SYSTEM SHALL persist one `detection_lapse`, respond `201 Created`, and audit
  `DetectionLapseRaised` (LAPSE-1, LAPSE-7).
- WHEN a raise replays an `(tenant_id, idempotency_key)` already consumed, THE SYSTEM SHALL return the
  existing lapse and SHALL NOT start a second escalation, even if that lapse is already resolved or
  acknowledged (LAPSE-2).
- WHILE a detection lapse is open, THE SYSTEM SHALL escalate it out-of-band through the SPEC-11 ladder
  (Web Push → SMS → voice) to every linked caregiver, attempting each `(lapse, tier, caregiver,
  target)` at most once (LAPSE-4, ESC-3, ESC-4).
- WHEN a detection lapse is resolved by EDGE (station back to `RUNNING`) OR acknowledged by a linked
  caregiver, THE SYSTEM SHALL start no further escalation tier for that lapse (LAPSE-5).
- WHILE the patient has an unconfirmed `emergency`, THE SYSTEM SHALL start no new detection-lapse tier
  for that patient and SHALL NOT surface the lapse as an emergency (LAPSE-6, INV-EVNT-3).
- THE SYSTEM SHALL expose a detection lapse to a caregiver only on the distinct detection-lapse list,
  scoped by tenant + ACS link, and SHALL respond `404` for an unlinked/cross-tenant patient
  (LAPSE-3, INV-EVNT-7).
- IF a resolve references an unknown `lapseId`, THEN THE SYSTEM SHALL respond `404`; a replayed resolve
  of a resolved lapse SHALL respond `200` with no second audit (LAPSE-2).
- IF the raise/resolve path receives anything other than an `edge-service` service-client token
  carrying the required `evnt.detection-lapse.create` / `evnt.detection-lapse.resolve` authority, THEN
  THE SYSTEM SHALL respond `401`/`403` (never the `edge.device` station token — SPEC-06).
- WHEN a lapse is raised, resolved or acknowledged, THE SYSTEM SHALL audit
  `DetectionLapseRaised`/`DetectionLapseResolved`/`DetectionLapseAcknowledged`; when a lapse escalation
  attempt completes, THE SYSTEM SHALL audit `EscalationAttempted` carrying `lapseId` as the subject
  (LAPSE-7, ESC-7).
