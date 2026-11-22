# _brief — gest (GEST) · Gesture Detection (Edge)

> Shared brief (FE ⇄ BE). GEST's BE service (`gest-service`) is **declared, not yet architected**;
> this brief is authored FE-first and BE will synchronize from it. Keep both sides consistent.

## 1. Canonical name & prefix

- **Prefix:** `GEST`
- **Canonical name:** `gest` (kebab-case; module-as-library importPath `@neuroassist/gest`, ADR-006)
- **Backend service:** `gest-service` (planned)
- **Frontend lib:** `gest-ui` / `@neuroassist/gest`

## 2. Problem it solves (user's point of view)

A person with ALS/MND who can only produce faint, voluntary facial micro-movements must be able to
ask for help **from their own device, in real time, with no specialised hardware** — an ordinary
webcam. GEST is the part of NeuroAssist NIV that **watches the patient and recognises the command**
the family configured, then reports it so a caregiver is alerted. It runs **on the patient's own
station** (phone/laptop, Android/Chromium per ADR-014) so that **video never leaves the device**.

## 3. Personas

- **Primary — the Patient (station user).** Job-to-be-done: *"When I perform my configured gesture,
  the system reliably recognises it and asks for help for me — without me touching anything."* The
  patient does not operate a UI; GEST is a mostly-headless runtime in front of them.
- **Secondary — the Family Caregiver (station operator / monitor).** Job-to-be-done: *"I need to see
  that the detector is actually running and healthy on the patient's station — camera granted, model
  loaded, detection live — so I can trust that a missed alarm means no gesture, not a dead detector."*

## 4. MVP scope (in)

- On-device **camera permission + stream lifecycle** on the patient station (`getUserMedia`).
- **Facial-landmark model loading** (WASM/model asset) and a **real-time classification loop**.
- **Multi-class recognition of the active command** — a simple primitive or a **compound**
  (primary + secondary primitive) within the command's min/max duration window.
- **Confidence thresholding keyed to the command's `sensitivity`** (low|medium|high) and
  **debouncing** to suppress repeats/noise.
- **Exactly-once reporting to EVNT** — `POST /evnt/gesture-reports` with a station-minted `reportId`,
  `commandId`, `occurredAt`, optional `confidence` + `recognitionWindowMs`, authenticated with the
  station's **`edge.device`** token (from EDGE).
- **Offline behaviour** — queue reports locally and retry with backoff, honouring EVNT's
  `occurredAt` bounds (5-min future skew / 24h max age) and `503 Retry-After` (catalog-unavailable).
- **Station status / diagnostics surface** — camera state, model-loaded state, detection-active,
  last recognised command, pending-queue depth, loop health (fps).

## 5. Out of scope (MVP)

- The **command catalog / calibration UI** and the tactile webcam live-test → **PAT**.
- **Device pairing, the `edge.device` token mint, device online/offline liveness, and the offline
  catalog cache** → **EDGE** (ADR-005 local EDGE; ADR-014).
- **Structured-event generation, urgency snapshot, alarm rendering & routing** → **EVNT**.
- **Patient-session identity, login/JWT, `conv.*`/`gest.*` authority issuance** → **ACS** (ADR-012).
- **Speech-tree conversation runtime** → **CONV**.
- **History / audit listing** → **HIST**; **cross-patient dashboard** → **DASH**.
- Training a classifier for an arbitrary **newly-named** gesture type (naming ≠ engine support;
  PAT ADR-005 hazard is answered here as a GEST capability contract, not as new UI).
- Native-mobile / background iOS capture (ADR-014 Option 2, deferred); i18n (English-only, ADR-018).

## 6. Mandatory external integrations

- **In-browser facial-landmark engine** (e.g. MediaPipe FaceLandmarker / TF.js) loaded as a local
  WASM + model asset bundle — **chosen in ADR-005 local**; runs 100% on-device, no network inference.
- **Webcam** via `getUserMedia` (no third-party widget, no upload).

## 7. Hub / cross-module dependencies

| Depends on | For |
|---|---|
| **EDGE** | the `edge.device` identity token (station auth) + the **offline command catalog cache** the loop classifies against; device online/offline liveness. |
| **EVNT** | the ingest endpoint `POST /evnt/gesture-reports` (authority `evnt.event.ingest`, device path). |
| **PAT** | the authoritative `Command` / `GestureType` catalog (consumed by id, via EDGE's cache — GEST never calls PAT directly at runtime). |
| **ACS** | issuer of the `gest.*` caregiver authorities the diagnostics surface guards consume (gest-service, planned). |
| **shared/** | `access-decision`, `access-http-base`, `contracts`, `error-model`, `observability`, `ui-*`, `ui-tokens`. |

## 8. Domain anchor event

**"Command recognised"** — the station classifies the patient's active command (simple or compound)
within its duration/confidence window and emits exactly one **gesture-report** to EVNT. (Downstream,
EVNT turns this into the anchor "Help requested" / `EventGenerated`.)
