# 03 — Domain Framing (Frontend) — gest (GEST)

> Mirror of the BE domain, **not** a redefinition. Entities come from the project data model
> (`project-context.json` `_extensions.data_model`): `Command`, `GestureType`, `EdgeDevice`,
> `Event`. Ubiquitous language is owned by PAT (catalog) + EVNT (event) + EDGE (device). GEST adds
> only the **runtime** vocabulary below. See `_brief.md` §2 and the EVNT api-contract §2.1.

## 1. Ubiquitous language (GEST runtime terms; the rest is referenced, not redefined)

| Term | Meaning (GEST runtime) |
|---|---|
| **Primitive** | A single recognisable facial movement = `GestureType` (e.g. "eyebrow raise", "blink"). |
| **Command** | A patient catalog item: `primaryPrimitive` (+ optional `secondaryPrimitive` → **compound**) → free-form `label`, with `sensitivity`, `minGestureDurationMs`, `maxGestureDurationMs`, `urgency`. Owned by PAT; GEST reads EDGE's cache. |
| **Active command set** | The commands GEST is currently watching for, for the paired patient. |
| **Recognition** | A command's primitive(s) detected with `confidence ≥ threshold` inside the duration window. |
| **Recognition window** | Elapsed ms from primary onset to recognition (`recognitionWindowMs`, non-authoritative, sent for tuning). |
| **Gesture-report** | The exactly-once message GEST sends to EVNT on recognition (`reportId`, `commandId`, `occurredAt`, `confidence?`, `recognitionWindowMs?`). |
| **reportId** | Station-minted idempotency key, unique per `(deviceId, reportId)` (EVNT INV-EVNT-4). Format e.g. `station-7f3a-00912`. |
| **Detectable** | A primitive the **loaded model** can classify. A named `GestureType` that is not detectable is surfaced as "not yet detectable" (naming ≠ support). |
| **detectionState** | The station's own liveness-of-detection, reported upstream on the EDGE heartbeat as the enum `RUNNING \| PAUSED \| DEGRADED \| UNAVAILABLE` (EDGE api-contract §3.1, ADR-005 / EVNT ADR-006). The station runtime is the **source**; it is a projection of `StationRuntimeVM`, never a backend guess. |
| **reason** | Optional cause carried beside a non-`RUNNING` `detectionState`: `HIDDEN \| CAMERA_DENIED \| MODEL_FAILED \| LOW_FPS` (EDGE api-contract §3.1). |
| **Detection lapse** | EDGE raising an episode to EVNT after the station stops reporting `RUNNING` (or stops heart-beating) beyond EDGE's threshold (120 s); EVNT then alerts and escalates caregivers push→SMS→voice. The station does not raise the lapse — it only reports state honestly (SAFETY-GEST-1). |

## 2. View models (draft)

- **`StationRuntimeVM`** — `{ camera: 'idle'|'requesting'|'granted'|'denied'|'no-device'; model:
  'loading'|'ready'|'failed'; detection: 'stopped'|'running'|'unavailable'|'paused'|'degraded'; fps:
  number; activeCommandCount: number; wakeLock; paused }`; it also projects a `reportedDetectionState`
  (`RUNNING|PAUSED|DEGRADED|UNAVAILABLE`) + `reportedReason` for the EDGE heartbeat (SPEC-03 §7).
- **`ActiveCommandVM`** — `{ commandId; label; urgency; primaryPrimitive; secondaryPrimitive?;
  sensitivity; minGestureDurationMs; maxGestureDurationMs; detectable: boolean }` (projected from
  EDGE's cached `Command`; `detectable` computed against the loaded model's primitive set).
- **`RecognitionVM`** — `{ commandId; label; confidence; recognitionWindowMs; occurredAt; reportId }`.
- **`ReportQueueVM`** — `{ pending: number; lastSentAt?; lastError?; nextRetryInMs?;
  items: { reportId; commandId; occurredAt; attempts; status: 'queued'|'sending'|'expired' }[] }`.
- **`DiagnosticsVM`** — composed read-model of the three above for the caregiver status surface.

## 3. UI / runtime events (state-changing)

| Event | Source | Effect |
|---|---|---|
| `requestCamera` | bootstrap / operator | `getUserMedia` → `granted` \| `denied` \| `no-device`. |
| `modelLoaded` / `modelFailed` | LandmarkWorker | `model: ready \| failed`. |
| `startDetection` / `stopDetection` | bootstrap / `gest.runtime.control` | loop `running \| stopped`. |
| `primitiveDetected` | ClassifierService | feeds the compound-gesture state machine. |
| `commandRecognised` | state machine | mint `reportId` → enqueue/report to EVNT. |
| `reportSent` / `reportFailed` / `reportExpired` | GestureReportPort | update `ReportQueueVM`. |
| `connectivityChanged` | EDGE / browser online | triggers RetryScheduler drain. |

## 4. State transitions (UI/runtime level)

```
Camera:     idle → requesting → granted → (stopped on teardown)
                             └→ denied | no-device
Model:      loading → ready | failed
Detection:  stopped → running → stopped            (running requires camera=granted ∧ model=ready)
                    └→ unavailable                 (camera denied/no-device OR model failed)

Compound-gesture state machine (per active command):
  idle → primaryHeld (confidence ≥ threshold, t ≥ minGestureDurationMs)
       → [simple]   recognised
       → [compound] awaitingSecondary → (secondary before maxGestureDurationMs) → recognised
                                      └→ (timeout)                               → idle  (no report)
  recognised → debounce(cooldown) → idle

Report:     onRecognised → sending → sent            (201/200)
                        └→ queued → sending → sent    (retry success)
                                  └→ expired          (occurredAt > 24h → dropped, surfaced)
```

## 5. Invariants (client-side)

- **INV-GEST-1 — Exactly-once per recognition.** One `commandRecognised` ⇒ at most one delivered
  event; the `reportId` is minted once and reused across retries (idempotent; EVNT INV-EVNT-4).
- **INV-GEST-2 — No partial compound.** A compound command reports **only** when both primitives
  complete inside `[minGestureDurationMs, maxGestureDurationMs]`; a timeout emits nothing.
- **INV-GEST-3 — Threshold honours sensitivity.** The confidence threshold is derived from the
  command's `sensitivity` (low = most permissive … high = strictest); it is never hardcoded per build.
- **INV-GEST-4 — Privacy.** No frame or landmark array is persisted, logged, or transmitted; only
  `commandId` + `{reportId, occurredAt, confidence?, recognitionWindowMs?}` egresses.
- **INV-GEST-5 — occurredAt is capture time.** `occurredAt` is stamped at recognition, carried
  verbatim through the queue, and must satisfy EVNT's bound (≤ 5-min future skew, ≤ 24h age) or is
  dropped as `expired` — GEST never re-stamps a queued report to "now".
- **INV-GEST-6 — Honest detection state.** Detection is shown as `running` only when the loop is
  actually producing frames; a denied camera or failed model is `unavailable`, never a faked "watching".
- **INV-GEST-7 — Detectable gate.** GEST classifies only primitives the loaded model supports; a
  non-detectable catalog command is flagged, not silently ignored, and never produces a report.
- **INV-GEST-8 — Honest upstream reporting (SAFETY-GEST-1).** The station runtime is the **source** of
  the `detectionState` it reports on the EDGE heartbeat: `StationRuntimeVM` is mapped to the
  `RUNNING|PAUSED|DEGRADED|UNAVAILABLE` enum, `RUNNING` is reported **only** while the detection loop is
  actually producing frames at an acceptable fps, and every state transition triggers an immediate beat.
  The station never raises the detection lapse itself — reporting honestly is what lets EDGE raise the
  lapse to EVNT and alert/escalate caregivers (ADR-005 / EVNT ADR-006, EDGE api-contract §3.1).
