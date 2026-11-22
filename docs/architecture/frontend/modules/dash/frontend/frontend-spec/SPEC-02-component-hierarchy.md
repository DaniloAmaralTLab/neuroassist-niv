# SPEC-02 — Component Hierarchy — dash (DASH) Frontend

> Smart components inject `DashboardFacade` and read its `computed` signals; presentational panels receive
> inputs and emit outputs; **embedded panels are the composed modules' own exported components**, rendered
> verbatim (ADR-005 §1). No EARS here (component trees are prose). No Angular code generated at this stage.

## 1. `feature-overview` tree

```
OverviewPageComponent                       (smart — injects DashboardFacade)
│   reads signals: overview(), kpis(), sources(), headline(), degradedReason(),
│                  deviceHealth(), notices(), catalog(), suggestion()
│
├── OverviewHeadlineComponent               (presentational)
│     @Input overview: OverviewVM            → the "Is my patient OK?" headline + lastCheckAt
│     renders: all_clear | degraded | notice   (NEVER emergency — EVNT owns the takeover, INV-3)
│     emits:  (refresh)
│
├── KpiRowComponent                          (presentational)
│     @Input kpis: KpiVM                      → eventsToday | confirmedToday | pendingToday
│     renders "—" (not 0) for any null KPI (INV-4)
│
├── DetectionLapseNoticeComponent            (presentational — DASH)
│     @Input lapse: NoticeVM | null           → "online but not detecting" (amber notice, never emergency)
│     renders EVNT's open-lapse signal (via INT-DASH-1); no state of its own
│
├── SuggestionCardComponent                  (presentational — flag dash.suggestion.enabled)
│     @Input suggestion: SuggestionVM | null
│     emits:  (confirm) (ignore)              → dismiss + audit log only; inert (INV-5)
│
├── ── embedded module surfaces (rendered verbatim, their own components) ──
│   ├── EVNT  RoutineNoticeListComponent / RoutineNoticeIndicatorComponent   (routine notices)
│   ├── EDGE  EdgeDeviceCardComponent  (+ DeviceStatusBadgeComponent in the header)
│   └── HIST  HistoryWidgetComponent    (read-only recent-events preview)
│
└── CatalogSummaryComponent                  (presentational — DASH)
      @Input catalog: CatalogSummaryVM        → command label + urgency badge per command
      renders a "Manage catalog" link to PAT /calibration (outbound, SPEC-01 §2)
```

### Smart component — `OverviewPageComponent`

The **only** smart component. It injects `DashboardFacade` and reads its read-only signals; it owns no
HTTP, no store and no timers. It wires the embedded modules' components to the facade's composed view
(e.g. passes the HIST read-only slice to `HistoryWidgetComponent`, the EDGE `DeviceStatusVM` to
`EdgeDeviceCardComponent`). On `(refresh)` it calls `DashboardFacade.refresh()`.

## 2. Embedded-surface rule

The **device**, **routine-notice** and **recent-events** regions are **not re-implemented** by DASH: they
are the exported components of EDGE / EVNT / HIST, imported through each module's `index.ts` and placed by
`OverviewPageComponent`. DASH adds only the thin presentational wrappers it owns (headline, KPI row,
detection-lapse notice, suggestion card, catalog summary). This is what keeps "composition over re-query"
(ADR-005) mechanically true and prevents a second drifting source of truth.

## 3. Signals each smart component reads (explicit, ADR-005 / doc 04 §6)

| Component | Signals read (all from `DashboardFacade`) |
|---|---|
| `OverviewPageComponent` | `overview()`, `headline()`, `degradedReason()`, `kpis()`, `sources()`, `deviceHealth()`, `notices()`, `detectionLapse()`, `catalog()`, `suggestion()` |

`DashboardFacade` is the single aggregator; no component reads a composed module's facade directly except
through the components that module exports (the embedded surfaces).
