# EVNT — Event Contracts

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> **Messaging disabled** (`stack.messaging.enabled = false`). EARS guide:
> `../../../standards/ears-notation.md`.

EVNT publishes no broker messages. Its "domain events" are **audited domain actions**: each
state-changing use case records an immutable audit entry to HIST (`hist-service`) over
**synchronous REST**, in the same request boundary as the action (doc 04 §Async vs Sync, mirrors
ACS/PAT/EDGE). This document pins those audited actions — payload, headers, idempotency, versioning.
If a broker is introduced later (ADR-006 shared future signal), these same action names become the
message names **without renaming** (doc 03).

---

## 1. Published (audited) domain actions → HIST

Transport: `POST {hist.baseUrl}/audit` (sync REST, TLS outside localhost). The envelope is
**identical to ACS/PAT/EDGE** (EDGE event-contracts §1.1); `action` discriminates.

### 1.1 Audit envelope

```json
{
  "action": "EventGenerated",
  "actorType": "edge-device",
  "actorId": "<deviceId>",
  "tenantId": "<uuid>",
  "subjectType": "event",
  "subjectId": "<eventId>",
  "occurredAt": "2026-11-20T08:14:03Z",
  "correlationId": "<X-Correlation-Id>",
  "payloadVersion": 1,
  "payload": { }
}
```

### 1.2 Action catalog

| `action` | Trigger (use case) | `actorType` | `payload` fields |
|---|---|---|---|
| `EventGenerated` **(anchor)** | `ingestGestureReport` | `edge-device` | `patientId`, `commandId`, `commandLabel`, `urgency`, `reportId`, `occurredAt` |
| `AlarmConfirmed` | `confirmAlarm` | `caregiver` | `patientId`, `commandId`, `confirmedBy` |
| `FeedbackRecorded` | `recordFeedback` | `caregiver` | `patientId`, `commandId`, `feedback` |
| `EscalationAttempted` | `EscalationSweep` (out-of-band tier, ADR-005 / SPEC-11; reused for a detection lapse, ADR-006 / SPEC-12) | `system` (`actorId = evnt-service`) | `patientId`, `tier`, `channel`, `maskedTarget`, `caregiverId`, `status`, `errorReason?`, `providerMessageId?` |
| `DetectionLapseRaised` | `createDetectionLapse` (ADR-006 / SPEC-12) | `service-client` (`actorId = edge-service`) | `patientId`, `deviceId`, `cause`, `detectionState`, `lapseStartedAt` |
| `DetectionLapseResolved` | `resolveDetectionLapse` | `service-client` (`actorId = edge-service`) | `patientId`, `deviceId`, `resolvedAt` |
| `DetectionLapseAcknowledged` | `acknowledgeDetectionLapse` | `caregiver` | `patientId`, `deviceId`, `acknowledgedBy` |

**HIST caregiver-timeline fields (amendment 2026-11-20).** Two payload fields are carried for HIST's
caregiver timeline projection (`../../hist-service/contracts/api-contract.md` §2 "Structured entry
fields" + `data-model.md` §7 — gaps G-HIST-1 / G-HIST-3):

- `EventGenerated.commandLabel` — the PAT command-label **snapshot** EVNT already holds on the `event`
  row (`event.command_label`, data-model §2.1 / ADR-004-command-snapshot-on-event). It is emitted
  verbatim into the audit payload so HIST renders the family's word ("Water") without re-resolving PAT.
  IF EVNT ever lacks the snapshot, THEN THE SYSTEM SHALL omit the field — HIST never fabricates a label.
- `EscalationAttempted.maskedTarget` — the destination **masked inside EVNT before the audit call**,
  with the same rule as `GET /evnt/events/{eventId}/escalation-attempts` (api-contract §3.4): a phone
  (`sms`/`voice`) keeps only its last 4 digits (e.g. `+55•••••1234`); a web-push subscription exposes
  only its endpoint host / subscription label (e.g. `sub:chrome-…`), never the endpoint URL or keys.
  **The raw `channel_target` never leaves EVNT in the audit** — only the masked form is sent; HIST
  stores and renders it verbatim and never unmasks (G-HIST-3, SPEC-06).

**Personal fields for HIST crypto-shred (ADR-006 / `../../hist-service/contracts/data-model.md` §6).**
Flag which payload fields HIST must encrypt under the per-subject key (unreadable on erasure):

| `action` | Personal payload fields (crypto-shred) | Pseudonymous / retained |
|---|---|---|
| `EventGenerated` | `commandLabel` (free-text family need → personal) | `patientId`, `commandId`, `urgency`, `reportId`, `occurredAt` |
| `AlarmConfirmed` / `FeedbackRecorded` | free-text `note` (if present) | `patientId`, `commandId`, `confirmedBy` / `feedback` |
| `EscalationAttempted` | — (`maskedTarget` is already masked; raw endpoint is never sent) | `patientId`, `tier`, `channel`, `maskedTarget`, `caregiverId`, `status` |

EARS — publishing (auditing):

- WHEN any state-changing use case commits, THE SYSTEM SHALL record the corresponding audited action to HIST within the same request, before returning success to the caller.
- WHEN auditing `EventGenerated`, THE SYSTEM SHALL include the `command_label` snapshot as payload `commandLabel`; IF no snapshot is held, THEN THE SYSTEM SHALL omit the field (HIST never fabricates, G-HIST-1).
- WHEN auditing `EscalationAttempted`, THE SYSTEM SHALL mask the destination before the audit call (phone → last 4 digits; push → endpoint host/label only) and set payload `maskedTarget` to the masked form; THE SYSTEM SHALL NOT place the raw `channel_target` in the audit payload (G-HIST-3, SPEC-06).
- THE SYSTEM SHALL set `correlationId` on every audit envelope to the inbound `X-Correlation-Id`; `actorId` to the `deviceId` for `EventGenerated` and to the JWT `sub` for the caregiver actions; `subjectType = event`, `subjectId = eventId`.
- WHEN a gesture report is an idempotent replay (consumed `(deviceId, reportId)`), THE SYSTEM SHALL NOT audit a second `EventGenerated` (INV-EVNT-4).
- WHEN a confirmation is an idempotent repeat, THE SYSTEM SHALL NOT audit a second `AlarmConfirmed` (INV-EVNT-5).
- WHEN feedback is recorded with the same verdict as the stored one, THE SYSTEM SHALL NOT audit a second `FeedbackRecorded`; a **changed** verdict audits exactly once.
- WHEN an out-of-band escalation attempt completes (sent or failed), THE SYSTEM SHALL audit `EscalationAttempted` with actorType `system` / `actorId = evnt-service`, `correlationId` carried from the originating subject, and `subjectType`/`subjectId` = `event`/`eventId` for an emergency **or** `detection-lapse`/`lapseId` for a detection lapse (ADR-006); the `(subject, tier, caregiver, target)` idempotency (ESC-4) means a tier audits at most once.
- WHEN a detection lapse is raised, resolved or acknowledged, THE SYSTEM SHALL audit `DetectionLapseRaised`/`DetectionLapseResolved`/`DetectionLapseAcknowledged` with `subjectType = detection-lapse`, `subjectId = lapseId`, `actorType` = `service-client` (`actorId = edge-service`) for raise/resolve and `caregiver` (`actorId = sub`) for acknowledge (SPEC-12 LAPSE-7); an idempotent replay audits at most once.
**Failure policy — resolved by HIST ADR-005 (accepted, Option B).** The authoritative per-fact
classification is `../../hist-service/contracts/event-contracts.md` §3; EVNT now cites
`../../hist-service/adr/ADR-005-audit-write-failure-policy.md` instead of a local TODO. Every
safety-runtime fact is commit+durable-retry — the help-request/alarm/lapse pathway must never be
blocked by an audit outage; only `FeedbackRecorded` (an after-the-fact annotation) is hard-502:

| `action` | Policy (ADR-005 §3) |
|---|---|
| `EventGenerated` | commit+durable-retry — SAFETY (the help-request pathway; W2 ratified) |
| `AlarmConfirmed` | commit+durable-retry — SAFETY |
| `FeedbackRecorded` | hard-502 — INTEGRITY (after-the-fact quality annotation) |
| `EscalationAttempted` | commit+durable-retry — SAFETY |
| `DetectionLapseRaised` | commit+durable-retry — SAFETY |
| `DetectionLapseResolved` (`detection-lapse`) | commit+durable-retry — SAFETY |
| `DetectionLapseAcknowledged` | commit+durable-retry — SAFETY |

- IF a **commit+durable-retry** action's HIST call fails in prod (`EventGenerated`, `AlarmConfirmed`, `EscalationAttempted`, `DetectionLapseRaised`, `DetectionLapseResolved`, `DetectionLapseAcknowledged`), THEN THE SYSTEM SHALL still commit the local change and SHALL enqueue the audit envelope for idempotent durable retry (HIST durable-retry contract, hist-service `event-contracts.md` §3 — the safety pathway must not be blocked by an audit-sink outage).
- WHERE **`FeedbackRecorded`**'s HIST call fails in prod, THE SYSTEM SHALL roll back the use case and respond `502 Bad Gateway` type `audit-unavailable`.
- WHILE the dev profile is active, THE SYSTEM SHALL log the audit failure and continue (log-only).

> EVNT durable audit retry is a new capability — tracked by **EVNT-037**. Config/token (hist base URL
> `/hist` segment + `hist.audit.record` authority): **INT-EVNT-ACS-003**.

---

## 2. Consumed events

**None.** EVNT consumes no broker events (messaging disabled; `ai.hasAi = false`). Inbound coupling
is limited to synchronous calls: the edge station calls `POST /evnt/gesture-reports`; the dashboard
polls the read surface. EVNT's own outbound calls (PAT, ACS, EDGE, HIST) are in
`integration-contracts.md`.

---

## 3. Idempotency

| Action | Idempotency key | Window / semantics |
|---|---|---|
| `EventGenerated` | `(device_id, report_id)` | DB UNIQUE + application dedup; a replay returns the existing event `200`, no second audit (INV-EVNT-4) |
| `AlarmConfirmed` | `event.id` + `confirmed_at IS NULL` transition | a re-confirm of a confirmed emergency → `200`, no second audit (INV-EVNT-5) |
| `FeedbackRecorded` | `event.id` + verdict change | same verdict → `200`, no audit; changed verdict → overwrite + one audit |
| `EscalationAttempted` | `(subject_id, tier, caregiver_id, channel_target)` | DB UNIQUE `uq_escalation_tier` over the generated `subject_id` (`event_id` XOR `lapse_id`); a repeated sweep inserts no second attempt and audits once per tier, for an emergency or a detection lapse (ESC-4, SPEC-11 / SPEC-12) |
| `DetectionLapseRaised` | `(tenant_id, idempotency_key)` | DB UNIQUE `uq_detection_lapse_idem`; a retried raise returns the existing lapse with no second escalation nor audit (LAPSE-2, SPEC-12) |
| `DetectionLapseResolved` / `DetectionLapseAcknowledged` | `lapse.id` + `resolved_at` / `acknowledged_at` transition | a replayed resolve/ack of an already-closed lapse → `200`, no second audit (LAPSE-5, SPEC-12) |

EARS — idempotency:

- WHEN `ingestGestureReport` receives a `(deviceId, reportId)` already consumed, THE SYSTEM SHALL return the existing event without a second `EventGenerated` (INV-EVNT-4).
- WHEN `confirmAlarm` is invoked on an already-confirmed emergency, THE SYSTEM SHALL return `200` without a second `AlarmConfirmed` (INV-EVNT-5).

## 4. Payload versioning

- `payloadVersion` starts at `1`. An additive field bumps it; EVNT and HIST treat a higher
  `payloadVersion` as forward-compatible (ignore unknown fields). A breaking change gets a new
  `action` name, never a silent reshape (mirrors ACS/PAT/EDGE).
- **Decision (amendment 2026-11-20): `payloadVersion` stays `1`.** The HIST-timeline additions —
  `EventGenerated.commandLabel` and `EscalationAttempted.maskedTarget` — are **additive and optional**,
  so they are additive-compatible rather than a version bump. HIST reads both as optional JSON paths and
  omits the timeline field when absent (api-contract §2 / data-model §7); an older producer that does not
  yet emit them stays valid. No `action` is renamed and no field is reshaped, so a bump would only force
  needless `payloadVersion > 1` handling on both sides. A bump would be warranted only if either field
  became **required** or an existing field changed shape — neither is the case here.
