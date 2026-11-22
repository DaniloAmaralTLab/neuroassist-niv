# PAT — Event Contracts

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> **Messaging disabled** (`stack.messaging.enabled = false`). EARS guide:
> `../../../standards/ears-notation.md`.

PAT publishes no broker messages. Its "domain events" are **audited domain actions**: each
state-changing use case records an immutable audit entry to HIST (`hist-service`) over
**synchronous REST**, in the same request boundary as the action (doc 04 §Async vs Sync,
mirrors ACS). This document is the contract for those audited actions — payload, headers,
idempotency, versioning — so HIST and downstream readers have a stable shape.

If a broker is introduced later (explicit future decision, doc 04), these same action names
become the event names and this contract becomes the message schema **without renaming**.

---

## 1. Published (audited) domain actions → HIST

Transport: `POST {hist.baseUrl}/audit` (sync REST, TLS outside localhost). The envelope is
identical for every action (mirrors ACS); `action` discriminates.

### 1.1 Audit envelope

```json
{
  "action": "CommandCalibrated",
  "actorType": "caregiver",
  "actorId": "<uuid>",
  "tenantId": "<uuid>",
  "subjectType": "command",
  "subjectId": "<uuid>",
  "occurredAt": "2026-11-19T12:00:00Z",
  "correlationId": "<X-Correlation-Id>",
  "payloadVersion": 1,
  "payload": { }
}
```

### 1.2 Action catalog

| `action` | Trigger (use case) | `subjectType` | `payload` fields |
|---|---|---|---|
| `PatientRegistered` | RegisterPatient | `patient` | `label`, `deviceId` |
| `PatientDeactivated` | DeactivatePatient | `patient` | `previousStatus` |
| `PatientReactivated` | ReactivatePatient | `patient` | `previousStatus` |
| `CommandCalibrated` **(anchor)** | CreateCommand / CalibrateCommand | `command` | `patientId`, `label`, `urgency`, `sensitivity`, `primaryPrimitive`, `secondaryPrimitive`, `minGestureTimeMs`, `maxGestureTimeMs`, `changeKind` (`created`\|`recalibrated`) |
| `CommandRetired` | RetireCommand | `command` | `patientId`, `previousStatus` |
| `GestureTypeRegistered` | RegisterGestureType | `gesture-type` | `code`, `displayName` |

EARS — publishing (auditing):

- WHEN any state-changing use case commits, THE SYSTEM SHALL record the corresponding audited action to HIST within the same request, before returning success to the caller.
- THE SYSTEM SHALL set `correlationId` on every audit envelope to the inbound `X-Correlation-Id`, and `actorId` to the JWT `sub`.
- WHEN a command is both created and calibrated in one `POST`, THE SYSTEM SHALL emit a single `CommandCalibrated` with `changeKind = created` (the anchor action covers creation and re-tuning alike — ADR-003).
**Failure policy — resolved by HIST ADR-005 (accepted, Option B).** The authoritative per-fact
classification is `../../hist-service/contracts/event-contracts.md` §3; PAT now cites
`../../hist-service/adr/ADR-005-audit-write-failure-policy.md` instead of a local TODO. Under
ADR-005 **`PatientDeactivated` is commit+durable-retry** (ACCESS-END — it ends monitoring/access);
every other PAT fact is hard-502:

| `action` | Policy (ADR-005 §3) |
|---|---|
| `PatientRegistered` | hard-502 — INTEGRITY (creation) |
| `PatientDeactivated` | commit+durable-retry — ACCESS-END (ends monitoring/access) |
| `PatientReactivated` | hard-502 — INTEGRITY (restores access — grant) |
| `CommandCalibrated` | hard-502 — INTEGRITY (catalog config) |
| `CommandRetired` | hard-502 — INTEGRITY (catalog config) |
| `GestureTypeRegistered` | hard-502 — INTEGRITY (creation) |

- WHERE a **hard-502** action's HIST call fails in prod, THE SYSTEM SHALL roll back the use case and respond `502 Bad Gateway` type `audit-unavailable` (audit is part of the action guarantee for PAT's write path).
- IF **`PatientDeactivated`**'s HIST call fails in prod, THEN THE SYSTEM SHALL still commit the deactivation and SHALL enqueue the audit envelope for idempotent durable retry (HIST durable-retry contract, hist-service `event-contracts.md` §3 — the access-ending action must not be blocked by an audit-sink outage).
- WHILE the dev profile is active, THE SYSTEM SHALL log the audit failure and continue (log-only).

> `PatientDeactivated` durable retry is a new PAT capability — tracked by **PAT-026**. Config/token
> (hist base URL `/hist` segment + `hist.audit.record` authority): **INT-PAT-006**.

---

## 2. Consumed events

**None.** PAT consumes no broker events and depends on no event from another module
(messaging disabled; `ai.hasAi = false`). Inbound coupling is limited to synchronous calls:
downstream modules **pull** from PAT (catalog/patient reads), and PAT calls ACS
(JWKS / introspect) and HIST (audit).

---

## 3. Idempotency

| Action | Idempotency key | Window / semantics |
|---|---|---|
| `PatientRegistered` | `patient.id` | PK insert; re-register of same label → new id (no dedup by label) |
| `PatientDeactivated` | `patient.id` | re-deactivate of an `inactive` patient → `204`, no second audit |
| `PatientReactivated` | `patient.id` | reactivate of an already-`active` patient → `200`, no second audit |
| `CommandCalibrated` | `command.id` + `updatedAt` | each accepted create/calibrate audited once; a no-op PATCH that changes nothing emits no audit |
| `CommandRetired` | `command.id` | re-retire of a `retired` command → `204`, no second audit (SPEC-05) |
| `GestureTypeRegistered` | global `code` | `409` on duplicate `code`; no second audit |

EARS — idempotency:

- WHEN `RetireCommand` is invoked on an already-`retired` command, THE SYSTEM SHALL return `204` without emitting a second `CommandRetired` (SPEC-05).
- WHEN `RegisterGestureType` is invoked with an existing `code`, THE SYSTEM SHALL reject the duplicate with `409` and SHALL NOT emit a second `GestureTypeRegistered`.

---

## 4. Payload versioning

- The audit envelope carries `payloadVersion` (integer, starts at `1`).
- THE SYSTEM SHALL increment `payloadVersion` only on a backward-incompatible change to a given `action` payload, and SHALL keep the envelope fields (`action`, `actorType`, `actorId`, `tenantId`, `subjectType`, `subjectId`, `occurredAt`, `correlationId`) stable across versions.
- WHERE HIST receives an unknown `action` or a higher `payloadVersion` than it understands, THE SYSTEM (HIST side) SHALL store the raw envelope and flag it rather than rejecting — audit is append-only and must not lose records (contract note for the HIST consumer).
