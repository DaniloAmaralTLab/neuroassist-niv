# EDGE — Event Contracts

> Service: `edge-service` · Module **EDGE — Edge Device Integration** · Project: NeuroAssist NIV
> **Messaging disabled** (`stack.messaging.enabled = false`). EARS guide:
> `../../../standards/ears-notation.md`.

EDGE publishes no broker messages. Its "domain events" are **audited domain actions**: each
state-changing use case records an immutable audit entry to HIST (`hist-service`) over
**synchronous REST**, in the same request boundary as the action (doc 04 §Async vs Sync, mirrors
ACS/PAT). The heartbeat-driven liveness transitions (`DeviceWentOffline` / `DeviceCameOnline`) are
raised by the in-process watchdog and audited the same way. This document pins those audited
actions — payload, headers, idempotency, versioning.

If a broker is introduced later (ADR-006 future signal), these same action names become the event
names and this contract becomes the message schema **without renaming**.

---

## 1. Published (audited) domain actions → HIST

Transport: `POST {hist.baseUrl}/audit` (sync REST, TLS outside localhost). The envelope is
identical for every action (mirrors ACS/PAT); `action` discriminates.

### 1.1 Audit envelope

```json
{
  "action": "DevicePaired",
  "actorType": "caregiver",
  "actorId": "<uuid>",
  "tenantId": "<uuid>",
  "subjectType": "edge-device",
  "subjectId": "<deviceId>",
  "occurredAt": "2026-11-19T12:02:00Z",
  "correlationId": "<X-Correlation-Id>",
  "payloadVersion": 1,
  "payload": { }
}
```

### 1.2 Action catalog

| `action` | Trigger (use case) | `actorType` | `payload` fields |
|---|---|---|---|
| `DeviceEnrolled` | EnrollDevice | `caregiver` | `patientId`, `pairingCodeExpiresAt` |
| `DevicePaired` **(anchor)** | PairDevice | `edge-device` | `patientId`, `credentialId`, `stationFingerprint` |
| `DeviceReactivated` | ReactivateDevice | `caregiver` | `previousState`, `credentialId` (new) |
| `DeviceDeactivated` | DeactivateDevice | `caregiver` | `previousState` |
| `DeviceUnpaired` | UnpairDevice | `caregiver` | `patientId`, `credentialId` (revoked) |
| `DeviceRevoked` | RevokeDevice | `caregiver` | `credentialId`, `previousState` |
| `DeviceWentOffline` | EvaluateLiveness (watchdog) | `system` | `lastHeartbeatAt`, `thresholdMs` |
| `DeviceCameOnline` | RecordHeartbeat | `edge-device` | `offlineSinceMs` |
| `CatalogRefreshed` | RefreshCatalog | `system` | `patEtag`, `commandCount` (audited only on a `200`, not a `304`) |
| `DetectionLapseStarted` | EvaluateDetectionLapse (sweep) → RaiseDetectionLapse | `system` | `cause` (`NOT_RUNNING`/`HEARTBEAT_STOPPED`), `detectionState`, `reason`, `lastDetectingAt`, `thresholdSeconds`, `engineVersion` (ADR-005) |
| `DetectionLapseResolved` | ResolveDetectionLapse (first `RUNNING` beat) | `system` | `lapseDurationSeconds`, `detectionState` (ADR-005) |

EARS — publishing (auditing):

- WHEN any state-changing use case commits, THE SYSTEM SHALL record the corresponding audited action to HIST within the same request, before returning success to the caller.
- THE SYSTEM SHALL set `correlationId` on every audit envelope to the inbound `X-Correlation-Id`; `actorId` to the JWT `sub` for human actions and to the `deviceId` for `edge-device` actions; `system` for watchdog-raised actions.
- WHEN the watchdog crosses the missed-heartbeat threshold for a `paired` device, THE SYSTEM SHALL flip `connectivity = offline` and audit `DeviceWentOffline` once per transition (not once per scan — SPEC-05).
- WHEN the lapse sweep opens a detection-lapse episode (not `RUNNING`/silent beyond the threshold), THE SYSTEM SHALL audit `DetectionLapseStarted` **once per episode** and raise the lapse to EVNT; WHEN the device next reports `RUNNING`, THE SYSTEM SHALL audit `DetectionLapseResolved` once and notify EVNT to resolve (ADR-005, INV-EDGE-10).
- WHEN a catalog refresh returns `304 Not Modified`, THE SYSTEM SHALL NOT audit `CatalogRefreshed` (no change); WHEN it returns `200`, THE SYSTEM SHALL update the cache and audit `CatalogRefreshed`.
**Failure policy — resolved by HIST ADR-005 (accepted, Option B).** The authoritative per-fact
classification is `../../hist-service/contracts/event-contracts.md` §3; EDGE now cites
`../../hist-service/adr/ADR-005-audit-write-failure-policy.md` instead of a local TODO. Access-ending
device actions and safety detection-lapse actions are commit+durable-retry; everything else (including
the `system` heartbeat observations, N1) is hard-502:

| `action` | Policy (ADR-005 §3) |
|---|---|
| `DeviceEnrolled` | hard-502 — INTEGRITY (creation) |
| `DevicePaired` | hard-502 — INTEGRITY (grant) |
| `DeviceReactivated` | hard-502 — INTEGRITY (restores — grant) |
| `DeviceDeactivated` | commit+durable-retry — ACCESS-END (device can no longer run) |
| `DeviceUnpaired` | commit+durable-retry — ACCESS-END (unpair) |
| `DeviceRevoked` | commit+durable-retry — ACCESS-END (revoke) |
| `DeviceWentOffline` | hard-502 — INTEGRITY (system observation; heartbeat job re-derives — N1) |
| `DeviceCameOnline` | hard-502 — INTEGRITY (system observation; heartbeat job re-derives — N1) |
| `CatalogRefreshed` | hard-502 — INTEGRITY (catalog-sync record) |
| `DetectionLapseStarted` | commit+durable-retry — SAFETY (detection down) |
| `DetectionLapseResolved` (`edge-device`) | commit+durable-retry — SAFETY |

- WHERE a **hard-502** action's HIST call fails in prod, THE SYSTEM SHALL roll back the use case and respond `502 audit-unavailable`.
- IF a **commit+durable-retry** action's HIST call fails in prod (`DeviceDeactivated`, `DeviceUnpaired`, `DeviceRevoked`, `DetectionLapseStarted`, `DetectionLapseResolved`), THEN THE SYSTEM SHALL still commit the local change and SHALL enqueue the audit envelope for idempotent durable retry (HIST durable-retry contract, hist-service `event-contracts.md` §3 — the access-ending/safety action must not be blocked by an audit-sink outage).
- WHILE the dev profile is active, THE SYSTEM SHALL log the audit failure and continue (log-only).

> EDGE durable audit retry is a new capability — tracked by **EDGE-035**. Config/token (hist base URL
> `/hist` segment + `hist.audit.record` authority): **INT-EDGE-009**.

---

## 2. Consumed events

**None.** EDGE consumes no broker events and depends on no event from another module (messaging
disabled; `ai.hasAi = false`). Inbound coupling is limited to synchronous calls: the edge device and
coordinators call EDGE; EDGE calls PAT (catalog pull), ACS (JWKS / service-client), HIST (audit) and,
since ADR-005, EVNT (detection-lapse raise/resolve — `integration-contracts.md` §6.2). See
`integration-contracts.md`.

---

## 3. Idempotency

| Action | Idempotency key | Window / semantics |
|---|---|---|
| `DeviceEnrolled` | `edge_device.id` | PK insert; a re-enroll replaces the live pairing code (one code per device) |
| `DevicePaired` | pairing `code_hash` | single-use code consumed once; a replay of a consumed code → `401`, no second audit (INV-EDGE-3) |
| `DeviceDeactivated` | `edge_device.id` | re-deactivate of a `deactivated` device → `204`, no second audit |
| `DeviceReactivated` | `edge_device.id` | reactivate of an already-`paired` device → `200`, no new credential, no second audit |
| `DeviceRevoked` | `credentialId` | re-revoke of a `revoked` device → `204`, no second audit (SPEC-05) |
| `DeviceUnpaired` | `edge_device.id` | re-unpair → `204`, no second audit |
| `DeviceWentOffline` / `DeviceCameOnline` | `edge_device.id` + connectivity transition | audited once per state **change**; a scan that sees no change emits nothing |
| `CatalogRefreshed` | `device_id` + `pat_etag` | audited only when the PAT ETag changes (a `304` emits nothing) |
| `DetectionLapseStarted` / `DetectionLapseResolved` | open `edge_detection_lapse` episode (`evnt_idempotency_key`) | one open episode per device (`uq_edge_detection_lapse_open`); started audited once per episode, resolved once on recovery; a repeated sweep over an already-open lapse emits nothing (INV-EDGE-10) |

EARS — idempotency:

- WHEN `RevokeDevice` is invoked on an already-`revoked` device, THE SYSTEM SHALL return `204` without emitting a second `DeviceRevoked` (SPEC-05).
- WHEN the watchdog scans a device already `offline`, THE SYSTEM SHALL NOT re-emit `DeviceWentOffline` (transition-only — SPEC-05).
- WHEN the lapse sweep scans a device that already has an open detection-lapse episode, THE SYSTEM SHALL NOT open a second episode nor re-raise to EVNT (one open episode per device — INV-EDGE-10).

---

## 4. Payload versioning

- The audit envelope carries `payloadVersion` (integer, starts at `1`).
- THE SYSTEM SHALL increment `payloadVersion` only on a backward-incompatible change to a given `action` payload, and SHALL keep the envelope fields (`action`, `actorType`, `actorId`, `tenantId`, `subjectType`, `subjectId`, `occurredAt`, `correlationId`) stable across versions.
- WHERE HIST receives an unknown `action` or a higher `payloadVersion` than it understands, THE SYSTEM (HIST side) SHALL store the raw envelope and flag it rather than rejecting — audit is append-only and must not lose records (contract note for the HIST consumer).
