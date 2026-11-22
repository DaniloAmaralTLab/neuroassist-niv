<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> Draft domain model — refined by `/be-architect-specs`. Domain identifiers in English.

## Ubiquitous Language

| Term | Meaning |
|---|---|
| **Patient** | The assisted person. PAT-owned aggregate root, tenant-scoped. Referenced by id from ACS (`caregiver_patient_link`), EDGE, EVNT, CONV. |
| **Command** | A catalog item mapping a gesture to a family-defined need. PAT-owned aggregate root, belongs to exactly one patient. Carries label, urgency, sensitivity, calibration window and gesture composition. |
| **GestureType** | A recognized facial-movement **primitive** (e.g. blink, eyebrow raise). PAT-owned global catalog; the shared vocabulary commands compose from. Registering a name does **not** imply detection-engine support (ADR-002). |
| **GestureComposition** | How a command is built: a `primaryPrimitive` and an optional `secondaryPrimitive` → simple or compound gesture. |
| **CalibrationWindow** | `minGestureTimeMs` / `maxGestureTimeMs` — how long the gesture must be held to count. Per command (ADR-003). |
| **Sensitivity** | `low` \| `medium` \| `high` — detection strictness for this command. Per command. |
| **UrgencyLevel** | `emergency` \| `routine` — how EVNT must treat a recognition (full-screen vs discreet). |
| **Label** | The family-authored free-form need text (e.g. "suction", "reposition me"). |
| **Tenant** | Care unit (family or clinic). Context derived from the ACS JWT `tenantId` claim. |
| **Caregiver** | ACS-owned actor who authors the catalog; referenced by id as `createdBy`. |

## Aggregates and Entities

PAT persists three things; everything else is referenced by id.

### Aggregate: `Patient` (root, tenant-scoped)

- `id` (UUID), `tenantId`, `label` (family alias), `deviceId` (→ EDGE, by id, nullable),
  `status` (`active` | `inactive`), `createdAt`, `createdBy` (→ Caregiver id).
- Invariants: belongs to exactly one tenant; `deviceId` is an opaque reference (no FK).

### Aggregate: `Command` (root, tenant-scoped)

- `id` (UUID), `tenantId`, `patientId` (→ Patient), `label` (free-form),
  `urgency` (`emergency` | `routine`), `sensitivity` (`low` | `medium` | `high`),
  `primaryPrimitive` (→ GestureType), `secondaryPrimitive` (→ GestureType, nullable),
  `minGestureTimeMs`, `maxGestureTimeMs`, `status` (`active` | `retired`),
  `createdAt`, `updatedAt`, `createdBy` (→ Caregiver id).
- Value objects: `GestureComposition` (primary + optional secondary),
  `CalibrationWindow` (min/max), `UrgencyLevel`, `Sensitivity`.

### Entity/Catalog: `GestureType` (global, read-mostly)

- `id` (UUID), `code` (stable primitive key, globally unique), `displayName`,
  `description`. Seeded; extensible (append-only in MVP).

### Reference-only (owned elsewhere, by id — no local persistence)

`Caregiver`, `PatientSession` (ACS); `EdgeDevice` (EDGE); `Event` (EVNT).

## Domain Events

> Messaging disabled → these are **audited domain actions** delivered to HIST over sync
> REST. The names become broker event names unchanged when a broker is introduced.

| Name | Trigger | Consumer |
|---|---|---|
| `PatientRegistered` | a patient is registered | HIST |
| `PatientDeactivated` | a patient is set inactive | HIST |
| `CommandCalibrated` **(anchor)** | a command is created or its calibration/mapping changes | HIST |
| `CommandRetired` | a command is soft-retired | HIST |
| `GestureTypeRegistered` | a new primitive is added to the global catalog | HIST |

**Consumed:** none (no inbound events; downstream reads are pull/sync REST).

## State Transitions

```
Patient:  (register) --> active --(deactivate)--> inactive
                             ^------(reactivate)------'

Command:  (create) --> active --(calibrate/update, stays)--> active
                          |
                          '--(retire)--> retired        [terminal; row retained]

GestureType: (register) --> present   [append-only catalog in MVP]
```

## Invariants

- **INV-PAT-1** — every `Patient` and `Command` row carries a NOT NULL `tenantId`; tenant
  is taken from the JWT claim, never from the request body or `X-Tenant-Id`.
- **INV-PAT-2** — a `Command` belongs to exactly one `Patient` of the **same** tenant;
  cross-tenant access returns `404` (no existence disclosure).
- **INV-PAT-3** — `minGestureTimeMs ≤ maxGestureTimeMs`, both > 0 (a valid calibration
  window).
- **INV-PAT-4** — `primaryPrimitive` is required and must reference an existing
  `GestureType`; `secondaryPrimitive`, if present, must differ from the primary and also
  reference an existing `GestureType`.
- **INV-PAT-5** — `retired` is terminal; a retired command is excluded from the active
  catalog read and is never silently reactivated (a new command is created instead).
- **INV-PAT-6** — a registered `GestureType` is a *name in the vocabulary only*; it does
  not assert detection-engine support (GEST owns that truth) — ADR-002.
- **INV-PAT-7** — every PAT endpoint requires a `pat.*` authority; a `patient-session`
  token (authorities `conv.*`/`gest.*` only, ACS INV-3) is rejected `403`.
- **INV-PAT-8** — controller `@PreAuthorize` strings equal `RoleAuthorityPolicy`
  constants exactly (D-535); state-changing verbs on POST/PATCH/DELETE only.

## Authority convention (preview — canonical in Specs)

Following the ACS convention `<module>.<resource>.<action>`:

| Authority | Action | Role(s) |
|---|---|---|
| `pat.patient.create` | register a patient | CLINIC_COORDINATOR, CAREGIVER |
| `pat.patient.read` | read patient(s) | CAREGIVER, CLINIC_COORDINATOR |
| `pat.patient.deactivate` | deactivate a patient | CLINIC_COORDINATOR |
| `pat.command.create` | add a command | CAREGIVER, CLINIC_COORDINATOR |
| `pat.command.read` | read the catalog | CAREGIVER, CLINIC_COORDINATOR, detection service clients |
| `pat.command.calibrate` | create/update calibration & mapping | CAREGIVER, CLINIC_COORDINATOR |
| `pat.command.retire` | retire a command | CAREGIVER, CLINIC_COORDINATOR |
| `pat.gesture-type.read` | read the primitive catalog | any authenticated actor + service clients |
| `pat.gesture-type.create` | add a primitive | CLINIC_COORDINATOR |

> Role → authority mapping and the single `RoleAuthorityPolicy` are finalized in Specs;
> catalog-read exposure to detection service clients is governed by ADR-004.
