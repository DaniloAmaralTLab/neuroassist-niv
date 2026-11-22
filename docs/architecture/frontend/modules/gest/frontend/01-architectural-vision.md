# 01 — Architectural Vision — gest (GEST) Frontend

## 1. Intent (UX-driven)

At the end of a GEST session, a **patient who can only produce faint voluntary facial
micro-movements has performed their configured gesture and the system recognised it and asked for
help for them — on their own device, with no action beyond the gesture itself, and without a single
frame of video ever leaving the device.** In parallel, a **caregiver can glance at the patient
station and trust that the detector is alive** (camera granted, model loaded, detection running),
so that silence means "no gesture", never "dead detector".

GEST is the module that makes the product's central promise physically true: an ordinary webcam
turns residual movement into a structured help request, **locally and in real time**.

## 2. Problem statement (current journey vs new journey)

- **Current journey.** A locked-in patient depends on a human watching them continuously, or on
  specialised and costly assistive hardware. Help is late, intermittent, or impossible when no one is
  looking. The family has no software that both *recognises* the patient's own faint gesture and
  *proves it is still watching*.
- **New journey.** The patient's own phone/laptop runs GEST. It loads a facial-landmark model once,
  then watches continuously. When the patient performs their configured command — a single primitive
  or a deliberate **compound** (e.g. "raise eyebrow then blink") within the calibrated time window —
  GEST recognises it with enough confidence, emits **exactly one** report to EVNT, and EVNT raises the
  alarm to the caregiver. If the network drops, the report is **queued and retried**; if the camera or
  model fails, the station's **status surface says so honestly** rather than pretending to watch.

## 3. Personas (job-to-be-done)

- **Patient (primary, station user).** *"When I make my gesture, help is requested — I don't touch
  anything, I don't read anything."* GEST is a near-headless runtime for this persona; its UX is
  *reliability and latency*, not screens.
- **Family Caregiver (secondary, station operator / monitor).** *"I set up the station once and I can
  verify at a glance that detection is truly running on it; if it isn't, I'm told plainly."*

## 4. MVP scope (in) — runtime & surfaces

- **Camera-permission & stream flow** on the station: request → granted → live preview (optional,
  for the operator) → stopped on teardown. Honest permission-denied / no-device states.
- **Model-load flow:** download/cache the landmark model + WASM, report `loading → ready | failed`.
- **Detection loop:** per-frame landmark extraction → feature → **multi-class classifier of the
  active command**; a **compound-gesture state machine** (primary within window, then secondary before
  `maxGestureDurationMs`), **confidence threshold derived from `sensitivity`**, and **debounce**.
- **Exactly-once report** to EVNT on recognition (station-minted `reportId`; `edge.device` token).
- **Offline queue + retry** surface (pending count, last-sent, last-error, retry countdown).
- **Station status / diagnostics**: camera · model · detection-active · last-recognised · queue-depth.

## 5. Out of scope (MVP)

Catalog/calibration UI & tactile live-test (PAT); device pairing, token mint, online/offline liveness
and offline-catalog sync (EDGE); event generation, urgency, alarm UI (EVNT); patient-session/login and
authority issuance (ACS); speech-tree runtime (CONV); history/audit (HIST); dashboard (DASH); training
a model for an arbitrarily-named gesture type; native-mobile background capture (ADR-014 Opt. 2);
i18n (English-only, ADR-018).

## 6. Architectural principles

- **On-device by construction.** Video frames and landmarks are processed and discarded locally;
  **only the recognised `commandId` + non-identifying metadata leaves the device** (privacy = design,
  not policy). No cloud inference, no frame upload (ADR-005 local).
- **Standalone-first features; Signals-first state;** OnPush mandatory; **lazy** — the only NgModule is
  the `gest.module.ts` lazy entry (shared ADR-006; project shared-ADR scheme).
- **The FE never invents truth.** The active command/catalog is EDGE's cached copy of PAT's truth;
  urgency and the alarm are EVNT's; liveness is EDGE's. GEST adds exactly one truth: *"this command was
  recognised, now"* — and reports it idempotently.
- **Honest capability.** GEST recognises only gesture primitives its loaded model supports; a
  catalog command naming an unsupported primitive is surfaced as **"not yet detectable"**, never
  silently ignored (answers the PAT ADR-005 "naming ≠ support" hazard).
- **No hardcoded guards.** Every caregiver-facing surface is gated via `AccessDecisionService.can`
  (learning `guard:stub-permissive`); the station runtime is gated by the `edge.device` identity.
- **Adapter default `http`.** The report port targets `evnt-service` (exists) → `provideGest` defaults
  to `http` with a providers spec proving it (learning `scaffold:mock-adapter-default`).

## 7. Success signals

| Signal | Target (pilot) |
|---|---|
| **Recognition → report emitted** (on-device latency) | p95 ≤ 300 ms after the gesture completes |
| **Report POST** `/evnt/gesture-reports` (online) | p95 ≤ 800 ms end-to-end |
| **Detection loop health** | sustained ≥ 10 fps landmark cadence on the pilot station |
| **Exactly-once** | 0 duplicate events per recognised gesture (idempotent `reportId`) |
| **Model TTI** | model `ready` ≤ 4 s on a warm cache; honest `loading` state before |
| **Offline durability** | 100% of queued reports delivered once connectivity returns (within 24h bound) |
| **Privacy** | 0 bytes of video/landmark data egress (verified by network inspection) |
