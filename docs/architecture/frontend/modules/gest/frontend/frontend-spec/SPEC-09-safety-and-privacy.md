# SPEC-09 — Safety & Privacy — gest (GEST) Frontend

> GEST is an **assistive-safety product**: a missed recognition is a missed help request for a
> locked-in patient, and a leaked frame is an LGPD breach. This SPEC makes both concerns **testable
> EARS**, states plainly **what is guaranteed and what is not**, and records how the residual risk is
> now **closed by design** (**SAFETY-GEST-1**, user decision 2026-11-20). Sources:
> `frontend/06-risks-gaps-assumptions.md` R1/R2/R8, ADR-005 (on-device runtime; Wake Lock),
> EDGE api-contract §3.1 (heartbeat liveness), GEST api-contract §SAFETY (backend cannot infer station
> liveness). This SPEC ends with EARS; its scenarios live in `e2e/station-detection-liveness.feature`
> and `e2e/privacy-zero-egress.feature`.

## 1. The safety problem (R1) — a backgrounded/asleep station can miss a help request

A browser throttles or suspends `requestAnimationFrame` (and may suspend timers) when the tab is
backgrounded, the device sleeps, or the screen locks. The detection loop then **stalls** and a real
gesture is missed. The backend **cannot** detect this: GEST-service is advisory/read-mostly and a
silent station produces no GEST signal (GEST api-contract §SAFETY — "a station that is
backgrounded/asleep produces no GEST signal; GEST cannot and must not infer station liveness").
The mitigation is **100% on the station frontend**.

## 2. Mitigations (station-side)

### 2.1 Screen Wake Lock (acquire + re-acquire)

- On runtime `init` (camera granted ∧ model ready), the station acquires a **Screen Wake Lock**
  (`navigator.wakeLock.request('screen')`), keeping the screen awake while detecting.
- The lock is **released automatically** by the browser when the tab is hidden; on
  `visibilitychange` back to visible the station **re-acquires** it (the Wake Lock API requires
  re-request after visibility returns). `wakeLock` state is surfaced in `StationRuntimeVM`
  (`held`/`released`/`unsupported`).

### 2.2 Kiosk / foreground requirement

- The station is specified to run as a **dedicated, foregrounded (kiosk) tab** on the patient's
  device (doc 06 A4). The status surface shows a **"keep this tab in the foreground"** requirement; a
  backgrounded tab is treated as an explicit **degraded** condition, not a normal mode. v1 **requires**
  but cannot **enforce** OS-level kiosk from a web context (see §4, not guaranteed).

### 2.3 Honest "detection paused / degraded" — always visible, on the station

- The runtime renders an **always-visible** overlay (`DetectionPausedOverlayComponent`, SPEC-02 §1):
  `detection = paused` while the tab is hidden; `detection = degraded` while sustained fps is below
  the budget (R2) or a thermal throttle is detected. The overlay is an ARIA live region announced on
  state change. Detection is **never** shown as `running` when no frames are produced (INV-GEST-6).
- This on-station overlay **stays** (INV-GEST-6); it is now complemented upstream: the same state rides
  the EDGE heartbeat (§2.4), so once the station has been non-`RUNNING` (or silent) beyond EDGE's 120 s
  threshold, **caregivers are alerted and escalated** by EVNT — the patient is no longer the only one
  who can see a stalled detector (INV-GEST-8).

### 2.4 Propagation to caregivers — detection state on the EDGE heartbeat (SAFETY-GEST-1 closed)

- A **remote** caregiver's "is the detector alive" signal is **EDGE's**, and since the SAFETY-GEST-1
  decision the EDGE heartbeat (`POST /edge/heartbeat`, EDGE §3.1, ADR-005 / EVNT ADR-006) carries the
  station's **`detectionState`** (`RUNNING|PAUSED|DEGRADED|UNAVAILABLE` + optional `reason` +
  `engineVersion`) — not merely `connectivity`. GEST **reuses** this one endpoint and **invents no GEST
  liveness endpoint** (reconciliation #4); it only **publishes** its mapped state (SPEC-03 §7) to
  `libs/edge`'s single sender (SPEC-06 §2.1). While detection is paused/degraded the station keeps
  heart-beating with the **honest** non-`RUNNING` state (it does **not** suppress the beat — suppression
  was rejected option (a), §4); EDGE then distinguishes "connected but not detecting" from "offline",
  and a lapse beyond EDGE's 120 s threshold is raised to EVNT, which **alerts and escalates** caregivers
  (push→SMS→voice). This is how caregivers are now told after a lapse (INV-GEST-8).

### 2.5 fps / thermal degradation

- The loop measures landmark cadence; a sustained drop below the fps budget (R2) switches the station
  to a lower-cadence mode with an honest `degraded` state (never a silent fps collapse). Capture
  resolution may be downscaled (ADR-005) to hold the budget.

## 3. What is GUARANTEED (v1)

- **G-SAFE-1** WHILE the station tab is **foregrounded and visible**, THE SYSTEM holds the Screen
  Wake Lock, runs the loop, and reports an honest `running`/`degraded` state that reflects actual
  frame production.
- **G-SAFE-2** WHEN the tab becomes visible after being hidden, THE SYSTEM re-acquires the Wake Lock
  and resumes the loop.
- **G-SAFE-3** WHILE the tab is hidden / the loop is not producing frames, THE SYSTEM shows an
  always-visible `paused`/`degraded` state on the station and **never** a faked "watching"
  (INV-GEST-6).
- **G-SAFE-4** THE SYSTEM reuses the EDGE heartbeat for the remote caregiver reachability signal and
  invents no GEST liveness endpoint.
- **G-SAFE-5** (SAFETY-GEST-1) THE SYSTEM reports an honest `detectionState` on the EDGE heartbeat and,
  on every state transition, an immediate beat, so EDGE distinguishes "connected but not detecting"
  from "offline" and raises a lapse to EVNT — caregivers are alerted/escalated after the 120 s threshold.

## 4. What is NOT guaranteed (v1) — residual limits after SAFETY-GEST-1

SAFETY-GEST-1 is **closed by design** (user decision 2026-11-20): options **(b)** a distinct
detecting-health signal (`detectionState` on the heartbeat) **and (d)** an out-of-band watchdog (EDGE's
lapse sweep → EVNT alert/escalation) were adopted; option (a) heartbeat suppression was rejected
(silence is ambiguous), and (c) an OS-level kiosk guarantee stays a deployment requirement, not a web
guarantee. What the design **guarantees** vs what it still **cannot**:

- **Guaranteed:** while the page process is alive, a non-`RUNNING` transition reaches EDGE promptly (an
  immediate beat), the caregiver signal is now **distinct** from offline, and a station that goes silent
  is caught by the lapse sweep regardless — silence/`UNKNOWN` is treated as not-`RUNNING`, never assumed
  detecting (EDGE §3.2, INV-EDGE-9).
- **NOT guaranteed — the honest hole:** a **powered-off / OS-suspended / screen-locked** station cannot
  send a `PAUSED` beat at all, because the very timers (and `fetch`) that would send it are frozen; the
  `keepalive` beat on `visibilitychange→hidden` is best-effort and fires only while the page is still
  allowed to run. In that case there is **no explicit PAUSED** — but the **stopped heartbeat itself**
  still trips EDGE's 120 s lapse and alerts caregivers (that is the safety net, not the PAUSED beat).
- A web context **cannot force** OS-level kiosk/foreground; §2.2 is a requirement, not an enforcement.

### SAFETY-GEST-1 — CLOSED by design (user decision, 2026-11-20)

> **SAFETY-GEST-1 (closed).** The remote caregiver signal is no longer bare EDGE reachability: the EDGE
> heartbeat now carries the station's `detectionState` (ADR-005 / EVNT ADR-006), so "device online" is
> distinguished from "detection actively running." The station runtime is the **source** of that state
> (SPEC-03 §7), reports an immediate beat on every transition (SPEC-06 §3.1), and EDGE raises a lapse to
> EVNT after 120 s of non-`RUNNING`/silence; EVNT alerts and escalates (push→SMS→voice). **What is
> guaranteed:** an honest, distinct detecting-health signal and caregiver alerting after the lapse —
> including when the station simply goes silent. **What is still not:** a powered-off/suspended phone
> cannot emit `PAUSED`, so the distinct cause is lost in that case, but the stopped heartbeat still
> trips the lapse. The on-station overlay (§2.3) continues to state the kiosk/foreground requirement
> plainly.

## 5. Privacy — video/landmarks never leave the device (reconciliation #5, INV-GEST-4)

- Frames and landmark arrays are confined to the detection **Web Worker** and **discarded per tick**;
  the only data that crosses the worker boundary is a recognition event `{commandId, confidence,
  recognitionWindowMs}`. The **only** network egress from GEST is the three device-token calls
  (SPEC-04): the EVNT report body (`{commandId, reportId, occurredAt, confidence?,
  recognitionWindowMs?}`), the GEST support-check (`{engineVersion, codes[]}`), and the EDGE catalog
  GET. **No frame, no landmark, no video stream** is ever persisted, logged (observability is
  schema-whitelisted), or transmitted — privacy is architectural, not procedural (ADR-005).
- The optional operator preview binds a `<video>` to the **same** capture stream the worker reads; it
  is never a second capture and never uploaded. On teardown every `MediaStreamTrack` is stopped
  (camera off).
- **e2e proof:** `privacy-zero-egress.feature` asserts **zero** bytes of video/landmark egress by
  network inspection across a full recognise-and-report cycle (success signal: 0-byte video egress).

## Criterios de aceite (EARS)

- WHEN the detection runtime starts with camera granted and model ready, THE SYSTEM SHALL acquire the Screen Wake Lock and SHALL keep the screen awake while detecting.
- WHEN the station tab becomes visible after being hidden, THE SYSTEM SHALL re-acquire the Screen Wake Lock and resume the detection loop.
- WHILE the station tab is hidden or backgrounded, THE SYSTEM SHALL render an always-visible "detection paused" state and SHALL NOT render a running or watching state.
- WHILE sustained landmark fps is below the budget or a thermal throttle is detected, THE SYSTEM SHALL render a "detection degraded" state and SHALL NOT report detection as running.
- THE SYSTEM SHALL require the station to run as a foregrounded kiosk tab and SHALL surface a "keep this tab in the foreground" requirement on the status surface.
- THE SYSTEM SHALL propagate station liveness to caregivers through the EDGE heartbeat and SHALL NOT invent a GEST liveness endpoint.
- THE SYSTEM SHALL confine video frames and landmark arrays to the detection worker, discard them each tick, and SHALL NOT persist, log, or transmit any frame, landmark array, or video stream.
- THE SYSTEM SHALL emit over the network only the recognised `commandId` and non-identifying report metadata, the support-check code set, and the catalog read, and SHALL NOT upload a frame or landmark.
- WHEN the runtime is torn down, THE SYSTEM SHALL stop every camera track and SHALL NOT leave the camera active.
- THE SYSTEM SHALL state that SAFETY-GEST-1 is closed by design and SHALL NOT claim that EDGE connectivity alone proves detection is actively running.
- THE SYSTEM SHALL carry the station's `detectionState` on the EDGE heartbeat so EDGE distinguishes a connected-but-not-detecting station from an offline one.
- WHEN the station stops reporting RUNNING beyond the EDGE detection-lapse threshold, THE SYSTEM SHALL rely on EDGE raising a lapse to EVNT so caregivers are alerted and escalated.
- IF the station device is powered off or its page process is suspended, THEN THE SYSTEM SHALL be unable to send a PAUSED beat, and THE SYSTEM SHALL rely on the stopped heartbeat tripping the EDGE lapse so caregivers are still alerted.
