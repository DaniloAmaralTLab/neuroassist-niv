# SPEC-04 — Data Access — dash (DASH) Frontend

> DASH reads **only** through the composed modules' published `index.ts` seams (ADR-005 §1, doc 04 §3);
> it adds **no `HttpClient`** and **no `libs/dash/api/*`** at MVP (BE ADR-001: DASH has no backend, no
> `/dash/**` route, no `dash.*` authority). Any datum a panel needs that a lib does not yet expose becomes
> an **INT item** (§4) — a new export to ADD to the owning lib — never a direct HTTP call from `libs/dash`.
> Authorities equal the owning modules' BE authorities (verified in each lib's guards/contract).

## 1. Composition — panel → lib public API → component → authority (master table)

| # | Panel (region on `/home`) | Lib public API consumed (`index.ts`) | Rendered via | Owning-module BE authority |
|---|---|---|---|---|
| 1 | Composite status headline (`OverviewVM`) | derived in `DashboardFacade` over the four sources below + EVNT open-lapse (INT-DASH-1) | `OverviewHeadlineComponent` (DASH) | union of 2–5 (each source self-gates) |
| 2 | Day KPIs (`KpiVM`) | HIST `HistShellIntegrationService.historySummary` → `PeriodSummaryVM` | `KpiRowComponent` (DASH) | `hist.history.read` |
| 3 | Recent-events preview | HIST `HistoryWidgetComponent` (read-only) + `HistShellIntegrationService.historyEntries` | `HistoryWidgetComponent` (HIST) | `hist.history.read` |
| 4 | Device-health panel (`DeviceHealthVM`) | EDGE `DeviceFacade.statusVm()` / `EdgeDeviceVM`, `DeviceStatusVM` | `EdgeDeviceCardComponent` / `DeviceStatusBadgeComponent` (EDGE) | `edge.device.read` |
| 5 | Alarm / monitoring status (non-takeover) | EVNT `AlarmFacade` → `AlarmVM`, `MonitoringVM` (`PollingState`, `lastPolledAt`, `pollIntervalSeconds`) | DASH reads signals; EVNT owns the takeover | `evnt.event.read` |
| 6 | Routine-notice panel | EVNT `RoutineNoticeListComponent` / `RoutineNoticeIndicatorComponent` (+ `AlarmFacade` `RoutineNoticeVM`) | EVNT components (verbatim) | `evnt.event.read` |
| 7 | "Online but not detecting" notice | EDGE `DeviceFacade` (connectivity online) + EVNT **open-detection-lapse** signal (**INT-DASH-1**) | `DetectionLapseNoticeComponent` (DASH) | `evnt.event.read` (+ `edge.device.read`) |
| 8 | Command-catalog summary (`CatalogSummaryVM`) | PAT `CommandFacade` → `CommandRow[]` | `CatalogSummaryComponent` (DASH) + `/calibration` link | `pat.command.read` |
| 9 | Patient-identity header (`patientName`) | PAT `PatientFacade` / shell context | `OverviewHeadlineComponent` (DASH) | shell-provided (INV-6); DASH adds no own authority |
| 10 | Inline advisory (`SuggestionVM`) | DASH-local heuristic over the HIST entries already read (panel 3) | `SuggestionCardComponent` (DASH) | data via `hist.history.read`; gated by flag `dash.suggestion.enabled` |

> **Authority union = {`hist.history.read`, `evnt.event.read`, `evnt.detection-lapse.read`, `edge.device.read`, `pat.command.read`}**
> (SPEC-05 §2). No `dash.*` authority exists. `evnt.event.confirm` / `evnt.event.record` (writes) and
> `evnt.subscription.create` (push setup) are **not** DASH surfaces: DASH binds **zero** write endpoints
> (INV-2); any confirm/feedback the caregiver reaches is EVNT's own path, surfaced by EVNT.

## 2. Master resource table (composition, not HTTP)

| Resource | "Endpoint" (owner-internal, not called by DASH) | Service/Facade consumed | Operations (read-only) | Cache? |
|---|---|---|---|---|
| Day summary / history | `GET /hist/patients/{id}/history` (HIST-owned) | `HistShellIntegrationService` / `HistoryFacade` | `historySummary`, `historyEntries`, `refresh` | HIST's in-memory window |
| Device | `GET /edge/devices/{id}` (EDGE-owned) | `DeviceFacade` | `statusVm`, `loadForPatient` | EDGE's last load |
| Active alarm / monitoring | `GET /evnt/patients/{id}/active-alarm` (EVNT-owned, polled) | `AlarmFacade` | `alarmVm`, `monitoringVm`, routine notices | EVNT live projection |
| Detection lapse (OPEN) | EVNT lapse read (EVNT-owned, **INT-DASH-1**) | EVNT open-lapse signal (to be added) | read-only | EVNT live projection |
| Command catalog | `GET /pat/patients/{id}/commands` (PAT-owned) | `CommandFacade` | `commandRows` | PAT's last load |

DASH itself has **no row** in this table — it owns no resource.

## 3. Read / refresh behaviour

- `DashboardFacade` injects the composed facades / integration services and reads their signals; it injects
  **no `HttpClient`**. It re-derives the composite status reactively whenever any composed signal changes and
  adds **no polling of its own** (EVNT owns the only poll loop).
- A caregiver **refresh** asks each composed facade to re-read (HIST `refresh`, EDGE/PAT re-load) and
  re-derives the status. No optimistic layer (DASH writes nothing — doc 05 §4).
- **If a `dash-service` is ever confirmed by BE** (ADR-001 revisit trigger): a single `DASH_OVERVIEW_PORT`
  with `DashHttpAdapter` (`${ACCESS_HTTP_BASE}/dash`, default `http`, mock behind a flag — carry-forward
  `scaffold:mock-adapter-default`; never `/api/v1`) is added behind the facade, and prospective `dash.*`
  authorities equal the BE authorities once published. Not implemented at this stage.

## 4. INT items — exports to ADD to the owning libs (do not call their HTTP from DASH)

| INT id | Needed by | Owning lib | Export to ADD | Why it cannot be read today | Authority (unchanged) |
|---|---|---|---|---|---|
| **INT-DASH-1** | panels 1 & 7 ("online but not detecting"; headline `notice`) | **EVNT** (`@neuroassist/evnt` `index.ts`) — **already planned: `LapseAlertFacade` FE-EVNT-027/028 (authority `evnt.detection-lapse.read`) + EDGE detection fields FE-EDGE-028/029; DASH depends on them, no parallel export** | an **open-detection-lapse** read-only signal/VM — e.g. `AlarmFacade.openDetectionLapses: Signal<DetectionLapseVM[]>` plus `detectionState: Signal<'running' \| 'lapsed' \| 'unknown'>`, fed by EVNT's detection-lapse read (BE EVNT ADR-006) | EVNT's `index.ts` exports `AlarmFacade` + `RoutineNotice*Component` but **no open-lapse signal** (verified: no `lapse` symbol in `libs/evnt/src`); the lapse exists only as a **historical** `DetectionLapseStarted` entry in HIST, not as a live OPEN-state read | `evnt.event.read` (EVNT owns it) |
| **INT-DASH-2** *(optional, nice-to-have)* | panel 2 (HIST freshness) | **HIST** (`@neuroassist/hist` `index.ts`) | expose a `loadedAt: string` on `PeriodSummaryVM` (or a `summaryLoadedAt` signal) so DASH reads an upstream read-time instead of tracking its own tick | HIST exposes `summary` but no read timestamp; DASH currently tracks `histReadAt` locally (SPEC-03 §3) | `hist.history.read` (unchanged) |

**Stopgap until INT-DASH-1 lands** (recorded for the backlog): DASH may derive a *degraded* "cannot confirm
detection" headline from an **open** `DetectionLapseStarted`-without-`DetectionLapseResolved` entry in the
HIST timeline (`hist.history.read`) — but the **canonical owner of the live OPEN-lapse state is EVNT**, so
INT-DASH-1 is the target and the stopgap is explicitly a degraded, not an `all_clear`, path.

## Acceptance criteria (EARS)

- THE SYSTEM SHALL compose the home overview only from the published index exports of `hist`, `evnt`, `edge` and `pat` and SHALL NOT add an HTTP adapter in `libs/dash`.
- WHILE the EVNT monitoring poll is `live` and its last poll is within twice the server-advertised poll interval, THE SYSTEM SHALL treat the alarm source as fresh.
- IF the EVNT alarm poll is stale or offline beyond twice the server-advertised poll interval, THEN THE SYSTEM SHALL mark the alarm source `stale` and SHALL degrade the headline.
- IF the EDGE last heartbeat is older than twice the thirty-second heartbeat cadence, THEN THE SYSTEM SHALL mark the device source `stale` and SHALL NOT show `all_clear`.
- IF the HIST summary read is older than the sixty-second summary freshness window, THEN THE SYSTEM SHALL mark the history source `stale`.
- WHEN the caregiver refreshes the overview, THE SYSTEM SHALL ask each composed facade to re-read and SHALL re-derive the composite status.
