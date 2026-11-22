# SPEC-03 — View Models — evnt (EVNT) Frontend

> View-models are TypeScript `record`-style read-only shapes exposed from `AlarmFacade` signals.
> VMs carry only data the template renders; gating booleans come from `AccessDecisionService`.
> Facades MUST NOT fabricate missing fields as `null`/placeholder fillers — a field absent from the BE
> wire record is modelled explicitly, not invented (carry-forward `fe-facade:fabricated-null-fields`).
> The alarm state is **read**, never derived from a timer (ADR-005, doc 03 §5). Sources:
> `frontend/03-domain-framing-frontend.md` §2–§5, `frontend/05-state-and-data-flow.md`, BE api-contract §3–§5
> and SPEC-03 (alarm safety).

## 1. `AlarmVM` (the full-screen takeover · route /alarm)

```ts
type AlarmState =
  'loading' | 'none' | 'active' | 'acknowledging' | 'acknowledged' | 'error';

interface AlarmVM {
  state: AlarmState;
  eventId: string | null;        // from active-alarm.activeAlarm.id; null WHILE state ∈ {none, loading}
  patientId: string | null;      // from active-alarm.activeAlarm.patientId (drives nothing in the URL — SPEC-01 §1.1)
  patientName: string;           // RESOLVED from the session/ACS link (G-EVNT-6: BE payload has no name) — "the patient" WHEN unknown, never fabricated
  commandLabel: string;          // from BE activeAlarm.commandLabel (BE DOES carry this — api-contract §3.1)
  detectedAt: string | null;     // from BE activeAlarm.occurredAt (display "14:32"); null WHILE none
  canConfirm: boolean;           // AccessDecisionService.can('evnt.event.confirm')
}
```

- UI events: `acknowledgeRequested` (Confirm clicked → `state='acknowledging'`), `confirmSucceeded`
  (write ok → `state='acknowledged'`, transient), `confirmFailed` (write failed → `state='error'`,
  alarm stays active — doc 05 §4), `readFailed` (projection read failed → see `MonitoringVM`, never a
  false `none`).
- Invariant (doc 03 §5): `state='none'` is set **only** after a read that returned `activeAlarm: null`.
  A paused/offline/failed read NEVER yields `none` — it holds the last known state and surfaces
  `MonitoringVM` (SPEC-04 §5). "No active emergency" is a *positive* server answer, never the absence of
  an answer.
- Invariant: `active` counts only `emergency` events with `confirmedAt == null` (BE active-alarm query,
  INV-EVNT-3). A resolved alarm never reappears; the FE never clears `confirmedAt` to re-raise one.
- `patientName`/`confirmedByName` are display names the BE event payload does **not** carry (G-EVNT-6);
  they are resolved from the caregiver session / ACS link and rendered only WHERE known — never invented
  as `null` text (carry-forward `fe-facade:fabricated-null-fields`).

## 2. `AcknowledgedVM` (transient session feedback after a successful confirm)

```ts
interface AcknowledgedVM {
  eventId: string;
  patientName: string;           // resolved (G-EVNT-6)
  confirmedAt: string;           // from confirm response confirmedAt
  confirmedByName: string;       // resolved from the session (BE returns confirmedBy = caregiver id, not name)
}
```

- Mirrors the prototype's `confirmedInThisSessionId` (ADR-005 References): a **feature-local** transient
  signal, not persisted projection state. It is shown briefly, then the next read cycle returns the
  surface to `none` and the Shell returns to Home (doc 05 §6). The audited record is read in **HIST**
  thereafter, never re-rendered by EVNT.

## 3. `RoutineNoticeVM` (discreet notice · Home slot + topbar)

```ts
type Feedback = 'not_evaluated' | 'real' | 'false_positive';   // BE feedback enum (api-contract §2.1)

interface RoutineNoticeVM {
  eventId: string;
  patientName: string;           // resolved (G-EVNT-6)
  commandLabel: string;          // from BE event.commandLabel
  requestedAt: string;           // from BE event.occurredAt
  feedback: Feedback;            // BE event.feedback
  seen: boolean;                 // feature-local dismissal state (doc 05 §3), never a data cache
  canRecordFeedback: boolean;    // AccessDecisionService.can('evnt.event.record')
}
```

- UI events: `dismissRequested` (local `seen=true`; optional acknowledge), `markNotRealRequested`
  (feedback write `verdict='false_positive'` — `evnt.event.record`).
- Invariant (doc 03 §5): a `routine` event is **never** promoted to the full-screen alarm, and an event
  whose `urgency` the FE cannot read as `emergency` degrades **conservatively to a routine notice**,
  never to an alarm and never silently dropped (ADR-005 §Decision 4 "Urgency routing is read-only").

## 4. `MonitoringVM` (SAFETY — the delivery-limitation state, always evaluated)

> This VM makes the BE SAFETY-1 limitation **visible, not silent** (mandate: assistive product). It is
> the FE's honest rendering of "can I currently receive an emergency?" — see SPEC-04 §5 for the polling
> and Page-Visibility / connectivity contract it is fed by.

```ts
type PollingState =
  'live'            // tab foreground + online + last poll succeeded within one interval
  | 'paused-hidden' // tab backgrounded: fast emergency poll is throttled/unreliable (browser background throttling)
  | 'offline'       // navigator offline or the read failed with a transport error
  | 'stale';        // last successful poll older than N intervals (serverTime skew / stalled loop)

interface MonitoringVM {
  polling: PollingState;
  lastPolledAt: string | null;       // ISO of the last SUCCESSFUL active-alarm read
  pollIntervalSeconds: number;       // server-advertised (BE active-alarm.pollIntervalSeconds, default 3)
  foregroundRequired: boolean;       // true WHILE polling ∈ {paused-hidden, offline, stale}
  message: string;                   // user-facing, e.g. "Keep this window in front to receive alarms"
}
```

- `foregroundRequired` drives the always-visible `MonitoringStatusBannerComponent` (SPEC-02 §1). WHILE it
  is true the surface is in a **degraded/stale** state and the FE **never** renders a false "all clear":
  it holds the last known alarm state and tells the caregiver delivery may be delayed (SPEC-04 §5,
  SPEC-07 §2, R1/SAFETY-1).
- `polling='live'` is the **only** state in which the ≤ 5 s p95 commit-to-visibility budget applies
  (BE SPEC-03 Decision 2 — foreground + online only). The VM never claims live coverage it does not have.

## 4a. `PushChannelVM` (SAFETY-1 closure — the honest escalation-channel status, always available)

> Renders which out-of-band tiers are armed for this caregiver right now. It is the FE's truthful answer
> to "if I close this window, how do I get reached?" — never a green "covered" it cannot back (SPEC-04
> §5.6/§5.7, BE SPEC-11, mandate: limitation is visible).

```ts
type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';
type PhoneChannelState = 'available' | 'contact-missing';   // contact-missing WHILE INT-EVNT-ACS-001 is OPEN

interface PushChannelVM {
  permission: PushPermission;        // Notification.permission (+ 'unsupported' where Push/SW absent)
  pushEnrolled: boolean;             // a live subscription is registered with the BE (Tier 0 armed)
  subscriptionId: string | null;     // BE push-subscription id (for DELETE on unsubscribe); null WHILE !pushEnrolled
  sms: PhoneChannelState;            // Tier 1 — from the BE/ACS caregiver-contact capability, never guessed
  voice: PhoneChannelState;          // Tier 2 — idem
  canManage: boolean;                // AccessDecisionService.can('evnt.subscription.create')
  message: string;                   // user-facing, e.g. "Push off — SMS and voice still reach you" / "Add a phone to enable SMS & voice"
}
```

- UI events: `enableRequested` (explicit gesture → request permission + subscribe + create — SPEC-04
  §5.6), `disableRequested` (unsubscribe + delete), `reauthHelpRequested` (WHILE `permission='denied'`,
  show how to re-enable in site settings — the FE cannot re-prompt a hard-denied origin).
- Invariant: `pushEnrolled=true` is set **only** after a successful `POST /evnt/push-subscriptions`; a
  local `pushManager.subscribe` without the registered BE row is **not** "enrolled". A `denied`/`default`
  permission NEVER reads as enrolled, and `contact-missing` phone channels NEVER read as available — the
  VM is the truth, so the caregiver is never told they are covered when they are not.
- Invariant: `sms`/`voice` availability comes from a BE/ACS capability signal; WHILE `INT-EVNT-ACS-001`
  is OPEN both are `contact-missing` (the FE does not fabricate availability from missing data).

## 4b. `EscalationAttemptVM` / `EscalationTrailVM` (optional — the masked out-of-band trail)

> Read-only view of who the BE tried to reach for an emergency, over which channel, with what outcome —
> shown on the alarm / event detail (SPEC-02 §5). Destinations arrive **already masked** from the BE
> (api-contract §3.4); the FE renders them verbatim and never unmasks.

```ts
type EscalationChannel = 'web_push' | 'sms' | 'voice';
type EscalationStatus  = 'sent' | 'failed';

interface EscalationAttemptVM {
  tier: 0 | 1 | 2;
  channel: EscalationChannel;        // 'web_push' (T+0) | 'sms' (T+30s) | 'voice' (T+90s)
  maskedTarget: string;              // BE-masked ("+55•••••1234", "sub:chrome-…") — rendered verbatim
  status: EscalationStatus;          // 'sent' | 'failed'
  note: string;                      // humanised from errorReason ("no contact on file", "no subscription") — never a raw payload
  attemptedAt: string;               // ISO → "08:14:33"
  canRead: boolean;                  // AccessDecisionService.can('evnt.escalation.read')
}
interface EscalationTrailVM {
  eventId: string;
  attempts: EscalationAttemptVM[];   // ordered by attemptedAt
  loading: boolean; errored: boolean;
}
```

- Invariant: the trail is **read-only and masked** — the FE never joins a full phone/endpoint onto a
  masked `target`, and `errorReason` (e.g. `no-contact`, `no-subscription`) maps to a plain note, not a
  provider stack trace. The whole surface is hidden WHILE the session lacks `evnt.escalation.read`.

## 4c. `DetectionLapseVM` / `DetectionLapseAlertVM` (SAFETY-GEST-1 — the distinct "station not detecting" alert)

> Renders EDGE's detection-lapse episode (a station connected but not *detecting*) as a **distinct**
> caregiver alert — **never** the emergency takeover (`AlarmVM`). A lapse produces no `event`, so it is
> read from its **own** list projection (BE api-contract §11, SPEC-04 §6). The alert state is **read**,
> never derived from a timer (mirror of §1). It **auto-clears** when the lapse is resolved server-side or
> acknowledged. An unconfirmed emergency always **outranks** it (BE SPEC-12 LAPSE-3 / LAPSE-6). Sources:
> BE `../../adr/ADR-006-detection-lapse-alerting.md`, BE `spec/backend/SPEC-12-detection-lapse-alerting.md`,
> BE api-contract §11–12.

```ts
type LapseCause = 'NOT_RUNNING' | 'HEARTBEAT_STOPPED';           // BE cause enum (api-contract §10)
type DetectionState = 'RUNNING' | 'PAUSED' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
type LapseStatus = 'open' | 'acknowledged' | 'resolved';         // BE detection_lapse status (api-contract §11)

interface DetectionLapseVM {
  lapseId: string;
  patientId: string;             // from BE lapse.patientId (drives nothing in the URL — embedded surface)
  patientName: string;           // RESOLVED from the session/ACS link (G-EVNT-6: BE payload has no name), never fabricated
  cause: LapseCause;             // from BE lapse.cause
  detectionState: DetectionState | null; // from BE lapse.detectionState (optional — null, never a guessed state)
  status: LapseStatus;           // 'open' | 'acknowledged' | 'resolved'
  lapseStartedAt: string;        // from BE lapse.lapseStartedAt (display "14:32")
  acknowledgedAt: string | null; // from BE lapse.acknowledgedAt
  resolvedAt: string | null;     // from BE lapse.resolvedAt
  canAcknowledge: boolean;       // AccessDecisionService.can('evnt.detection-lapse.confirm')
}
interface DetectionLapseAlertVM {
  state: 'loading' | 'none' | 'active' | 'acknowledging' | 'error'; // 'active' = at least one open lapse WHILE no emergency outranks it
  lapses: DetectionLapseVM[];    // open lapses across the caregiver's linked patients, newest first
  suppressedByEmergency: boolean; // true WHILE an unconfirmed emergency outranks the lapse (LAPSE-6) — the alert is held back, not cleared
  canRead: boolean;              // AccessDecisionService.can('evnt.detection-lapse.read') — whole surface hidden WHILE !canRead
}
```

- UI events: `acknowledgeRequested` (caregiver clicks "I see it" → `state='acknowledging'`, confirm write
  under `evnt.detection-lapse.confirm`), `acknowledgeSucceeded` (write ok → the lapse leaves the open set
  on the next read), `acknowledgeFailed` (write failed → `state='error'`, the lapse stays active —
  SPEC-07 §2.4), `readFailed` (list read failed → the alert holds its last known state and surfaces
  `MonitoringVM`, never a false "no lapses" — SPEC-04 §6).
- **Invariant (distinct alert — LAPSE-3).** A detection lapse is rendered as a **separate** "station not
  detecting" alert and is **never** promoted to the full-screen `/alarm` takeover and never styled as an
  emergency. `AlarmVM` and `DetectionLapseAlertVM` are two surfaces of two different reads.
- **Invariant (emergency outranks — LAPSE-6).** WHILE the patient has an unconfirmed emergency
  (`AlarmVM.state='active'`), `suppressedByEmergency=true`: the lapse alert is held back and NEVER shown
  above or as the emergency. It resumes only after the emergency is confirmed while the lapse is still open.
- **Invariant (auto-clear).** `status` flips to `resolved` **only** from a successful read that returned
  the lapse resolved server-side (EDGE's resolve), and the alert auto-clears for a resolved/acknowledged
  lapse on the next read cycle. A paused/offline/failed read NEVER clears the alert and NEVER yields a
  "no detection lapses" all-clear (mirror of §1 / §4; "no lapses" is a *positive* server answer).
- **Escalation-attempt reuse (deferred — honest).** The BE escalation-attempts read is exposed for an
  **event** only (`GET /evnt/events/{eventId}/escalation-attempts`, §3.4); the current contract exposes
  **no** per-lapse escalation-attempts endpoint. So there is **no** `DetectionLapseAttemptVM` in this
  version: the FE does **not** fabricate a lapse trail. WHERE a future contract adds a lapse attempts
  read, it reuses `EscalationAttemptVM` / `evnt.escalation.read` unchanged (SPEC-04 §6, backend-api-cross-link §3).

## 5. VM ↔ wire mapping

Each VM is produced by a `to<X>(wire)` mapper over an `<X>Wire` type that mirrors the BE record shape
1:1 (SPEC-04 §3, carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`). Mappers live in
`libs/evnt/api`. `patientName`/`confirmedByName` are resolved by a separate name resolver over the
session/ACS link and **joined** into the VM — the mapper never fabricates them from the event wire
(G-EVNT-6). `pollIntervalSeconds`/`serverTime` flow from the active-alarm envelope into `MonitoringVM`,
never hardcoded (BE SPEC-03 Decision 1).

## Criterios de aceite (EARS)

- WHILE `AlarmVM.state` is `loading`, THE SYSTEM SHALL render the alarm loading state and SHALL NOT render a "no active emergency" all-clear.
- WHILE `AlarmVM.state` is `active`, THE SYSTEM SHALL render the full-screen emergency takeover with the resolved patient name, command label and detection time.
- WHILE `AlarmVM.state` is `none`, THE SYSTEM SHALL render the calm no-active-emergency state only after a successful read returned no active alarm.
- IF a projection read is paused, offline or failing, THEN THE SYSTEM SHALL hold the last known alarm state and SHALL NOT render a no-active-emergency all-clear.
- WHILE the session lacks the confirm authority, THE SYSTEM SHALL mark the acknowledge capability unavailable and hide the acknowledge action.
- WHEN a confirm write succeeds, THE SYSTEM SHALL show the transient acknowledged confirmation and SHALL return the surface to the no-active-emergency state on the next read cycle.
- IF a confirm write fails, THEN THE SYSTEM SHALL keep the alarm active and SHALL NOT render it as acknowledged.
- WHILE an event `urgency` is not readable as `emergency`, THE SYSTEM SHALL present it as a routine notice and SHALL NOT promote it to the full-screen alarm.
- WHILE the caregiver client is backgrounded, offline or stale, THE SYSTEM SHALL set `MonitoringVM.foregroundRequired` true and render the visible monitoring-limitation banner.
- THE SYSTEM SHALL adopt the server-advertised `pollIntervalSeconds` in `MonitoringVM` and SHALL NOT hardcode the emergency poll cadence.
- IF a backend event wire record omits the patient or caregiver display name, THEN THE SYSTEM SHALL resolve it from the session or render a neutral label and SHALL NOT fabricate a placeholder name.
- WHILE notification permission is not `granted` or no subscription is registered with the backend, THE SYSTEM SHALL render `PushChannelVM.pushEnrolled` false and SHALL NOT present the push channel as armed.
- WHILE the caregiver phone is not exposed by ACS (`INT-EVNT-ACS-001`), THE SYSTEM SHALL render the SMS and voice channels as contact-missing and SHALL NOT present them as covered.
- WHILE the session lacks `evnt.escalation.read`, THE SYSTEM SHALL hide the escalation-attempts trail.
- WHEN the escalation trail is rendered, THE SYSTEM SHALL show each attempt's masked destination verbatim and SHALL NOT unmask or enrich it.
- WHEN the projection reports an open detection lapse, THE SYSTEM SHALL present a distinct station-not-detecting alert and SHALL NOT render the detection lapse as the emergency takeover.
- WHILE the patient has an unconfirmed emergency, THE SYSTEM SHALL let the emergency outrank the detection lapse and SHALL NOT surface the detection lapse as an emergency.
- WHEN a detection lapse is resolved server-side or acknowledged, THE SYSTEM SHALL auto-clear the detection-lapse alert on the next successful read.
- IF a detection-lapse read is paused, offline or failing, THEN THE SYSTEM SHALL hold the last known detection-lapse state and SHALL NOT claim there are no detection lapses.
- WHILE the session lacks `evnt.detection-lapse.confirm`, THE SYSTEM SHALL hide the acknowledge action on the detection-lapse alert.
- WHILE the session lacks `evnt.detection-lapse.read`, THE SYSTEM SHALL hide the detection-lapse alert surface.
