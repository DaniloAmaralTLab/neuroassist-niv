# SPEC-02 — Component Hierarchy — gest (GEST) Frontend

> Standalone-first, OnPush mandatory. Smart components consume the facades (`RuntimeFacade`,
> `ReportFacade`, `CatalogFacade`) as signals; presentational components receive `input()`s and emit
> `output()`s and hold no `HttpClient`, no worker handle, no camera stream. The hot path (frames →
> landmarks → classification) lives in a **Web Worker** inside `libs/gest/detection`, never in a
> component. Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/03-domain-framing-frontend.md` §2,
> `frontend/04-frontend-architecture-direction.md` §3. SPEC-02 is prose (no EARS section).

## 1. `feature-station-runtime` (the near-headless detection host · route /station/runtime)

```
StationRuntimePageComponent            (smart · OnPush)   route /station/runtime
│  reads:  runtimeFacade.runtimeVm()        Signal<StationRuntimeVM>   (camera/model/detection/fps)
│          catalogFacade.activeCommandsVm()  Signal<ActiveCommandVM[]> (detectable gate computed)
│          reportFacade.queueVm()           Signal<ReportQueueVM>
│  owns:   the WakeLockService acquire/re-acquire lifecycle (SPEC-09); visibilitychange handling
│  does NOT: hold the camera stream, the worker, or HttpClient (all in libs/gest/detection + data-access)
├── OperatorPreviewComponent           (presentational)   input: stream: MediaStream | null; visible
│     (optional live camera preview for the operator; gated by the operatorPreview feature flag;
│      the preview is a <video> bound to the SAME stream the worker reads — never a second capture)
├── DetectionPausedOverlayComponent     (presentational)   input: paused: boolean; reason
│     (always-visible honest "detection paused / degraded" overlay — SPEC-09; never a faked watching)
└── StationIdentityNoticeComponent      (presentational)   input: unpaired: boolean
      (the "station unpaired — re-pair in EDGE" state on 401/unpaired — SPEC-07)
```

The runtime component is a thin host: it wires `detection` (worker recognitions) → `ReportFacade`
(enqueue/report) and renders only honest status overlays. It never classifies on the main thread and
never renders an alarm (EVNT owns the alarm).

## 2. `feature-station-status` (the on-station diagnostics surface · route /station/status)

```
StationStatusPageComponent             (smart · OnPush)   route /station/status
│  reads:  runtimeFacade.runtimeVm()        Signal<StationRuntimeVM>
│          catalogFacade.activeCommandsVm()  Signal<ActiveCommandVM[]>
│          reportFacade.queueVm()           Signal<ReportQueueVM>
│          computed diagnosticsVm()         Signal<DiagnosticsVM>   (composes the three read-only)
├── DetectionStatusPanelComponent      (presentational)   input: vm: DiagnosticsVM
│   ├── CameraStateChip                 (presentational)   input: camera  (idle/requesting/granted/denied/no-device)
│   ├── ModelStateChip                  (presentational)   input: model   (loading/ready/failed)
│   ├── DetectionStateChip              (presentational)   input: detection; fps  (running/stopped/unavailable/degraded)
│   └── LastRecognitionLine             (presentational)   input: lastRecognition: RecognitionVM | null
├── ActiveCommandListComponent         (presentational)   input: commands: ActiveCommandVM[]
│     └── DetectableBadgeComponent      (presentational)   input: detectable: boolean; supportStatus
│           (renders "not yet detectable" for a command whose primitives fail the support-check gate —
│            INV-GEST-7; a non-detectable command is visibly marked, never silently armed)
└── ReportQueuePanelComponent          (presentational)   input: vm: ReportQueueVM
      (pending N · last sent · last error · next retry in … · expired items — SPEC-04)
```

## 3. `libs/gest/detection` (`type:domain`) — the on-device hot path (no component)

```
CameraService          getUserMedia lifecycle: idle → requesting → granted | denied | no-device; stop on teardown
LandmarkWorker (seam)  Web Worker: frame → facial landmarks (MediaPipe / TF.js, ADR-005 local); frames discarded per tick
ClassifierService      landmark feature → multi-class score of the active command's primitive(s); never on main thread
CompoundGestureStateMachine   idle → primaryHeld → awaitingSecondary → recognised (INV-GEST-2)
sensitivityThreshold()  maps Command.sensitivity (low|medium|high) → confidence threshold (INV-GEST-3)
reportIdMinter()        station-unique idempotent reportId, minted once per recognition (INV-GEST-1)
```

`detection` is pure/testable and holds **no** `HttpClient`. Its only output across the worker
boundary is a recognition event `{ commandId, confidence, recognitionWindowMs }` — never a frame or a
landmark array (INV-GEST-4, privacy; see SPEC-09).

## 4. Component rules (all features)

- Every component is `standalone: true`, `changeDetection: OnPush`.
- No component imports `HttpClient`, holds the `MediaStream`, or posts to the worker directly — camera
  and worker live in `libs/gest/detection`; server access is through the facades (SPEC-04).
- No component evaluates a role or a `gest.*` authority inline — the runtime/status routes are gated
  by the **station identity** (`stationIdentityGuard`), not a caregiver authority (SPEC-01, SPEC-05).
- No component synthesises a "watching" state: detection is `running` only when the loop is actually
  producing frames; a denied camera / failed model / paused tab renders `unavailable` / `paused`
  (INV-GEST-6, carry-forward `edge:fe-infers-liveness`).
- Presentational components are pure: inputs in, outputs out, no injected facade, no worker.
- Accessibility carry-forwards: the "detection paused / degraded" overlay is an ARIA live region
  announced on state change (`fe-component:a11y-live-region`); "next retry in N" renders via a
  relative-time pipe, never `toFixed` (`fe-component:kpi-decimal-format`).
- Styling via Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`); dark is
  default; no hardcoded colour/spacing (see `contracts/design-tokens.md`).
