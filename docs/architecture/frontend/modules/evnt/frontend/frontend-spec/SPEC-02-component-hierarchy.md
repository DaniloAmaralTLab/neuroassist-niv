# SPEC-02 — Component Hierarchy — evnt (EVNT) Frontend

> Standalone-first, OnPush mandatory. Smart components consume `AlarmFacade` (signals);
> presentational components receive `input()`s and emit `output()`s and hold no `HttpClient`.
> Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/03-domain-framing-frontend.md` §2–§4,
> `frontend/04-frontend-architecture-direction.md` §3, local `adr/ADR-005`. SPEC-02 is prose (no EARS section).

## 1. `feature-alarm` (full-screen emergency takeover · route /alarm)

```
AlarmPageComponent                     (smart · OnPush)   route /alarm
│  reads:  alarmFacade.alarmVm()            Signal<AlarmVM>          (active | acknowledging | acknowledged | none | loading | error)
│          alarmFacade.monitoringVm()       Signal<MonitoringVM>     (SAFETY: foreground/offline/stale — SPEC-04 §5)
│          accessDecision.can('evnt.event.confirm')  → canConfirm
├── EmergencyAlarmComponent            (presentational)   full-bleed --color-alarm takeover
│     input:  vm: AlarmVM                                 (patientName, commandLabel, detectedAt)
│     output: acknowledgeRequested  (caregiver clicks the single "Confirm I attended to …" action)
│   ├── AlarmSubjectBannerComponent    (presentational)   input: patientName; commandLabel; detectedAt
│   │       (large, read-at-a-glance: "{patient} needs help · "{label}" · detected at 14:32")
│   └── AcknowledgeButtonComponent     (presentational)   input: canConfirm; submitting
│           output: acknowledgeRequested  (the ONLY affordance on the takeover; hidden WHILE !canConfirm;
│           disabled WHILE submitting so a double-tap cannot double-confirm — confirm is idempotent BE-side)
├── AlarmEmptyStateComponent           (presentational)   input: visible
│       (calm "no active emergency right now" — rendered only on a SUCCESSFUL read that returned null)
├── AcknowledgedConfirmationComponent  (presentational)   input: vm: AcknowledgedVM
│       (transient session feedback "Attendance confirmed at 14:33 by {caregiver}" after a successful confirm)
└── MonitoringStatusBannerComponent    (presentational)   input: vm: MonitoringVM     ← SAFETY, always evaluated
        (VISIBLE safety notice: "monitoring paused — keep this window in front", "offline — alarms delayed",
         "status stale"; NEVER silent; NEVER replaced by a false "all clear" — SPEC-04 §5, SPEC-07)
```

`AlarmPageComponent` never synthesizes an emergency from a timer: it renders exactly what
`AlarmFacade.alarmVm()` reports from the server projection (ADR-005 §Decision 3–4, doc 03 §5
"Offline ≠ alarm"). The empty "no active emergency" state is shown **only** when a read succeeded and
returned `activeAlarm: null`; while a read is paused/offline/failing the `MonitoringStatusBanner` holds
the surface in a stale/degraded state instead (SPEC-04 §5, SPEC-07 §2).

## 2. `feature-notifications` (discreet routine notices · Home notice slot + topbar)

```
RoutineNoticeListComponent             (smart · OnPush)   embedded in the Home notice slot
│  reads:  alarmFacade.routineNoticesVm()   Signal<RoutineNoticeVM[]>
│          accessDecision.can('evnt.event.record')  → canRecordFeedback
├── RoutineNoticeCardComponent         (presentational)   input: vm: RoutineNoticeVM; canRecordFeedback
│     output: dismissRequested      (local seen + optional acknowledge, feedback stays on HIST/history)
│     output: markNotRealRequested  (feedback write verdict=false_positive — evnt.event.record)
│       (non-blocking card: ""{label}" requested at 14:32"; never escalates to the full-screen alarm)
RoutineNoticeIndicatorComponent        (presentational · OnPush)   contributed to the Shell topbar
  input:  count: number; hasUnseen: boolean
    (a discreet count/affordance; opening it reveals the RoutineNoticeList — noticed, not alarming, §3.2.E)

NotificationCenterComponent (OPTIONAL)  (smart · OnPush)   recent-notices surface
  reads:  alarmFacade.recentNoticesVm()  Signal<RoutineNoticeVM[]>
    (a short recent-notices list; it is NOT the history log — HIST owns the full immutable listing, doc 05 §1)
```

Routine notices are feature-local **dismissal** state (`seen`), not a data cache (doc 05 §3): a
dismissed notice does not re-pop within the session. The notification center, if built, shows only the
recent projection slice the facade holds — it never grows into the full event history (that is HIST) and
never aggregates across patients (that is DASH) (ADR-005 §Decision 1).

## 2a. `feature-push` (SAFETY-1 closure — Web Push enrollment + channel status + escalation trail)

> New feature lib (SPEC-04 §5.6/§5.7, SPEC-03 §4a/§4b). The **subscription logic and UI live here**; the
> **service-worker registration and `notificationclick` live in the Shell** (SPEC-06 §5) because push is
> origin-wide and a browser allows one SW per scope. No component holds `HttpClient`; all server access
> is through `PushChannelFacade` / `AlarmFacade`.

```
PushEnrollmentComponent                (smart · OnPush)   embedded in the escalation-status surface / settings slot
│  reads:  pushChannelFacade.pushChannelVm()  Signal<PushChannelVM>   (permission, pushEnrolled, sms/voice, canManage)
│          accessDecision.can('evnt.subscription.create')  → canManage
├── EscalationChannelStatusComponent   (presentational)   input: vm: PushChannelVM
│     output: enableRequested          (explicit caregiver gesture → request permission + subscribe + create)
│     output: disableRequested         (unsubscribe + delete)
│     output: reauthHelpRequested      (WHILE permission='denied' → how to re-enable in site settings)
│       (honest tri-state per channel: Push on/off/blocked/unsupported; SMS & Voice available/contact-missing —
│        NEVER a green "covered" it cannot back; contact-missing WHILE INT-EVNT-ACS-001 is open — SPEC-04 §5.7)
└── NotificationPermissionPromptComponent (presentational)  input: permission: PushPermission
        output: enableRequested         (the one-line "why", shown only on gesture — NEVER on first paint)

EscalationAttemptsComponent (OPTIONAL) (smart · OnPush)   on the /alarm or event-detail surface
│  reads:  alarmFacade.escalationTrailVm(eventId)  Signal<EscalationTrailVM>
│          accessDecision.can('evnt.escalation.read')  → canRead  (whole surface hidden WHILE !canRead)
└── EscalationAttemptRowComponent      (presentational)   input: vm: EscalationAttemptVM
        (one row per attempt: tier/channel badge, masked target verbatim, sent/failed, humanised note, time —
         NEVER unmasks or renders a raw provider payload — SPEC-03 §4b)
```

`PushEnrollmentComponent` requests `Notification.requestPermission()` **only** from the
`enableRequested` gesture (SPEC-04 §5.7), never on paint and never in a loop. On `denied` the status
surface degrades **visibly** (push off, SMS/voice still noted) rather than retrying. The
`EscalationAttempts` surface is read-only and masked and is a diagnostic aid, not a control.

## 2b. `feature-lapse` (SAFETY-GEST-1 — the distinct "station not detecting" alert)

> New feature lib (SPEC-03 §4c, SPEC-04 §6). Renders EDGE's detection-lapse episode as a **distinct**
> caregiver alert on an **embedded** surface (the Home notice region / escalation-status slot) — it is
> **never** the full-screen emergency takeover and adds **no route** (SPEC-01). An unconfirmed emergency
> always outranks it. No component holds `HttpClient`; all server access is through `LapseAlertFacade`.

```
DetectionLapseAlertComponent          (smart · OnPush)   embedded (Home notice region / escalation-status slot)
│  reads:  lapseAlertFacade.detectionLapseAlertVm()  Signal<DetectionLapseAlertVM>  (loading | none | active | acknowledging | error; suppressedByEmergency)
│          alarmFacade.monitoringVm()                 Signal<MonitoringVM>           (SAFETY: reuses the SAME monitoring model — SPEC-04 §6.2)
│          accessDecision.can('evnt.detection-lapse.read')     → canRead   (whole surface hidden WHILE !canRead)
│          accessDecision.can('evnt.detection-lapse.confirm')  → canAcknowledge
├── DetectionLapseCardComponent        (presentational)   input: vm: DetectionLapseVM; canAcknowledge
│     output: acknowledgeRequested      (caregiver clicks "I see it" → ack-then-clear, SPEC-04 §6.4)
│       (clearly a "station not detecting" notice — "{patient}'s station stopped detecting · since 14:32";
│        NEVER styled or escalated as the emergency takeover — LAPSE-3)
└── DetectionLapseEmptyStateComponent  (presentational)   input: visible
        (calm "all stations detecting" — rendered only on a SUCCESSFUL read that returned no open lapse;
         WHILE the poll is degraded the MonitoringStatusBanner holds the surface instead — never a false "no lapses")
```

`DetectionLapseAlertComponent` renders exactly what `LapseAlertFacade` reports from the server list
projection and never synthesizes or auto-clears a lapse from a timer (SPEC-04 §6.4). WHILE
`suppressedByEmergency` is true the alert is held back and the emergency takeover takes the screen
(LAPSE-6). The empty "all stations detecting" state shows **only** on a successful read that returned no
open lapse; a paused/offline/failed read holds the surface in a degraded state via the shared
`MonitoringStatusBanner` (SPEC-02 §1, SPEC-04 §6.2) — never a false "no lapses". The acknowledge
affordance is hidden WHILE the session lacks `evnt.detection-lapse.confirm` and disabled WHILE a confirm
is in flight (BE ack is idempotent regardless — api-contract §12.1). Accessibility: the lapse alert is an
ARIA `status`/`alert` region (not an `alertdialog` — it does not seize focus the way the emergency
takeover does, so it never competes with a real emergency).

## 3. `libs/evnt/ui` (optional) — alarm-local presentational bits

```
AlarmChromeIconComponent               (presentational · OnPush)   input: urgency: 'emergency'
  (the emergency glyph for the takeover; purely visual, bound to --color-alarm; holds no logic)
```

The takeover's colour/motion all come from `@neuroassist/shared/ui-tokens` (`--color-alarm`); `ui/`
holds no business logic and no facade (see `contracts/design-tokens.md`).

## 4. Component rules (all features)

- Every component is `standalone: true`, `changeDetection: OnPush`.
- No component imports `HttpClient`; all server access is through `AlarmFacade` (SPEC-04).
- No component evaluates a role inline; gating booleans come from `AccessDecisionService.can(...)`
  (carry-forward `guard:stub-permissive`).
- No component infers an emergency, a "resolved" alarm, or an "all clear" from a client-side timer or
  from device/network state; the alarm state is read from the facade's server-derived projection
  (ADR-005, doc 03 §5 "Offline ≠ alarm").
- Presentational components are pure: inputs in, outputs out, no injected facade.
- The acknowledge affordance is the **single** action on the takeover (doc 02 §3, wireframe §5): it is
  hidden WHILE the session lacks `evnt.event.confirm` and disabled WHILE a confirm is in flight so a
  double-tap cannot submit twice (BE confirm is idempotent regardless — api-contract §4.1).
- Accessibility carry-forwards (Learning): the emergency takeover is an ARIA `alertdialog` with an
  accessible name and is announced on appearance (`fe-component:a11y-live-region`); the acknowledge
  button receives focus on takeover and focus returns to the prior context after a successful confirm
  (`fe-component:modal-focus-return`); "detected at 14:32" / "confirmed at 14:33" render via a
  time-format pipe, never `toFixed` (`fe-component:kpi-decimal-format`); colour is never the only alarm
  signal (text + icon + motion), WCAG AA against `--color-alarm` in both themes.
- Styling via Tailwind v4 utilities bound to oklch tokens (`@neuroassist/shared/ui-tokens`); dark is
  default; no hardcoded colour/spacing — the emergency uses `--color-alarm`, never a hardcoded red
  (`contracts/design-tokens.md`).
