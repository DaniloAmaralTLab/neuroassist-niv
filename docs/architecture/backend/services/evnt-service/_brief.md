# EVNT — Structured Brief

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> Stack: Java 21 / Spring Boot (hexagonal) · Multi-tenant (schema-per-tenant) · Messaging disabled.
> Source brief for the following pipeline stages (specs, backlog, scaffold).

## 1. Canonical name and prefix

- **Prefix:** `EVNT` · **Canonical (paths):** `evnt` · **Service:** `evnt-service`

## 2. Problem the module solves

When the edge detection station recognizes the active command for a patient, that recognition
must become a **durable, auditable, structured event** and must **reach the right caregiver fast**,
with the interruption level matched to urgency (an unmistakable full-screen alarm for `emergency`,
a non-blocking notification for `routine`). EVNT is the module that turns a recognized gesture into
an Event and orchestrates its delivery to the guardian.

## 3. Primary and secondary personas

- **Primary:** Family Caregiver (`FAMILY_CAREGIVER`) — must be notified reliably and in real time
  when the patient triggers a command, and must confirm having attended an emergency.
- **Secondary:** Clinic Coordinator (`CLINIC_COORDINATOR`) — supervises events across the care unit.
- **Non-human actor:** the **edge station** (`edge-device` token) — reports the recognized command.

## 4. MVP scope (minimum viable)

- Ingest a recognized-command report from the edge station and generate exactly one structured
  `Event` referencing the triggered `Command` (ADR-008), with `urgency` + `label` snapshotted from
  PAT at generation time.
- Serve the caregiver dashboard a read surface: the **active emergency event** (query, not a table —
  ADR-010) and the patient's recent events, scoped by tenant and caregiver↔patient link.
- Confirm an emergency event (explicit human acknowledgement → `confirmedAt` / `confirmedBy`).
- Record caregiver feedback on an event (`real` / `false_positive`).
- Audit every state-changing action to HIST over sync REST.

## 5. Out of scope (MVP)

- Gesture recognition / detection engine (GEST / edge, ADR-002) — EVNT trusts the recognized
  `commandId`, it does not classify landmarks.
- Device lifecycle, pairing, heartbeat, offline catalog (EDGE).
- Command catalog authoring and calibration (PAT).
- Caregiver identity, login, JWT issuance, patient-session provisioning (ACS).
- The immutable audit store itself (HIST) — EVNT writes to it, does not own it.
- Real-time push transport (WebSocket / SSE / broker): messaging is disabled; MVP delivery is
  caregiver-dashboard polling (ADR-003 local).

## 6. Mandatory external integrations (intra-project, sync REST)

| Dependency | Call | Identity | Purpose |
|---|---|---|---|
| **EDGE** | `GET /edge/.well-known/jwks.json` (public) · `POST /edge/device-tokens/introspect` (service-client) | — / service-client | validate the inbound `edge.device` report token (G5) |
| **PAT** | `GET /pat/commands/{commandId}` | ACS service-client JWT (`pat.command.read`) | resolve `urgency` + `label` when generating the Event |
| **ACS** | `GET /acs/.well-known/jwks.json` · `POST /acs/auth/introspect` · `GET /acs/caregivers/{id}/links` | public / service-client / caregiver | validate caregiver JWTs; resolve who-to-notify (patient links) |
| **HIST** | `POST /audit` | service-client | append-only audit of EventGenerated / AlarmConfirmed / FeedbackRecorded |

No external third-party systems in the MVP.

## 7. TechLab AI / cross-module dependencies

- `ai.hasAi = false` — EVNT consumes **no** TechLab AI service.
- `stack.messaging.enabled = false` — no broker; all cross-module coupling is synchronous REST.
  EVNT **pushes nothing**; the dashboard (DASH / `evnt-ui`) **pulls** the event surface.

## 8. Domain anchor event

**Event generated** — the recognized command becomes a structured `Event` (anchor action
`EventGenerated`). Supporting actions: `AlarmConfirmed`, `FeedbackRecorded`.

## 9. Carry-forward notes for later stages

- **G5 / INT-EDGE-001 closure:** EVNT owns the gesture-report contract. Report endpoint
  `POST /evnt/gesture-reports`; the `edge.device` token must carry authority **`evnt.event.ingest`**
  (the right EDGE embeds — EDGE integration-contracts §6). See ADR-002 (local).
- **Domain verbs (D-531 / D-639):** EVNT introduces `ingest`, `confirm`, `record` as authority
  actions. These must be registered in `scripts/arch_decisions.py _OP_VERB_TO_ACTION` before
  `/be-architect-scaffold`, or controller generation hard-fails (Learning signal
  `be-scaffold:arch-decisions:missing-domain-verb`, D-531).
- **Flyway range:** EVNT authors migrations applied centrally by MIG; reserved range to be
  confirmed with MIG at backlog/scaffold (TODO[architect]).
