# 02 — Architecture Blueprint — dash (DASH) Frontend

> Scope: the module's boundary, actors, flows and internal structure. No Angular code at this stage.

## 1. System boundary

DASH is a **frontend composition host** inside the caregiver shell `neuroassist-niv-web`. Its boundary is drawn
around *orchestration and presentation*, not data ownership:

- **Inside DASH:** the `/home` overview surface; the composite-status derivation; the per-source health model;
  the layout that embeds the composed modules' widgets; the inline advisory heuristic; routing to History /
  Calibration / active notices.
- **Outside DASH (consumed, never re-implemented):** history + audit (HIST), alarms + confirm/feedback + live
  projection (EVNT), device identity + connectivity (EDGE), patient + command catalog + calibration (PAT), the
  Access Layer (JWT, correlation id, `${ACCESS_HTTP_BASE}`), design tokens, error-model, ui-feedback.
- **Network:** DASH performs **no HTTP of its own at MVP**. Any server read exists only if the BE confirms a
  `dash-service` (pending, M1.5); until then DASH reads purely through the composed modules' facades. When present,
  that read goes through `@neuroassist/shared/access-http-base`, base `${ACCESS_HTTP_BASE}/dash`, never `/api/v1`.

## 2. External actors and systems

| Actor / system | Interaction with DASH |
|---|---|
| Caregiver browser (JWT via ACS) | Authenticated session; DASH is the home route after sign-in. Tenant + linked patient come from the JWT / shell context — DASH chooses neither. |
| `@neuroassist/hist` | `HistShellIntegrationService` (set active patient; read-only `historyEntries` / `historySummary` / `historyState`; `refreshAfterFeedback`) and `HistoryWidgetComponent` (read-only, gated `hist.history.read`). |
| `@neuroassist/evnt` | `AlarmFacade` (alarm / monitoring / routine-notice VMs, polling state), `PushChannelFacade`, `RoutineNoticeIndicatorComponent` / `RoutineNoticeListComponent`. Emergency takeover is EVNT's, above DASH. |
| `@neuroassist/edge` | `DeviceFacade` (`EdgeDeviceVM`, `DeviceStatusVM`, `DeviceConnectivity`), `DeviceStatusBadgeComponent`, `EdgeDeviceCardComponent`. |
| `@neuroassist/pat` | `PatientFacade` (`PatientRow`), `CommandFacade` (`CommandRow`) for the catalog summary; a route to the PAT calibration screen. |
| `dash-service` (BE) | **Pending BE decision** (M1.5). If it exists, a read/aggregation BFF behind `DASH_*_PORT`; if not, DASH stays FE-composition-only. DASH invents no endpoint meanwhile. |

## 3. End-to-end user flows

### 3.1 Golden path — "Is my patient OK?" (flow 4.6)

```
Caregiver signs in (ACS/JWT)
      │
      ▼
Shell routes to /home ──► DASH overview mounts
      │  shell supplies active patientId ──► HistShellIntegrationService.setActivePatient(id)
      ▼
DASH subscribes to composed signals (NO new query):
   HIST  summary + recent entries (read-only)
   EVNT  alarm/monitoring + routine notices + detection-lapse
   EDGE  device connectivity + liveness
   PAT   patient + command catalog summary
      │
      ▼
Composite status derivation (ADR-005)
   every source ok & clear ──────────────► "X is OK"  (calm/green)
   any source loading/unknown/error ─────► DEGRADED  ("Status unavailable — N panels could not load")
   EVNT routine notice / detection-lapse ─► NOTICE    (info/warning, never emergency styling)
   EVNT unconfirmed emergency ───────────► EVNT TAKES OVER (full-screen, above DASH)
      │
      ▼
Caregiver reads KPIs + recent events, routes to /history, /calibration, or an active notice
```

### 3.2 Edge case — a panel fails to load

```
EDGE device read fails ──► device panel renders ERROR (not "offline", not blank)
                      └──► composite headline = DEGRADED, never "X is OK"
HIST summary ok, EVNT ok, PAT ok ──► those panels render normally and are not blocked by EDGE's failure
```
Partial failure degrades the *headline* and flags the *failed panel*; healthy panels still render (progressive,
never all-or-nothing). This is the exact inverse of the prototype's empty-array "OK".

### 3.3 Edge case — "online but not detecting"

```
EDGE connectivity = online  AND  EVNT detection-lapse active
      ▼
Device panel shows "online"; overview shows a detection-lapse NOTICE ("connected, not detecting")
Headline = NOTICE/degraded, not "X is OK"  (the camera is up but the system is not watching)
```

### 3.4 Alternative — emergency arrives while on DASH

```
EVNT raises an unconfirmed emergency ──► EVNT full-screen alarm takes over the viewport
DASH does not render it, does not restyle itself as emergency, does not suppress it.
On acknowledge/resolve (EVNT), control returns to DASH, which re-derives its status.
```

## 4. Internal boundaries

DASH follows the project's promoted-module layout (bare-name lib, module-entry-as-library — ADR-006). Because DASH
is prototype-to-production (D-493) and **composition-first**, it is a thin host: most sub-libs are optional and it
owns no `data-access` unless a `dash-service` is confirmed.

```
frontend/libs/dash/                      # @neuroassist/dash — bare-name house convention
+-- src/index.ts                         # public API (routes, provideDash, DashboardFacade, contract)
+-- src/lib/
    +-- dash.routes.ts                    # DASH_ROUTES[] (/home; /entry NOT here — see doc 06 Q1)
    +-- dash.providers.ts                 # provideDash({ adapter }) — default 'http' ONLY if dash-service confirmed; else no port
    +-- dash.contract.ts                  # MODULE_KEY + menu metadata + permission map + feature flags
    +-- dashboard.facade.ts               # composes HIST/EVNT/EDGE/PAT signals -> per-source health + composite status (signals-first)
    +-- feature-overview/                 # the /home overview screen (promoted from screens/home), OnPush, standalone
    +-- integration/                      # DashShellIntegrationService (receive active patientId from shell; fan out to HIST/EVNT/EDGE/PAT seams)
    +-- api/ (ONLY if dash-service confirmed)   # DASH_*_PORT + http/mock adapters — pending BE, not created at vision stage
    +-- ui/ (optional)                    # dash-local presentational glue (status card shell, degraded banner)
```

Dependency direction: `feature-overview` → `dashboard.facade` → composed modules' **public ports/facades**; never
into another module's `lib/` internals. Nx tags enforce it (doc 04 §3).

## 5. Cross-cutting concerns

- **Auth / entitlement:** route guard via `@neuroassist/shared/access-decision`
  (`canActivate: [authGuard, dashGuard]`); the embedded HIST widget keeps its own `hist.history.read` gate; EVNT /
  EDGE / PAT surfaces keep their own authorities. DASH adds no permissive guard stub.
- **Tenant isolation:** tenant is a JWT claim resolved server-side; DASH never sends `X-Tenant-Id` and never scopes
  by a path/query tenant param. The active patient is supplied by the shell context, not chosen in DASH.
- **Observability:** `@neuroassist/shared/observability`; every composed read already carries the Access-Layer
  correlation id. The advisory decision (Confirm / Ignore) is recorded to the audit trail; no raw PII in telemetry.
- **Error / degraded presentation:** composed-module `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`)
  → caregiver copy (`@neuroassist/shared/ui-feedback`); a failed source yields an error/degraded panel, never a
  silent blank that could read as "clear" (ADR-005, doc 05 §5).
- **Design system / i18n:** tokens from `@neuroassist/shared/ui-tokens` (dark default); English-only (ADR-018).
