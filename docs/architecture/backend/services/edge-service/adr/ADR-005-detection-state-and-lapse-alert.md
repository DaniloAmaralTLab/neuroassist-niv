<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-005 — Detection state on the heartbeat and the detection-lapse alert

## Status
aceita (Accepted — product decision **SAFETY-GEST-1**, decided by the user 2026-11-20)

## Contexto
EDGE's heartbeat (`POST /edge/heartbeat`, use case `RecordHeartbeat`, `edge.device` token)
proves only that the station is **connected**. A patient station can stop **detecting** while
it is still connected: the browser tab is backgrounded, the screen is locked, the phone goes to
sleep, the camera permission is withdrawn, or the detection model fails or runs below usable
frame rate. Today connectivity (`online | offline`) is the only liveness signal, so a station
that keeps beating but has silently stopped detecting looks healthy — and a help request the
patient tries to make is lost with no alarm. ADR-014 calls a silent detection stop "the worst
failure mode of this product" (Risk R1), and it is aggravated on mobile. EDGE is the single
owner of device-liveness truth, so the liveness signal must distinguish "not detecting" from
"offline", and a prolonged lapse must be escalated — but alerting/escalation (push → SMS →
voice) is owned by EVNT (EVNT ADR-005), not EDGE.

## Decisão
1. **Detection state on the heartbeat.** The `edge.device` heartbeat additionally carries
   `detectionState ∈ {RUNNING, PAUSED, DEGRADED, UNAVAILABLE}` (valid Java enum identifiers),
   `detectionStateSince`, an optional `reason` (recommended identifiers: `HIDDEN`,
   `CAMERA_DENIED`, `MODEL_FAILED`, `LOW_FPS`) and `engineVersion`. The change is **backwards
   compatible**: an older station omits `detectionState`, which EDGE records as `UNKNOWN` and
   **never** treats as `RUNNING` (INV-EDGE-9).
2. **Detection state on the device read model.** EDGE persists the latest detection state per
   device and exposes `detectionState`, `detectionStateSince` and `lastDetectingAt` on
   `GET /edge/devices/{id}` and the list, so DASH/caregiver UIs can show "station is NOT
   detecting" distinctly from "offline".
3. **Detection-lapse detection + escalation.** A scheduled EDGE sweep (sync REST; messaging
   disabled) raises a **detection lapse** for a paired device of a patient whose
   `detectionState` has not been `RUNNING` — or whose heartbeat has stopped — for `N` minutes
   (`EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS`, default **120 s / 2 min**). On lapse start EDGE
   raises it to **EVNT** through a new service-to-service call (EVNT owns alerting/escalation,
   EVNT ADR-005: push → SMS → voice); on recovery (first `RUNNING` heartbeat) EDGE notifies EVNT
   to resolve. The raise/resolve is **idempotent per lapse episode** (one open episode per
   device, INV-EDGE-10). EDGE specifies only its own side and the shape of the contract it
   expects from EVNT (endpoint shape, service-client identity, idempotency key); the concrete
   EVNT endpoint is an **INT TODO[architect]** (EVNT specs amended next).
4. **Audit.** EDGE audits `DetectionLapseStarted` and `DetectionLapseResolved` to HIST using the
   same envelope as every other EDGE fact (event-contracts §1).

## Consequências
- **Positive:** "not detecting while connected" becomes a first-class, observable and escalated
  state — the product's worst failure mode (Risk R1) is now actively surfaced rather than
  silently tolerated. Backwards compatibility keeps older stations working (they report
  `UNKNOWN`, which is itself a lapse-eligible state, so they are not falsely treated as healthy).
- **Positive:** EDGE stays the single owner of liveness truth; EVNT stays the single owner of
  alerting/escalation. The boundary is a thin, idempotent service-to-service contract.
- **Guaranteed vs not (safety boundary).** EDGE now guarantees that a station which is connected
  but **reports** `PAUSED` / `DEGRADED` / `UNAVAILABLE` / `UNKNOWN` (or stops beating) for `N`
  minutes raises an escalation to EVNT. EDGE does **not** guarantee that a station which is
  **fully off** (no process, no network) can self-report `PAUSED` — a powered-off phone sends
  nothing. That case is covered instead by the **heartbeat-stop** arm of the same rule: silence
  for `N` minutes is itself a lapse (silence ⇒ not `RUNNING`). What remains uncovered is the
  window shorter than `N`, and anything upstream of the first successful pairing/heartbeat
  (nothing to lapse yet). See doc 06 Risk R6.
- **Negative / trade-off:** EDGE gains a second scheduled job and a new outbound dependency
  (EVNT) on a safety-critical path, plus a lapse-episode table and detection-state columns.
  Accepted because the alternative — connectivity as the only liveness signal — leaves the
  product's worst failure mode undetectable. The `N` default (2 min) trades alarm latency
  against false alarms from brief, benign pauses and is configurable.
