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

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal, `../../adr/ADR-001-hexagonal-architecture.md`) ·
> Multi-tenant (schema-per-tenant) · Messaging disabled.

## Intent

EVNT is the module that turns a **recognized command** into a **structured, auditable event** and
orchestrates its **delivery to the right caregiver**, with the interruption level matched to the
command's urgency. It is the surface that renders the product's core promise: *an ordinary webcam, a
reliable alarm, no expensive hardware*. Detection is GEST's truth and the edge station's job; EVNT
owns what happens **after** a gesture is recognized — the event, the alarm, the routing.

## Problem Statement

A person with ALS/MND makes a residual voluntary micro-movement that the edge station recognizes as
their configured command (e.g. "Help", "water"). Three things must then happen, reliably:

1. The recognition must become a **durable record** — not a transient UI blip — so History and audit
   are complete and a confirmation on one screen is seen on every screen (the active-event
   desynchronization bug of Phase 0.3, ADR-010).
2. The record must **reach a caregiver fast**, with the urgency the family assigned to that command:
   an `emergency` command must take over the whole screen and demand explicit human confirmation; a
   `routine` command must notify discreetly without interrupting.
3. It must be **trustworthy**: only the genuinely paired device may report, the reported identity
   cannot be forged, and each physical gesture yields exactly one event even if the station retries.

No module owns this today. EDGE makes the station trusted and operational; PAT owns the command
catalog; GEST classifies; EVNT is the missing piece that produces the event and routes the alarm.

## Personas

| Persona | Role code | Need from EVNT |
|---|---|---|
| **Family Caregiver** (primary) | `FAMILY_CAREGIVER` / role `caregiver` | Be notified in real time; never miss an emergency; confirm having attended; flag false positives. |
| **Clinic Coordinator** (secondary) | role `clinic_coordinator` | Supervise events across the care unit's patients. |
| **Edge station** (non-human actor) | `edge-device` token | Report the recognized command and get a definitive "recorded" acknowledgement, idempotently. |

## MVP Scope

- **Ingest** a recognized-command report from the edge station (G5 contract, ADR-002 local) and
  generate exactly one `Event` per report (idempotent on the station-supplied report id).
- **Generate the typed event via the referenced Command** (ADR-008): the event carries the
  `commandId` and a **snapshot** of `urgency` + `label` resolved from PAT at generation time.
- **Serve the read surface** the caregiver dashboard polls: the single **active emergency event**
  (most-recent `emergency`, unconfirmed — a query, never a table, ADR-010) and the patient's recent
  events, scoped by tenant and by caregiver↔patient link.
- **Confirm** an emergency event — explicit human acknowledgement writing `confirmedAt` /
  `confirmedBy`, returning the event to a calm state across all screens.
- **Record feedback** on an event (`real` / `false_positive`) to feed later tuning.
- **Audit** `EventGenerated`, `AlarmConfirmed`, `FeedbackRecorded` to HIST within the request.

## Out of Scope

- Gesture recognition / detection engine (GEST / edge, ADR-002) — EVNT trusts the recognized
  `commandId`; it never processes landmarks or classifies gestures.
- Device enrollment, pairing, heartbeat, `edge.device` token minting and offline catalog (EDGE).
- Command catalog authoring, calibration and the gesture-type vocabulary (PAT).
- Caregiver identity, login, JWT issuance, the revocation blacklist, patient-session provisioning
  (ACS).
- The immutable audit store (HIST) — EVNT is a writer, not the owner.
- **Real-time push** (WebSocket / SSE / broker): messaging is disabled. MVP delivery is dashboard
  polling (ADR-003 local); push is a deferred future signal (ADR-006 shared).
- Multi-channel out-of-band alerting (SMS / phone / email) — not in the MVP.

## Architectural Principles

1. **The event is the single source of truth.** "Active alarm" is a read-time query over the one
   `Event` table, never a second collection (ADR-010). One write is seen everywhere at once.
2. **Urgency is data on the Command, carried onto the Event.** EVNT never hard-codes an event type;
   it resolves `urgency` from the referenced Command (ADR-008) and snapshots it for history stability.
3. **Trust the edge, but verify its token.** EVNT is an EDGE resource server for the report path: it
   validates the `edge.device` token via EDGE JWKS and introspection, and takes identity
   (`deviceId`, `patientId`, `tenantId`) from token claims, never from the request body.
4. **Tenant isolation from the JWT only.** Tenant context derives from the token `tenantId` claim;
   `X-Tenant-Id` is never trusted (hub convention, mirrors ACS/PAT/EDGE).
5. **Exactly-once per gesture.** At-least-once station delivery is reconciled by idempotent ingest.
6. **Synchronous and pull-based.** EVNT pushes nothing; everything cross-module is sync REST and the
   dashboard polls (messaging disabled).
7. **Hexagonal.** Domain is pure; the REST/JWT/Feign/JPA concerns live in infrastructure.

## Success Signals

- An `emergency` recognition appears as a full-screen alarm on the caregiver dashboard within the
  polling budget, and confirming it on the Alarm screen is immediately reflected on Home and History.
- A `routine` recognition produces a discreet, non-blocking notification and a History entry, with
  no screen takeover.
- A station that retries the same report never produces a duplicate event.
- A revoked or unpaired device can no longer generate events (introspection denies it).
- Every generated event, confirmation and feedback is present in the HIST audit trail with a shared
  `correlationId`.
