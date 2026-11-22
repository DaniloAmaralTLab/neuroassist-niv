# SPEC-03 — View Models — gest (GEST) Frontend

> View-models are TypeScript `record`-style read-only shapes exposed from facade signals. VMs carry
> only data the template renders; the facades never fabricate missing fields as `null` fillers
> (carry-forward `fe-facade:fabricated-null-fields`). Detection state is **honest**: `camera`,
> `model`, `detection`, `fps` are stored exactly as the runtime observes them and never defaulted to
> a "watching" value (INV-GEST-6). Sources: `frontend/03-domain-framing-frontend.md` §2–§5,
> `frontend/05-state-and-data-flow.md`, BE EVNT api-contract §2.1, GEST api-contract §3.3, EDGE
> api-contract §4.1.

## 1. `StationRuntimeVM` (camera / model / detection health — `RuntimeFacade`)

```ts
type CameraState    = 'idle' | 'requesting' | 'granted' | 'denied' | 'no-device';
type ModelState     = 'loading' | 'ready' | 'failed';
type DetectionState = 'stopped' | 'running' | 'unavailable' | 'paused' | 'degraded';

// EDGE heartbeat enum + reason vocabulary (EDGE api-contract §3.1; Java enum identifiers) — §7
type DetectionStateEnum = 'RUNNING' | 'PAUSED' | 'DEGRADED' | 'UNAVAILABLE';
type DetectionReason    = 'HIDDEN' | 'CAMERA_DENIED' | 'MODEL_FAILED' | 'LOW_FPS';

interface StationRuntimeVM {
  camera: CameraState;
  model: ModelState;
  detection: DetectionState;      // running ONLY while the loop is actually producing frames (INV-GEST-6)
  fps: number;                    // measured landmark cadence; 0 while stopped/paused/unavailable
  fpsBudget: number;              // the acceptable-cadence floor; fps < fpsBudget (sustained) ⇒ degraded
  activeCommandCount: number;
  wakeLock: 'held' | 'released' | 'unsupported';   // SPEC-09 (Screen Wake Lock)
  paused: boolean;                // true WHILE document.hidden / backgrounded (SPEC-09)
  stationIdentity: 'valid' | 'unpaired';           // edge.device token state (SPEC-07)
  reportedDetectionState: DetectionStateEnum;      // §7 — what the EDGE heartbeat carries (INV-GEST-8)
  reportedReason: DetectionReason | null;          // §7 — cause beside a non-RUNNING state
}
```

- `detection = 'running'` requires `camera = 'granted'` AND `model = 'ready'` AND the tab is visible;
  a denied camera or failed model yields `'unavailable'`; a backgrounded/hidden tab yields `'paused'`;
  a sustained sub-budget fps / thermal throttle yields `'degraded'` (SPEC-09). The VM **never** reports
  `'running'` when no frames are produced.

## 2. `ActiveCommandVM` (the detectable gate — `CatalogFacade`)

```ts
type SupportStatus = 'supported' | 'experimental' | 'unsupported' | 'unknown';   // GEST api-contract §5 / §3.3
interface ActiveCommandVM {
  commandId: string;
  label: string;
  urgency: 'emergency' | 'routine';
  primaryPrimitive: { code: string; displayName: string };
  secondaryPrimitive: { code: string; displayName: string } | null;   // compound WHERE present
  sensitivity: 'low' | 'medium' | 'high';
  minGestureDurationMs: number;       // from EDGE catalog `minGestureTimeMs`
  maxGestureDurationMs: number;       // from EDGE catalog `maxGestureTimeMs`
  detectable: boolean;                // ALL primitive codes detectable per support-check (INV-GEST-7)
  supportByCode: { code: string; supportStatus: SupportStatus; detectable: boolean }[];
}
```

- `detectable` is the station-side **AND** over every primitive code's `detectable` as returned by
  `POST /gest/capabilities/support-check` for the running `engineVersion` (GEST api-contract §3.3: a
  compound is detectable iff **all** its primitives are detectable; `unknown`/`unsupported` ⇒ not
  detectable). Projected from EDGE's cached `Command` (EDGE api-contract §4.1) crossed with the
  support map. A non-detectable command is surfaced as **"not yet detectable"** and is **never armed**
  by the state machine (INV-GEST-7, reconciliation #3).

## 3. `RecognitionVM` (transient, per recognition — `RuntimeFacade`)

```ts
interface RecognitionVM {
  commandId: string;
  label: string;
  confidence: number;             // 0..1
  recognitionWindowMs: number;    // elapsed primary-onset → recognition (non-authoritative, sent for tuning)
  occurredAt: string;             // ISO; stamped AT recognition, carried verbatim through the queue (INV-GEST-5)
  reportId: string;               // minted once; reused across every retry (INV-GEST-1)
}
```

- Transient: cleared after the report is enqueued/sent and the debounce cooldown re-arms the loop.

## 4. `ReportQueueVM` (durable offline queue — `ReportFacade`)

```ts
type ReportItemStatus = 'queued' | 'sending' | 'sent' | 'expired';
interface ReportQueueItemVM {
  reportId: string; commandId: string; occurredAt: string;
  attempts: number; status: ReportItemStatus; ageMs: number; expiresInMs: number | null;
}
interface ReportQueueVM {
  pending: number; items: ReportQueueItemVM[];
  lastSentAt: string | null; lastError: string | null; nextRetryInMs: number | null;
}
```

- The queue is **durable** (survives reload — a dropped report is a missed help request, doc 04 §6)
  and `reportId`-keyed; it persists `{reportId, commandId, occurredAt, attempts}` only — **never** a
  frame or landmark (INV-GEST-4). An item older than 24h is `'expired'` and surfaced, not silently
  lost or re-stamped to "now" (INV-GEST-5; EVNT `occurred-at-out-of-bounds`).

## 5. `DiagnosticsVM` (composed on-station read-model — `feature-station-status`)

```ts
interface DiagnosticsVM {
  runtime: StationRuntimeVM;
  activeCommands: ActiveCommandVM[];
  queue: ReportQueueVM;
  lastRecognition: RecognitionVM | null;
}
```

- `DiagnosticsVM` is a `computed()` composition of the three facades, read-only. It drives the
  on-station status surface (SPEC-02 §2); it is **not** a caregiver remote read-model (remote caregiver
  liveness is EDGE's, SPEC-09 / reconciliation #4).

## 6. UI / runtime events (state-changing)

| Event | Source | Effect |
|---|---|---|
| `requestCamera` | bootstrap / operator | `getUserMedia` → `granted` \| `denied` \| `no-device` |
| `modelLoaded` / `modelFailed` | LandmarkWorker | `model: ready \| failed` |
| `startDetection` / `stopDetection` | bootstrap (station identity) | loop `running \| stopped` |
| `visibilityChanged` | `document.visibilitychange` | `paused ↔ running`; re-acquire Wake Lock (SPEC-09) |
| `primitiveDetected` | ClassifierService | feeds the compound-gesture state machine |
| `commandRecognised` | state machine | mint `reportId` → enqueue → report to EVNT |
| `reportSent` / `reportFailed` / `reportExpired` | ReportFacade | update `ReportQueueVM` |
| `supportResolved` | CatalogFacade | recompute `detectable` per `ActiveCommandVM` (INV-GEST-7) |
| `detectionStateReported` | RuntimeFacade | recompute `reportedDetectionState`/`reportedReason` → push to EDGE liveness port + immediate beat (§7, SPEC-06) |

## 7. `reportedDetectionState` — mapping `StationRuntimeVM` → the EDGE heartbeat enum (INV-GEST-8, SAFETY-GEST-1)

The station runtime is the **source** of the `detectionState` the EDGE heartbeat carries (EDGE
api-contract §3.1). `RuntimeFacade` exposes a `computed()` projection of the live VM onto the EDGE
enum; it is published to the EDGE station-liveness sender, never sent by GEST itself (SPEC-06 §2/§3).
The mapping is evaluated in **priority order** so a hard fault is reported even if the tab is also
hidden, and `RUNNING` is reported **only** at the very bottom, when frames are actually being produced:

| # | `StationRuntimeVM` condition (first match wins) | `reportedDetectionState` | `reportedReason` |
|---|---|---|---|
| 1 | `camera ∈ {denied, no-device}` | `UNAVAILABLE` | `CAMERA_DENIED` |
| 2 | `model = failed` | `UNAVAILABLE` | `MODEL_FAILED` |
| 3 | not yet started: `camera ∈ {idle, requesting}` OR `model = loading` OR `detection = stopped` | `UNAVAILABLE` | `null` |
| 4 | `paused = true` (tab hidden / backgrounded) | `PAUSED` | `HIDDEN` |
| 5 | loop producing frames but sustained `fps < fpsBudget` / thermal throttle (`detection = degraded`) | `DEGRADED` | `LOW_FPS` |
| 6 | loop producing frames at `fps ≥ fpsBudget` with `camera = granted ∧ model = ready ∧ tab visible` | `RUNNING` | `null` |

- `RUNNING` is **never** reported from a derived or assumed state: rows 1–5 all precede it, so a denied
  camera, a failed/loading model, a hidden tab, a stalled loop or a sub-budget fps each map away from
  `RUNNING` honestly (INV-GEST-6 / INV-GEST-8). An omitted/unknown state is EDGE's `UNKNOWN`, never
  `RUNNING` (EDGE §3.1) — but the station always reports one of the four.
- `engineVersion` (resolved via `GET /gest/engines`, SPEC-04) is carried alongside the state so EDGE
  records which engine produced it. A change in `reportedDetectionState` is a **transition** that fires
  an immediate heartbeat in addition to the periodic cadence (SPEC-06 §3).

## Criterios de aceite (EARS)

- WHILE the detection loop is actually producing frames with `camera = granted` and `model = ready` and the tab visible, THE SYSTEM SHALL render `detection = running`.
- WHILE the camera is denied or absent, or the model failed, THE SYSTEM SHALL render `detection = unavailable` and SHALL NOT render a running or watching state.
- WHILE the station tab is hidden or backgrounded, THE SYSTEM SHALL render `detection = paused` and SHALL NOT report `detection = running`.
- WHILE a command's primitive codes are not all detectable for the running engine version, THE SYSTEM SHALL mark the command "not yet detectable" and SHALL NOT arm it for recognition (INV-GEST-7).
- THE SYSTEM SHALL compute a compound command's `detectable` as true only WHERE every one of its primitive codes is detectable per support-check.
- WHEN a command is recognised, THE SYSTEM SHALL expose one `RecognitionVM` carrying a `reportId` minted once and an `occurredAt` stamped at recognition.
- WHILE a queued report's age exceeds 24 hours, THE SYSTEM SHALL mark the item `expired` and SHALL NOT re-stamp its `occurredAt` to the current time (INV-GEST-5).
- IF a backend wire record omits an optional field, THEN THE SYSTEM SHALL model it as explicitly absent and SHALL NOT fabricate a placeholder value.
- WHEN the station builds its heartbeat, THE SYSTEM SHALL map the current `StationRuntimeVM` to the EDGE `detectionState` enum in priority order (§7).
- WHILE the detection loop is producing frames at or above the fps budget with camera granted and model ready and the tab visible, THE SYSTEM SHALL report `detectionState` RUNNING with a null reason.
- IF the detection loop is not producing frames at an acceptable fps, THEN THE SYSTEM SHALL NOT report `detectionState` RUNNING.
- WHEN the station tab becomes hidden, THE SYSTEM SHALL map the runtime to `detectionState` PAUSED with reason HIDDEN.
- WHILE the camera permission is denied or no camera device is present, THE SYSTEM SHALL report `detectionState` UNAVAILABLE with reason CAMERA_DENIED.
- WHILE the landmark model failed to load, THE SYSTEM SHALL report `detectionState` UNAVAILABLE with reason MODEL_FAILED.
- WHILE sustained landmark fps is below the budget or a thermal throttle is detected, THE SYSTEM SHALL report `detectionState` DEGRADED with reason LOW_FPS.
- WHILE the runtime has not yet started the loop because the camera is still requesting or the model is still loading, THE SYSTEM SHALL report `detectionState` UNAVAILABLE and SHALL NOT report RUNNING.
