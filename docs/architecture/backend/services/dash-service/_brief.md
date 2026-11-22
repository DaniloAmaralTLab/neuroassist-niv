# DASH — Structured Brief

> Module **DASH — Dashboard and Notifications** · Project: NeuroAssist NIV
> Produced by `/be-architect-vision`. Source for the subsequent architect commands.
> **Headline decision (ADR-001 local, revisable): DASH has NO backend service.**
> `dash-service` is not built. DASH is a frontend composition/host module (the caregiver
> home/entry shell) that reads the existing module APIs directly with the caregiver JWT.

## 1. Canonical name and prefix

- Prefix: `DASH` · canonical name: `dash` · frontend lib: `dash-ui`.
- Registry `backendService` is currently `dash-service` — **this vision recommends setting it to
  `null`** (see ADR-001 consequences). The directory name `dash-service/` here is only the docs
  home; it is not evidence of a running service.

## 2. Problem the module solves (1–2 sentences)

Give the caregiver a single calm entry point that answers "Is the patient okay right now?" within
two seconds, and the shell from which they reach history, calibration and notifications — without
owning any new data of its own. It composes what PAT, EDGE, EVNT and HIST already expose.

## 3. Primary and secondary personas

- Primary: **Family Caregiver** (`FAMILY_CAREGIVER`) — wants to be reassured at a glance and
  notified reliably (LBC persona).
- Secondary: **Clinic Coordinator** — same home shell, scoped to the patients they are linked to.

## 4. MVP scope (minimum viable)

- The **entry** screen (`/entry`): static brand/login moment, no operational data.
- The **home** screen (`/home`): read-only overview — patient identity + "okay?" status, edge device
  status (online/offline + last sync + detecting/not-detecting), the day's events, and quick links
  to History and Calibration. Writes: none.
- Hosting the module widgets exported by the other FE libs (HistoryWidget from HIST, calibration
  from PAT, alarm/notification surfaces from EVNT, device badge/card from EDGE).

## 5. Out of scope (MVP)

- Any `dash-service` backend, schema, table or `/dash/**` endpoint.
- Any new persisted data (dashboard layout preferences, notification quiet-hours, saved filters) —
  none is required by the prototype or BA docs.
- Server-side aggregation/BFF of the home overview (recorded as a revisable future option — ADR-001).
- Writing events, confirmations, feedback, calibration or push subscriptions — those stay owned by
  EVNT / PAT (DASH only hosts the widgets that call them).

## 6. Mandatory external integrations

- None of its own. DASH (as a frontend) consumes, via GWY, the HTTPS/JSON APIs of PAT, EDGE, EVNT
  and HIST. No third-party or legacy integration is introduced by DASH.

## 7. TechLab AI / cross-module dependencies

- TechLab AI services: none (the home shell carries no AI capability; the prototype's inline-AI
  drawer is advisory UI only, not a DASH backend dependency).
- Messaging: `stack.messaging.enabled = false` — all cross-module reads are synchronous REST; DASH
  emits no events.
- Modules consumed (read-only, caregiver JWT): **PAT** (patient identity + catalog), **EDGE** (device
  read model + detection state), **EVNT** (active alarm, recent events, detection-lapses, push
  subscriptions), **HIST** (per-patient timeline + first-page summary).

## 8. Domain anchor event

- **None owned.** DASH has no aggregate and emits no domain event (see doc 03). Its "anchor" is a
  read interaction — "Home overview rendered" — not a persisted fact. The real domain events it
  surfaces (`EventGenerated`, `AlarmConfirmed`, `DetectionLapseRaised`, `DeviceWentOffline`, …) are
  owned by EVNT / EDGE.
