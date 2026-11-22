# SPEC-02 — Component Hierarchy — hist (HIST) Frontend

> Component trees are **structure** (prose/ASCII), not EARS behaviour (ears-notation standard). Smart
> components consume `HistoryFacade`; presentational components receive inputs and emit outputs only. All
> components are **standalone** + **OnPush** (doc 01 §6). The production surface is the **promoted BA
> prototype** `screens/history/history.component.ts` (D-493 prototype-to-production) decomposed into the
> libs below; the escalation/detection-lapse trail is a **new** surface with no prototype parity (doc 06 R4).

## 1. `feature-history/` (`frontend/libs/hist/feature-history`, `type:feature`)

```
HistoryPageComponent                         [smart] — /history page shell
  reads signals: vm()=historyPageVm(), period()=facade.period, summary()=facade.periodSummaryVm()
  injects: HistoryFacade, AccessDecisionService (for the delegated-feedback affordance capability)
  │
  ├─ PeriodFilterTabsComponent               [presentational]
  │     @Input() period: PeriodFilter ('today'|'week'|'month')
  │     @Output() selectPeriod: EventEmitter<PeriodFilter>
  │        (prototype FilterTabs; 'month' replaces prototype 'mes')
  │
  ├─ @if loading()  → HistoryListSkeletonComponent        [presentational]  (reserved rows, CLS<0.1)
  ├─ @if empty()    → HistoryEmptyStateComponent          [presentational]  ("No events in this period.")
  ├─ @if error()    → HistoryErrorBannerComponent         [presentational]  (degraded, stale, Retry)
  ├─ @else (list)   → HistoryTimelineComponent            [presentational]
  │        @Input() entries: HistoryEntryVM[]
  │        @Output() markFeedback: EventEmitter<{ entryId: string; verdict: 'real'|'false_positive' }>
  │        │
  │        ├─ HistoryEventRowComponent        [presentational]  (kind='event' — command label + urgency badge + confirmation line)
  │        │     @Input() entry; @Input() canRecordFeedback: boolean
  │        │     @Output() markFeedback  → delegates up (EVNT write, SPEC-04 §4) — HIST writes nothing
  │        ├─ EscalationRowComponent         [presentational]  (kind='escalation' — channel + masked target + outcome)
  │        └─ DetectionLapseRowComponent      [presentational]  (kind='detection-lapse' — lapse state + times)
  │
  └─ PeriodSummaryCardComponent              [presentational]
        @Input() summary: PeriodSummaryVM     (events-in-period, confirmed, markedReal, falsePositives, notReviewed)
        @Input() summaryScope: 'period'|'loaded'   (G-HIST-4 — truthful label when paginated)
```

## 2. `feature-trail/` (`frontend/libs/hist/feature-trail`, `type:feature`)

```
EscalationTrailSectionComponent              [smart] — SAFETY-GEST-1 trail (same page section, flag hist.escalation-trail)
  reads signals: trail()=facade.trailVm(), trailDegraded()=facade.trailDegraded()
  injects: HistoryFacade (same facade/read as feature-history — one read, filtered by kind)
  │
  ├─ TrailSectionHeaderComponent             [presentational]  (title + "distinct from an active emergency" visual framing)
  ├─ @if trailDegraded() → TrailDegradedNoticeComponent     [presentational]  (partial-trail failure, SPEC-07 §2.1)
  ├─ EscalationAttemptListComponent          [presentational]
  │     @Input() attempts: HistoryEntryVM[] (kind='escalation')
  │     └─ EscalationRowComponent            [presentational, shared with feature-history via ui/]
  └─ DetectionLapseListComponent             [presentational]
        @Input() lapses: HistoryEntryVM[] (kind='detection-lapse')
        └─ DetectionLapseRowComponent        [presentational, shared via ui/]
```

> **Visual distinctness (SAFETY-GEST-1, no prototype parity).** `EscalationRowComponent` and
> `DetectionLapseRowComponent` use a **neutral, informational** treatment (SPEC / design-tokens
> `--color-info` family), explicitly **not** the `--color-alarm` emergency treatment EVNT owns: HIST is a
> calm historical read, never an active emergency (doc 01 §1, doc 06 R4). These rows never auto-route,
> never take over the screen, and never animate like a live alarm.

## 3. `ui/` (`frontend/libs/hist/ui`, `type:ui`)

Presentational, app-agnostic-local components reused by both features: `HistoryEventRowComponent`,
`EscalationRowComponent`, `DetectionLapseRowComponent`, `UrgencyBadgeComponent` (emergency/routine,
reuses `@neuroassist/shared/ui-components` badge), `ConfirmationStatusComponent` ("Confirmed at …" /
"Not yet confirmed"), `FeedbackOutcomeBadgeComponent` (marked real / false positive / not reviewed),
`PeriodSummaryCardComponent`. `ui/` depends on nothing app-specific and holds **no** `HttpClient` and
**no** facade.

## 4. Boundary rules (Nx tags, doc 04 §3)

- `feature-history` and `feature-trail` depend on `data-access` (`HistoryFacade` + `HISTORY_PORT`) + `ui`
  + `shared/*`; neither feature imports the other.
- `ui` depends only on `@neuroassist/shared/ui-*`; it never imports `data-access` or a facade.
- Adapters (`api/`) depend only on `@neuroassist/shared/access-http-base`.
- The delegated feedback write is **not** a HIST component concern: `HistoryTimelineComponent` emits
  `markFeedback` upward; the shell wires it to EVNT's feedback port (SPEC-06 §3). No HIST component holds
  an EVNT dependency directly (keeps HIST free of a write path, ADR-005).
