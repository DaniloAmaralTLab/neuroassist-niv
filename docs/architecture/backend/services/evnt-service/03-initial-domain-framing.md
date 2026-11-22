<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> Draft framing — refined into contracts by `/be-architect-specs`.

## Ubiquitous Language

| Term | Meaning |
|---|---|
| **Event** | The structured, durable occurrence generated when the edge station reports a recognized command. The single aggregate EVNT owns. |
| **Gesture report** | The inbound message from the edge station (`POST /evnt/gesture-reports`): "this `commandId` was recognized for this device". Not persisted as its own entity — it produces an Event. |
| **Command** (ref) | The PAT catalog item the event references (`commandId`, opaque). Its `urgency` + `label` are **snapshotted** onto the Event at generation (ADR-008; ADR-004 local). |
| **Urgency** | `emergency` \| `routine` — carried from the Command. Drives the notification mode (full-screen alarm vs discreet toast). |
| **Active alarm** | A **read-time query**, not an entity: the most-recent `emergency` Event for a patient that has no `confirmedAt` (ADR-010). |
| **Confirmation** | A caregiver's explicit acknowledgement of an emergency event (`confirmedAt` + `confirmedBy`). |
| **Feedback** | A caregiver's later verdict on an event: `not_evaluated` → `real` \| `false_positive`. |
| **Report id** | The station-generated idempotency key (`reportId`) ensuring one Event per physical gesture. |
| **Guardian / caregiver** | The person routed-to, resolved from ACS caregiver↔patient links within the tenant. |

## Aggregates and Entities

**Aggregate root: `Event`** (single aggregate — ADR-010, no separate "active event" entity).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK. |
| `tenantId` | UUID | from the token claim; tenant routing. |
| `patientId` | UUID | opaque ref to the PAT/EDGE patient (no cross-service FK). |
| `commandId` | UUID | opaque ref to the PAT Command (ADR-008). |
| `commandLabel` | string | **snapshot** of the Command label at generation (history stability — ADR-004 local). |
| `urgency` | enum `emergency` \| `routine` | **snapshot** from the Command. |
| `deviceId` | UUID | reporting device (from token claim). |
| `reportId` | string | station idempotency key; unique per `(deviceId, reportId)`. |
| `occurredAt` | datetime | recognition time reported by the station (bounded/validated). |
| `confirmedAt` | datetime? | set on confirmation; null = unconfirmed. |
| `confirmedBy` | UUID? | caregiver id that confirmed. |
| `feedback` | enum `not_evaluated` \| `real` \| `false_positive` | default `not_evaluated`. |
| `createdAt` | datetime | server insert time. |

Value objects: `Urgency`, `Feedback`, `CommandSnapshot(commandId, label, urgency)`, `ReportId`.

## Domain Events

Messaging disabled → these are **audited domain actions** to HIST over sync REST (same envelope as
ACS/PAT/EDGE; `action` discriminates). If a broker is later introduced (ADR-006 shared, future
signal), the names become message names **without renaming**.

| Action | Trigger (use case) | `actorType` | payload fields |
|---|---|---|---|
| `EventGenerated` **(anchor)** | IngestGestureReport | `edge-device` | `patientId`, `commandId`, `urgency`, `reportId`, `occurredAt` |
| `AlarmConfirmed` | ConfirmAlarm | `caregiver` | `patientId`, `commandId`, `confirmedBy` |
| `FeedbackRecorded` | RecordFeedback | `caregiver` | `patientId`, `commandId`, `feedback` |

## State Transitions

Two independent axes on one `Event`:

**Confirmation axis** (only meaningful for `emergency`):

```
generated ──(ConfirmAlarm, emergency only)──▶ confirmed
   │
   └─ routine events are never "confirmed" (no blocking confirmation; toast + History only)
```

**Feedback axis** (any urgency, independent of confirmation):

```
not_evaluated ──(RecordFeedback real)──────────▶ real
not_evaluated ──(RecordFeedback false_positive)─▶ false_positive
```

The **active alarm** is derived, not stored: `urgency = emergency AND confirmedAt IS NULL`, ordered
by `occurredAt DESC`, limit 1 per patient (ADR-010).

## Invariants

- **INV-EVNT-1** — Tenant context derives exclusively from the JWT `tenantId` claim; `X-Tenant-Id`
  and any body-supplied tenant are ignored (mirrors ACS/PAT/EDGE).
- **INV-EVNT-2** — An Event references exactly one Command (ADR-008); `urgency` + `label` are
  snapshotted at generation and never mutated by a later PAT recalibration (ADR-004 local).
- **INV-EVNT-3** — "Active alarm" is a read-time query over the single `event` table; it is never a
  separate table/collection (ADR-010). One confirmation write is seen by every screen at once.
- **INV-EVNT-4** — Ingest is idempotent on `(deviceId, reportId)`: at-least-once station delivery
  yields exactly one Event; a replay returns the existing event without a second audit.
- **INV-EVNT-5** — Only an `emergency` Event can be confirmed; confirmation is idempotent (a second
  confirm is a no-op `200`); `confirmedBy` must be a caregiver of the same tenant linked to the
  patient (ACS link).
- **INV-EVNT-6** — The report path trusts only an `edge.device` token validated via EDGE JWKS (+
  introspection); `deviceId` / `patientId` / `tenantId` come from the claims, never the body
  (anti-forgery).
- **INV-EVNT-7** — A caregiver may read/confirm/feedback only events of patients they are linked to
  (ACS links) within their tenant; cross-tenant and unlinked rows are never disclosed (`404`).
