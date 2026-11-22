# ADR-005 — On-device detection runtime with exactly-once gesture reporting to EVNT

> Status: **proposed** — 2026-11-20
> Scope: the GEST frontend module (`@neuroassist/gest`) — `libs/gest/detection`,
> `libs/gest/data-access` (report port + durable queue + EDGE catalog read),
> `feature-station-runtime`, `feature-station-status`, and the FE contract GEST exposes to EVNT, EDGE,
> PAT and ACS. Module-local record; does **not** occupy the reserved shared ADR-005 slot (design
> tokens) — see this folder's `README.md` numbering caveat.

## Context

NeuroAssist NIV's whole value depends on GEST recognising a locked-in patient's faint, voluntary
facial gesture **on the patient's own device, in real time** and asking for help — while **no video
ever leaves the device** (LGPD; product privacy promise). GEST is unusual among the FE modules: it is
**not a prototype-promoted dashboard screen**. The BA prototype's only webcam screen is PAT's
*calibration live-test*, which turns the camera on for **tactile feedback with no recognition**
(prototype `screens/calibration/calibration.component.ts`: "There is no real gesture recognition in
the prototype"). GEST must therefore be architected net-new as a **station runtime**, not promoted.

Forces:

- **Real-time, on-device inference.** Landmark extraction + multi-class classification must run in the
  browser at an interactive cadence on a low-end Android/Chromium phone (ADR-014), off the main thread.
- **Compound gestures.** A command may be a two-primitive combination within a per-command
  `[minGestureDurationMs, maxGestureDurationMs]` window (LBC Amendment 1 / §12 false-negative risk).
- **Exactly-once.** A recognised gesture must raise **one** alarm, even across retries, offline queueing
  and races — EVNT keys idempotency on `(deviceId, reportId)` (EVNT api-contract §2.1, INV-EVNT-4).
- **Offline durability.** A dropped help request is a safety failure; reports must survive a network
  gap and a reload, honouring EVNT's `occurredAt` bounds (≤ 5-min skew, ≤ 24h) and `503 Retry-After`.
- **Honest capability + honest liveness.** A named `GestureType` is not necessarily detectable (PAT
  ADR-005 hazard lands here); and a denied camera / failed model must never be shown as "watching".
- **Identity seam.** The station authenticates to EVNT with the **`edge.device`** token minted by EDGE
  (ADR-014 — the phone carries two identities: `edge.device` for GEST, PatientSession for CONV), **not**
  a caregiver ACS JWT.

## Decision

1. **The recognition loop runs 100% on-device in a Web Worker.** Frames flow webcam → `LandmarkWorker`
   → `ClassifierService`; landmarks and frames are processed per-tick and **discarded**. Only a
   recognition event (`commandId` + `confidence` + `recognitionWindowMs`) crosses back to the main
   thread. **No frame, no landmark array, is ever persisted, logged, or transmitted** (INV-GEST-4).
2. **Recognition is a compound-gesture state machine** (`idle → primaryHeld → awaitingSecondary →
   recognised`), gated by a **confidence threshold derived from the command's `sensitivity`** and by
   the per-command duration window; a compound that does not complete inside the window emits **nothing**
   (INV-GEST-2/3). A debounce cooldown re-arms the loop and prevents duplicate recognitions.
3. **Reporting is exactly-once and pessimistic.** On recognition GEST mints a **station-unique,
   idempotent `reportId`**, stamps `occurredAt` at capture, and calls `GESTURE_REPORT_PORT.report` →
   `POST /evnt/gesture-reports` with the **`edge.device`** bearer. The report is held `sending` until
   EVNT confirms `201`/`200(replay)`; the same `reportId` is reused across every retry (INV-GEST-1).
4. **Offline durability via a durable `ReportQueue` + `RetryScheduler`.** Reports queue across network
   gaps and reloads; retries honour `503 Retry-After`; a report older than 24h is dropped as `expired`
   and **surfaced**, never silently lost or re-stamped to "now" (INV-GEST-5/6).
5. **Detection reads EDGE's cached catalog, never PAT directly.** `CATALOG_READ_PORT` projects EDGE's
   offline catalog; GEST classifies only against the **active command set** and only for **detectable**
   primitives, flagging non-detectable catalog commands instead of ignoring them (INV-GEST-7).
6. **Adapter default `http`; the engine is not a port.** `provideGest` defaults to `http` (EVNT
   exists), proven by a providers spec (learning `scaffold:mock-adapter-default`). The landmark engine
   is local code in `libs/gest/detection`, not a network adapter.

## Alternatives considered

- **Cloud / server-side recognition (upload frames to an inference endpoint).** Rejected: violates the
  privacy promise (video egress, LGPD), adds unacceptable latency + bandwidth for a locked-in user, and
  fails when offline. On-device is non-negotiable for this product.
- **Main-thread `setInterval` detection loop.** Rejected: janks the UI and starves the capture pump;
  the hot path belongs in a Web Worker off `requestAnimationFrame`.
- **Fire-and-forget reporting (no idempotency key, optimistic "sent").** Rejected: duplicate alarms on
  retry, and a silently-lost report hidden behind an optimistic UI — both unacceptable on a safety path.
  Exactly-once + pessimistic queueing is required.
- **GEST owns its own catalog cache (sync from PAT).** Rejected: duplicates EDGE's offline-catalog
  ownership (EDGE ADR-005) and risks a second drifting copy; GEST reads EDGE's cache.
- **Run recognition inside PAT's live-test, or treat the PAT test as a capability gate.** Rejected: the
  PAT test is tactile-only by design (PAT ADR-005); recognition is a station-runtime concern, not a
  dashboard one, and duplicating it would diverge from the authoritative detector.
- **Default `provideGest` to `mock` (as EDGE does).** Rejected: GEST's report target is `evnt-service`,
  which **exists**; `http` is the honest default (unlike EDGE, whose `edge-service` is not yet built).

## Amendment — SAFETY-GEST-1 (detection-state on the EDGE heartbeat) · 2026-11-20

The residual risk noted under *Negative / mitigations* (R1 backgrounding; "a push cadence deferred to
SPEC") is now **closed by a user product decision**, aligned with EDGE ADR-005 and EVNT ADR-006 already
specified on the backend:

- The station runtime is the **source** of a `detectionState` it reports on the EDGE heartbeat
  (`RUNNING|PAUSED|DEGRADED|UNAVAILABLE` + optional `reason` `HIDDEN|CAMERA_DENIED|MODEL_FAILED|LOW_FPS`
  + `engineVersion`, EDGE api-contract §3.1). `StationRuntimeVM` is mapped to the enum in priority order
  (SPEC-03 §7); `RUNNING` is reported **only** while the loop produces frames at an acceptable fps
  (INV-GEST-6/8).
- **One sender:** `libs/edge` owns the single `POST /edge/heartbeat` sender (it holds the `edge.device`
  token + refresh); GEST **publishes** its state in-process via `StationLivenessPort` and is not a second
  sender (SPEC-06 §2.1). GEST's network boundary stays the three device-token calls.
- **Cadence/triggers:** periodic beat below EDGE's 120 s lapse window + an **immediate** beat on every
  transition, incl. a `keepalive`-fetch beat on `visibilitychange→hidden` (SPEC-06 §3.1).
- EDGE raises a detection **lapse** to EVNT after 120 s of non-`RUNNING`/silence; EVNT alerts and
  escalates caregivers (push→SMS→voice). Honest limit: a powered-off/suspended phone cannot emit
  `PAUSED`, but the **stopped heartbeat** still trips the lapse (SPEC-09 §4). Declares **INV-GEST-8**.

## Consequences

**Positive**

- The privacy promise is architectural, not procedural — video cannot leak because it never leaves the
  worker.
- One recognised gesture ⇒ exactly one alarm, resilient to retries, offline gaps and races.
- Honest states everywhere: unsupported gesture, denied camera, failed model, expired report are all
  shown, never faked.
- Clean seams: EDGE = identity/pairing/catalog-cache, PAT = catalog truth, EVNT = event/alarm, ACS =
  session/authority; GEST adds only "recognised, now".

**Negative / mitigations**

- Real-time in-browser inference on a weak phone may not hold the fps budget (R2) / backgrounding can
  stall the loop (R1). *Mitigation:* Worker isolation, model-size budget, Wake Lock + honest
  `visibilitychange` status, fps as a measured success signal; a push cadence deferred to SPEC.
- The `edge.device` token and EDGE catalog-cache contracts are provisional (R7/G3). *Mitigation:*
  keep both behind ports; a 401/unpaired is a first-class UI state.
- `gest-service` BE is not yet architected (G2). *Mitigation:* v1 egress is EVNT-only; `gest.*`
  authorities + diagnostics read-model are FE-declared and reconciled when the BE lands.
- The detectable-primitive ⇄ `GestureType` mapping GEST must publish for PAT's marker is unspecified
  (G5). *Mitigation:* fixed as a deferred SPEC contract; INV-GEST-7 holds in the meantime.

## References

- `_brief.md` (GEST) · doc 01 §6, doc 02 §3–§5, doc 03 §4–§5, doc 06 R1–R9 / G1–G5.
- EVNT api-contract §2.1 `POST /evnt/gesture-reports` (idempotency `(deviceId, reportId)`,
  `occurredAt` bounds, `503 Retry-After`, authority `evnt.event.ingest`).
- Project data model: `Command`, `GestureType`, `EdgeDevice`, `Event` (project-context.json
  `_extensions.data_model`). LBC Amendment 1 (compound command), §12 (compound false-negative risk).
- Prototype (negative reference): `frontend/design-reference/.../screens/calibration` — tactile
  live-test only, **no recognition** (recognition is GEST, net-new).
- EDGE ADR-005 (device identity / pairing seam / offline catalog / `mock` default), PAT ADR-005
  (naming ≠ engine support), EVNT ADR-005 (alarm ownership; polling delivery), ACS ADR-012 (two
  identities; patient/device tokens carry no caregiver authority), ADR-014 (patient phone = edge
  device; two independent identities), ADR-018 (English-only).
- Shared ADR-006 (module entry as a library). Authority vocabulary: canonical English
  `gest.<resource>.<action>` with `.read` (D-639).
- Learning: `scaffold:mock-adapter-default` (http default + mapper-behind-wire + providers spec),
  `guard:stub-permissive` (no hardcoded `true` guards; consult `AccessDecisionService`).
