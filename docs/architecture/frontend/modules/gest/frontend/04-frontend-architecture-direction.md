# 04 — Frontend Architecture Direction — gest (GEST)

## 1. Stack

- **Angular 21**, **Nx 22.x**, **TypeScript strict**.
- **RxJS 7.8 + Signals** (Signals for runtime/VM state; RxJS only at the HTTP edge and for the frame
  stream pump). The per-frame detection loop runs off `requestAnimationFrame`, **not** `setInterval`.
- **On-device inference engine:** in-browser facial-landmark model (MediaPipe FaceLandmarker / TF.js)
  as a local WASM + model asset bundle — selected in **ADR-005 local**; a **Web Worker** isolates
  landmark extraction + classification from the UI thread (no jank, no main-thread video processing).
- **Design system:** Angular **CDK** primitives (no `@angular/material`) + **Tailwind v4** oklch
  tokens via `@neuroassist/shared/ui-tokens` (dark default) — applies only to the thin status surface.
- **Tests:** Jest (unit; classifier/state-machine/queue), Playwright (`apps/gest-e2e`) with a
  **fake `getUserMedia`** and a **stub classifier** (deterministic recognition; no real model in CI).
- **English-only** (ADR-018) — no i18n framework.

## 2. App boundary

`apps/gest/` is a thin host; its `app.routes.ts` does only
`loadChildren: () => import('@neuroassist/gest').then(m => m.GestModule)`. The real entry is the
module-as-library `libs/gest` with importPath **`@neuroassist/gest`** (shared ADR-006). The **station
/ Patient-Mode shell** mounts GEST by importing `@neuroassist/gest` and populating `MODULE_DESCRIPTORS`
with `GEST_MODULE_DESCRIPTOR`. **Which shell hosts Patient Mode (and co-mounts CONV) is an open
dependency (doc 06 G1)** — it is not GEST's to decide; GEST exposes a clean descriptor + bootstrap.

## 3. Library organization (Nx tags)

| Library | `type:` | Purpose |
|---|---|---|
| `libs/gest` (entry) | `type:app` | module + contract + routes + permission-map + feature-flags + bootstrap + nav.config + descriptor + `provideGest`. |
| `libs/gest/access` | `type:domain` | `canReadRuntimeGuard`, `canControlRuntimeGuard` (consume `AccessDecisionService`). |
| `libs/gest/detection` | `type:domain` | `CameraService` (getUserMedia lifecycle), `LandmarkWorker` seam, `ClassifierService`, `CompoundGestureStateMachine`, `sensitivity→threshold` map, `reportId` minting. Pure/testable; no HTTP. |
| `libs/gest/data-access` | `type:data-access` | `GESTURE_REPORT_PORT` + Http/Mock adapters + `ReportQueue` (durable) + `RetryScheduler` + `CatalogReadPort` (EDGE cache) + signal facades + `<X>Wire` mappers. |
| `libs/gest/feature-station-runtime` | `type:feature` | hosts the detection loop + optional operator camera preview; wires detection → facade → report. |
| `libs/gest/feature-station-status` | `type:feature` | caregiver diagnostics/status surface (camera · model · loop · queue). |
| `libs/gest/integration` | `type:domain` | `GestShellIntegrationService`. |
| `libs/gest/navigation` | `type:domain` | breadcrumb / menu state. |
| `libs/gest/ui` (optional) | `type:ui` | `StationStatusBadge`, `CameraPermissionPrompt` (presentational). |

Boundary: `scope:gest` → `scope:gest` + `scope:shared` only (`nx-boundaries.md`).

## 4. Hub / shared library dependencies

`@neuroassist/shared/{access-decision, access-http-base, contracts, ui-components, ui-feedback,
ui-tokens, observability, error-model}`. **Note:** GEST depends on `access-decision` for the caregiver
diagnostics surface, but the **station runtime auth is the `edge.device` token** (from EDGE), *not*
`shared/auth-session`. Direction per `nx-boundaries.md`: `data-access` → `contracts` +
`access-http-base` + `error-model`; `access` → `access-decision`; `detection` → `contracts` only;
`ui` → `shared/ui-*`; `feature` → the module's own libs + `shared/*`.

## 5. Routing strategy

- Station/Patient-Mode shell → `@neuroassist/gest` via `loadChildren` (`GEST_ROUTES`).
- Sub-routes via `loadComponent` (lazy per feature):
  - `/station/runtime` → `feature-station-runtime`, `canActivate: [stationIdentityGuard]`
    (the `edge.device` identity, not a caregiver guard).
  - `/station/status` → `feature-station-status`,
    `canActivate: [canReadRuntimeGuard]` (`gest.runtime.read` via `AccessDecisionService`).
- Menu/visibility for the diagnostics surface derived by `NavigationService` from
  `gest.permission-map.ts`.

## 6. State strategy

- **Signals-first** in each facade: private `signal<T>()` + public `.asReadonly()`; derived state via
  `computed()` (e.g. `detectable`, `queueDepth`, `isRunning`). **No NgRx, no manual `BehaviorSubject`**
  as a source of truth. RxJS only wraps `HttpClient` and the frame pump, converted to signals in the
  facade.
- The **detection worker** owns the hot path off the main thread and posts recognitions back; the
  facade translates them to a `signal<RecognitionVM>` and triggers the report port.
- The **ReportQueue** is durable (survives reload — a dropped report is a missed help request);
  its persisted state is `reportId`-keyed, never video.

## 7. Module contract strategy (`gest.contract.ts`)

```
MODULE_KEY = 'gest'
ModuleMenuMetadata: { title: 'Station Detection', icon: 'sensors', order, section: 'care' }
permissions: ['gest.runtime.read', 'gest.runtime.control', 'gest.diagnostics.read']
featureFlags: { compoundGestures:  { defaultState: true },   // primary+secondary primitive window
                operatorPreview:   { defaultState: true },   // show the live camera to the operator
                offlineQueue:      { defaultState: true } }  // durable queue + retry
```

Permissions are consumed by `AccessDecisionService` and mirror the BE authority scheme
`gest.<resource>.<action>` with the **canonical English vocabulary (D-639): reads use `.read`**, never
`.view`/`.edit`. The station runtime itself is authorised by the `edge.device` identity (ACS ADR-012:
patient-session/device tokens carry no caregiver management authority), so a caregiver `gest.*`
authority never drives the detection loop — only the diagnostics surface.

## 8. Ports & adapters (`provideGest`)

```
provideGest({ adapter: 'http' | 'mock' })   // DEFAULT 'http' — evnt-service exists (report target)
  GESTURE_REPORT_PORT → GestureReportHttpAdapter | GestureReportMockAdapter
  CATALOG_READ_PORT   → EdgeCatalogCacheAdapter  | CatalogMockAdapter   (reads EDGE's offline cache)
```

`GestureReportHttpAdapter` posts `POST ${ACCESS_HTTP_BASE}/evnt/gesture-reports`, attaches the
**`edge.device`** bearer (device-token interceptor variant), types the body as `GestureReportWire`
mirroring the Java record, and maps `201|200` responses via `toEvent`. The `MockAdapter` serves the
same wire shape through the same mappers. A **providers spec must prove the default resolves to the
HTTP adapter** (carry-forward learning `scaffold:mock-adapter-default`, 7 prior occurrences). The
on-device landmark engine is **not** a port adapter — it is `libs/gest/detection`, loaded locally,
never a network dependency.
