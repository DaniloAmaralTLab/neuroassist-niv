# 05 — State and Data Flow — gest (GEST)

## 1. State topology

| State | Owner | Shape | Notes |
|---|---|---|---|
| Camera / model / detection status | `detection` + `feature-station-runtime` facade | `signal<StationRuntimeVM>` | local to the station runtime. |
| Active command set | `data-access` `CatalogFacade` | `signal<ActiveCommandVM[]>` | **read-model of EDGE's offline cache**; `detectable` computed vs loaded model. |
| Current recognition | `feature-station-runtime` facade | `signal<RecognitionVM \| null>` | transient; cleared after report + debounce. |
| Report queue | `data-access` `ReportQueue` | durable store + `signal<ReportQueueVM>` | survives reload; `reportId`-keyed. |
| Diagnostics (caregiver) | `feature-station-status` | `computed<DiagnosticsVM>` | composes the above read-only. |
| Session / tenant | **ACS / EDGE** (not GEST) | — | station uses the `edge.device` token; GEST never holds a caregiver session. |

**Global vs local:** GEST holds no global app state. The only cross-module read is EDGE's cached
catalog (`CatalogReadPort`); the only cross-module write is the EVNT report. Everything else is
station-local signals.

## 2. Data access pattern

- **Egress (the one write):** `ClassifierService`/state-machine → facade `onRecognised` →
  `GESTURE_REPORT_PORT.report(cmd)` → `GestureReportHttpAdapter` → `HttpClient` POST to EVNT. RxJS at
  the edge only; the result is folded into the queue/status signals immediately.
- **Catalog read:** `CATALOG_READ_PORT` reads EDGE's offline cache (no PAT call at runtime); refreshed
  on bootstrap and on an EDGE "catalog updated" signal. No `BehaviorSubject` as source of truth.
- **Detection data:** frames flow webcam → Web Worker (`LandmarkWorker`) → `ClassifierService`;
  this path **never touches HTTP** and **never leaves the worker** except as a recognition event
  (`commandId` + confidence/window). Frames and landmark arrays are discarded each tick.

## 3. Cache strategy

- **Catalog:** GEST does not maintain its own catalog cache — it **reads EDGE's** (EDGE owns offline
  catalog sync, ADR-014/ADR-005 EDGE). GEST holds only an in-memory projection for the current session.
- **Model asset:** the landmark model + WASM are cached by the browser (HTTP cache / Cache Storage) so
  TTI is fast on warm start; cache is a performance concern, never correctness.
- **No recognition cache:** each recognition is a fresh capture-time fact; nothing about *when* a
  gesture happened is cached or recomputed.

## 4. Optimistic updates

- **None on the report path.** A gesture-report is **pessimistic**: the queue item is `sending` until
  EVNT confirms `201/200`; only then is it dequeued. A missed help request must never be hidden by an
  optimistic "sent" that didn't land — the opposite failure mode of a normal CRUD UI. There is no
  rollback because there is no optimistic state to roll back.

## 5. Error handling

| Failure | Mapping / behaviour |
|---|---|
| EVNT `ProblemDetail` (`400 validation-error`) | `AppError` via `@neuroassist/shared/error-model`; a malformed report is a bug → surfaced to diagnostics, not retried blindly. |
| `400 occurred-at-out-of-bounds` (> 24h / future skew) | queue item → `expired`; dropped; surfaced as "report expired, not delivered" (INV-GEST-5). |
| `401` (device revoked/unpaired) | stop reporting; surface **"station unpaired — re-pair in EDGE"**; do not retry a dead token. |
| `403` (token lacks `evnt.event.ingest`) | stop; surface a provisioning error; never loop. |
| `404 command-not-found` | the cached catalog drifted from PAT; drop the report, trigger an EDGE catalog refresh, surface the drift. |
| `503 catalog-unavailable` (`Retry-After`) | reschedule the queue item after the header delay (EVNT fail-closed). |
| Network offline / timeout | enqueue + backoff retry (golden path B). |
| Camera denied / model failed | detection `unavailable`; honest status; **no implied alarm**. |

All user-facing messages go through `@neuroassist/shared/ui-feedback`; observability records outcomes
via `@neuroassist/shared/observability` (never frames/landmarks).

## 6. Breadcrumbs and navigation state

GEST's only navigable surface is the caregiver **station-status** view; `libs/gest/navigation` feeds a
minimal `BreadcrumbItem[]` (e.g. `Station ▸ Detection status`). The runtime route (`/station/runtime`)
is a background host with no breadcrumb (the patient never navigates). Menu visibility for the status
surface is derived from `gest.permission-map.ts` (`gest.runtime.read` / `gest.diagnostics.read`) via
`AccessDecisionService` — never a hardcoded guard (learning `guard:stub-permissive`).
