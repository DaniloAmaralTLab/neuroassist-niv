<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Service: `pat-service` · Module **PAT — Patients and Command Catalog** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal — `../../adr/ADR-001-hexagonal-architecture.md`,
> key `hexagonal_java`) · Multi-tenant (schema-per-tenant — `../../adr/ADR-003-multi-tenancy.md`)
> · Messaging disabled.

## Intent

PAT is the authority on **who is being assisted** and **what each of their gestures
means**. It owns the `Patient` record and the per-patient **command catalog** — the
mapping from a facial gesture (one primitive, or a compound of two) to a family-defined
need, each command independently calibrated with its own urgency, sensitivity and
minimum/maximum gesture time. Every downstream module that detects movement (GEST),
confirms device liveness (EDGE), turns a recognition into an alarm (EVNT), lets a
caregiver review and tune (DASH) or offers assisted communication (CONV) reads its
truth from PAT. PAT itself detects nothing and raises no alarm; it defines the contract
those modules execute.

## Problem Statement

A person with ALS/MND retains only a few voluntary micro-movements, and which movements
are available — and what each should mean — differs per person and changes over time as
the disease progresses. The family, not a clinician and not an engineer, must be able to
say "this eyebrow raise held for half a second means *I need suction*, and it is an
emergency" and to re-tune it next week when the gesture weakens. Without one owner of
that mapping, each detection and notification module would invent its own copy of
"command", calibration would drift between them, and there would be no single place to
change a meaning safely. PAT exists so the gesture→need contract is authored once, owned
once, calibrated once, and read consistently everywhere.

## Personas

| Persona | ACS role | Relationship to PAT |
|---|---|---|
| **Family Caregiver** (primary) | `CAREGIVER` | Registers the patient; authors, calibrates and retires commands for patients they are linked to. |
| **Clinic Coordinator** (secondary) | `CLINIC_COORDINATOR` | Top role within a tenant; same catalog authorities plus patient lifecycle across the care unit. |
| **Detection / notification modules** | service clients | GEST, EDGE, EVNT, DASH, CONV read the catalog and patient metadata by id. |
| **Patient-with-session** | — (ACS `patient-session`) | **Not a PAT actor.** Its JWT carries only `conv.*` / `gest.*` (ACS INV-3) and never reaches the catalog. |

## MVP Scope

- Register a `Patient` within the authenticated caller's tenant (label/alias set by the
  family, optional `deviceId` reference to an EDGE device, lifecycle `active`/`inactive`).
- Per-patient **command catalog** CRUD: create, read, update, retire a `Command`.
- A `Command` maps a gesture to a **family-defined free-form label** (the need), with
  **urgency** (`emergency` | `routine`) and **sensitivity** (`low` | `medium` | `high`).
- **Independent per-command calibration:** `minGestureTimeMs` / `maxGestureTimeMs` and
  sensitivity are tuned per command, not per patient (a weak eyebrow raise and a firm
  blink coexist on the same patient with different thresholds).
- **Compound gestures:** a command references a `primaryPrimitive` and an optional
  `secondaryPrimitive` (both `GestureType`), enabling simple or two-part gestures.
- A PAT-owned **global catalog of `GestureType` primitives** (read + seed), the shared
  vocabulary commands compose from.
- **Read contracts** exposing the *active* command catalog for a patient (to GEST/EDGE)
  and command metadata (urgency, label — to EVNT/DASH/CONV).
- **Audited domain actions** (`PatientRegistered`, `CommandCalibrated`, …) delivered to
  HIST over sync REST.

## Out of Scope

- The detection engine and whether a registered `GestureType` is actually supported by
  it (GEST). Registering a primitive name in PAT does **not** imply engine support.
- Event generation and alarm routing / urgency escalation (EVNT).
- Edge device identity, pairing and heartbeat (EDGE); PAT only references `deviceId`.
- Caregiver identity, roles, caregiver↔patient links and session lifecycle (ACS).
- Speech-tree content authoring and runtime (CONV / TRN).
- Dedicated LGPD erasure/export mechanisms (deferred, internal-network-only).
- Broker-published events (messaging disabled this phase).

## Architectural Principles

1. **Single owner of meaning.** The gesture→need mapping and its calibration live only
   in PAT; every other module reads it, none duplicates it.
2. **Reference by id across boundaries.** `Caregiver`, `EdgeDevice`, `PatientSession`
   are referenced by id with no cross-service FK and no copied data (mirrors ACS).
3. **Tenant context from the JWT only.** `tenantId` is derived from the ACS token claim;
   an `X-Tenant-Id` header is never trusted (ACS api-contract §0.1).
4. **Authority strings are canonical and shared-convention.** `pat.<resource>.<action>`,
   each controller `@PreAuthorize` equal to a single `RoleAuthorityPolicy` constant
   (D-535), every state-changing verb on POST/PATCH/DELETE.
5. **Calibration is per command, not per patient.** Thresholds belong to the command so
   one patient can carry commands tuned to very different residual movements.
6. **Hexagonal layering.** Domain is pure; use-case services orchestrate; adapters
   (JPA, Feign/HTTP, security) depend inward (shared `ADR-001-hexagonal-architecture`).

## Success Signals

- A caregiver can register a patient and author a calibrated command end-to-end, and a
  detection module can read that command's thresholds without any PAT-side change.
- Re-calibrating a command (sensitivity or min/max time) changes what GEST detects on
  the next read, with no code change and an audit entry in HIST.
- No module other than PAT persists `Command`, calibration params or `GestureType`.
- A patient-session token is rejected by every PAT endpoint (INV: catalog is caregiver-authored).
- Cross-tenant reads of a patient or command return `404`, never disclosure.
