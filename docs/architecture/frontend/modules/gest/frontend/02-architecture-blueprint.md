# 02 — Architecture Blueprint — gest (GEST) Frontend

## 1. System boundary

The GEST frontend is the **on-device detection runtime** of the patient station. Its network
boundary is deliberately tiny: it is a **client of `evnt-service`** (device path) through the API
gateway for exactly one call — `POST /evnt/gesture-reports` — and a **reader of EDGE's offline
command catalog** for the commands it classifies against. It **never** streams video or landmarks
anywhere, never calls PAT/HIST/DASH directly, and never renders alarms. It authenticates with the
station's **`edge.device`** token (minted by EDGE, ADR-014), **not** a caregiver ACS JWT — so GEST's
HTTP egress uses the device-token interceptor, distinct from the caregiver `access-http-base` bearer.

## 2. External actors and systems

- **Patient (station user)** — observed by the webcam; never operates a UI.
- **Webcam (`getUserMedia`)** — the only sensor; its stream is confined to the detection worker and
  the optional operator preview; stopped on teardown; **never uploaded**.
- **In-browser landmark engine** (MediaPipe FaceLandmarker / TF.js, local WASM + model asset) —
  runs entirely on-device (ADR-005 local).
- **`evnt-service` (BE, device path)** — reached through the gateway; validates the `edge.device`
  token against EDGE JWKS + introspection; consumes `evnt.event.ingest` (EVNT api-contract §2.1).
- **EDGE** — supplies the `edge.device` token and the **offline command catalog cache**; owns device
  online/offline liveness. GEST consumes, never mints.
- **ACS** — issuer of the `gest.*` caregiver authorities the diagnostics surface guards consume.
- **Caregiver (monitor)** — reads the station status / diagnostics surface (gated by `gest.*`).

No third-party widget is embedded; no analytics SDK sees video.

## 3. End-to-end user flows

### Golden path A — Recognise a command and report it (online)

```
Patient station (Patient Mode) — detection running
  Webcam frame ──▶ LandmarkWorker (landmarks, on-device) ──▶ ClassifierService
        │                                                         │
        │                       active command (from EDGE cache)  │
        ▼                                                         ▼
  Compound-gesture state machine:  idle → primaryHeld → awaitingSecondary → recognised
        │  (within [minGestureDurationMs, maxGestureDurationMs], confidence ≥ threshold(sensitivity))
        ▼
  GestureFacade.onRecognised(command)
        │  mint reportId (station-unique, idempotent)  ·  occurredAt = now
        ▼
  GestureReportPort.report({ commandId, reportId, occurredAt, confidence, recognitionWindowMs })
        │  POST ${ACCESS_HTTP_BASE}/evnt/gesture-reports   (Bearer edge.device)
        ▼
  201 Created → EVNT raises the alarm (EVNT owns it)  ·  debounce re-arms the loop
```

### Golden path B — Recognise while offline (queue + retry)

```
onRecognised → GestureReportPort → network error / offline
        ▼
  ReportQueue.enqueue({ reportId, commandId, occurredAt, ... })   (durable, per station)
        ▼
  RetryScheduler (backoff): on reconnect / timer →
        ├─ occurredAt within 24h & not future-skewed  → POST → 201|200(replay) → dequeue
        ├─ 503 catalog-unavailable (Retry-After)       → reschedule after header delay
        └─ occurredAt older than 24h (400 out-of-bounds)→ drop + surface "expired, not delivered"
  Status surface shows: pending N · last sent · last error · next retry in …
```

### Golden path C — Caregiver verifies the station is detecting

```
Caregiver → station status surface  (canReadRuntime guard: gest.runtime.read)
  Camera:    granted ✓        Model:     ready ✓
  Detection: running (12 fps)  Active cmd: "Help" (eyebrow raise 2×)
  Last recognised: 08:14:03    Queue:     0 pending
  (EDGE's connectivity badge sits alongside — GEST never recomputes online/offline)
```

### Edge cases

- **Camera permission denied / no device** → detection `unavailable`; status says so; **no alarm is
  implied** (absence of detection is shown, never faked as "watching").
- **Model fails to load** → `model:failed`; detection cannot start; honest error + retry.
- **Unsupported gesture-type** in a command (naming ≠ support) → command flagged **"not yet
  detectable"**; GEST does not classify it and surfaces the gap (PAT ADR-005 hazard answered here).
- **Compound gesture, secondary never arrives** before `maxGestureDurationMs` → window resets to
  `idle`; no partial report (LBC §12 false-negative risk owned here).
- **Duplicate/jittery recognition** → debounce + idempotent `reportId` → at most one event.
- **Tab backgrounded / device sleeps** → rAF throttling can stall the loop (safety risk R1);
  surfaced as a diagnostics warning and mitigated per ADR-005 (wake-lock / visibility handling).
- **403 on report** (token lacks `evnt.event.ingest`) / **401** (revoked/unpaired device) → stop
  reporting, surface "station unpaired — re-pair in EDGE"; never silently retry a forbidden token.

## 4. Internal boundaries (Nx libraries — module-as-library, ADR-006)

```
apps/gest/                                  # thin host (type:app, scope:gest) — mounted by the
└── src/app/app.routes.ts                   #   patient/station shell in "Patient Mode" (host TBD, §06 G1)
                                            #   loadChildren → @neuroassist/gest

libs/gest/   (scope:gest)                   # module-as-library; importPath @neuroassist/gest (ADR-006)
└── src/lib/
    ├── gest.module.ts                       # the only NgModule (lazy entry)
    ├── gest.contract.ts                     # MODULE_KEY + ModuleMenuMetadata + permissions + flags
    ├── gest.bootstrap.ts                    # init/destroy: start/stop the runtime lifecycle
    ├── gest.routes.ts                       # GEST_ROUTES[] (station runtime + status surface)
    ├── gest.permission-map.ts               # ModulePermissionMap (gest.*)
    ├── gest.feature-flags.ts                # ModuleFeatureFlags (defaultState)
    ├── gest.nav.config.ts                   # navigation / breadcrumb (diagnostics surface)
    ├── gest.descriptor.ts                   # GEST_MODULE_DESCRIPTOR (consumed by the Shell)
    ├── gest.providers.ts                    # provideGest({ adapter }) — default 'http'
    ├── access/           (type:domain)      # canReadRuntimeGuard / canControlRuntimeGuard
    │                                        #   (AccessDecisionService — never hardcoded true)
    ├── data-access/      (type:data-access) # GESTURE_REPORT_PORT + Http/Mock adapters + ReportQueue
    │                                        #   + RetryScheduler + CatalogReadPort (EDGE cache) + facades
    ├── detection/        (type:domain)      # LandmarkWorker seam, ClassifierService,
    │                                        #   CompoundGestureStateMachine, threshold/sensitivity map,
    │                                        #   CameraService (getUserMedia lifecycle), reportId minting
    ├── feature-station-runtime/ (type:feature) # the detection runtime host + optional operator preview
    ├── feature-station-status/  (type:feature) # diagnostics/status surface (camera/model/loop/queue)
    ├── integration/      (type:domain)      # GestShellIntegrationService
    ├── navigation/       (type:domain)      # breadcrumbs state
    └── ui/ (optional)    (type:ui)          # gest-local presentational (StatusBadge, PermissionPrompt)

apps/gest-e2e/                              # Playwright specs (fake getUserMedia + stub classifier)
```

Tags: `scope:gest` + `type:{feature|data-access|domain|ui|app}`. A `scope:gest` lib may import only
`scope:gest` + `scope:shared` (`nx-boundaries.md`). The station/Patient-Mode shell imports
`@neuroassist/gest` via `GEST_MODULE_DESCRIPTOR`.

## 5. Cross-cutting concerns

| Concern | How GEST handles it |
|---|---|
| **Station identity / AuthN** | `edge.device` token from **EDGE** (ADR-014) — **not** a caregiver JWT. GEST's report adapter attaches the device bearer; it does not use the caregiver `auth-session`. |
| **AuthZ / RBAC (caregiver surfaces)** | `@neuroassist/shared/access-decision` — `AccessDecisionService.can('gest.runtime.read' \| 'gest.runtime.control' \| 'gest.diagnostics.read')`; guards consume its output (no hardcoded guard). |
| **HTTP** | `@neuroassist/shared/access-http-base` interceptors (correlation + error-normalize) with a **device-token** auth variant; base `${ACCESS_HTTP_BASE}/evnt` for the one report call. |
| **Catalog** | read from **EDGE's** offline cache (`CatalogReadPort`); GEST never calls PAT at runtime. |
| **Errors** | EVNT `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`); runtime faults (camera/model) → in-module honest states, surfaced via `@neuroassist/shared/ui-feedback`. |
| **Observability** | `@neuroassist/shared/observability` — recognition latency, loop fps, report outcome, queue depth; **never logs frames/landmarks**; never `console.log`. |
| **Privacy** | video + landmarks confined to the detection worker; discarded per-frame; **only `commandId` + non-identifying metadata egresses** (ADR-005 local). |
| **Design tokens** | Tailwind v4 oklch tokens via `@neuroassist/shared/ui-tokens`; dark default; CDK primitives (no Material) — applies only to the thin diagnostics surface. |
| **i18n** | None — English-only (ADR-018). |
