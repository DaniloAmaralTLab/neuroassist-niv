# SPEC-08 — E2E Scenarios — evnt (EVNT) Frontend

> Gherkin scenarios for `apps/evnt-e2e` (Playwright). Each scenario below becomes a `Scenario:` in a
> `.feature` under `../e2e/`. Scenarios are authored in **English** — the FE stub generator parses
> English Gherkin only (carry-forward `fe_nx_register_module_parses_only_english_gherkin`). Scenarios
> share domain nouns with the EARS acceptance statements in SPEC-01..07 so the EARS-coverage matcher
> (`fe-ears-coverage.py`) can pair them. This SPEC has no EARS section.

## 1. Feature files

| `.feature` | Covers | Primary EARS source |
|---|---|---|
| `emergency-alarm.feature` | full-screen takeover; acknowledge (confirm-then-clear); confirm failure keeps alarm active; empty state only after a successful read; RBAC on confirm | SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-07 |
| `alarm-delivery-safety.feature` | server-advertised poll; visibility pause + immediate resume poll; offline holds last-known + never all-clear; stale/skew; best-effort background notification; foreground-only budget | SPEC-03, SPEC-04 §5, SPEC-07 §2.1 |
| `routine-notice.feature` | discreet routine notice; never a takeover; dismiss; mark not real (`evnt.event.record`); RBAC | SPEC-02, SPEC-03, SPEC-05 |
| `evnt-navigation.feature` | routes / guards / lazy-loading; adapter default http; tenant switch invalidation; ingest-authority exclusion | SPEC-01, SPEC-04, SPEC-05, SPEC-06 |
| `push-escalation.feature` | SAFETY-1 closure: Web Push enroll (create 201 / idempotent 200); permission-denied degrades visibly; 410 Gone → resubscribe; unsubscribe (delete); notification click → `/alarm` + immediate poll; channel-status contact-missing (INT-EVNT-ACS-001); masked escalation-attempts trail; RBAC on subscription/escalation authorities | SPEC-01 §4, SPEC-03 §4a/§4b, SPEC-04 §5.6/§5.7, SPEC-05, SPEC-06 §5, SPEC-07 §2.3 |
| `detection-lapse-alert.feature` | SAFETY-GEST-1: distinct "station not detecting" alert (never the emergency takeover); emergency outranks (LAPSE-6); server-advertised lapse poll reusing the monitoring model; read failure/offline holds last-known + never "no lapses"; acknowledge (`evnt.detection-lapse.confirm`) + idempotent re-ack; auto-clear on server resolve; not-found neutral; RBAC on `evnt.detection-lapse.read`/`.confirm`; service-client raise/resolve excluded | SPEC-01 §4, SPEC-03 §4c, SPEC-04 §6, SPEC-05, SPEC-06 §2, SPEC-07 §2.4 |

## 2. Scenario inventory

### emergency-alarm
- When the live projection reports an active emergency, take over the screen with the full-screen alarm.
- Render the active emergency with the resolved patient name, command label and detection time.
- When the caregiver acknowledges, await the confirmation response before clearing the takeover (confirm-then-clear).
- When the confirmation succeeds, show the transient acknowledged confirmation and return to the no-active-emergency state on the next read cycle.
- If the confirmation write fails, keep the alarm active, offer retry, and do not render it as acknowledged.
- Render the calm no-active-emergency state only after a successful read returned no active alarm.
- While the session lacks `evnt.event.confirm`, hide the acknowledge action even while the alarm is rendered.
- If the backend responds `not-confirmable` on a confirm, show a toast that only emergencies can be acknowledged and do not change the alarm state.

### alarm-delivery-safety
- Poll the active-alarm endpoint at the server-advertised poll interval and do not hardcode the cadence.
- Render the active alarm from the server projection and do not infer an emergency from a client-side timer.
- While the caregiver client is foregrounded and online, treat the five-second commit-to-visibility budget as applicable.
- While the tab is hidden, mark monitoring as degraded, show the visible limitation banner, and do not claim the five-second budget.
- When the tab becomes visible, issue an immediate active-alarm poll and do not wait a full interval.
- When connectivity returns, issue an immediate active-alarm poll and resume the cadence.
- If an active-alarm read fails or is paused, hold the last known alarm state and do not display "no active emergency".
- While offline, show the visible offline limitation banner and do not render a no-active-emergency all-clear.
- While successful polls stop advancing or the server time skews, mark monitoring as stale and show the stale banner.
- Where the alarm-notification flag is on and notification permission is granted, raise a best-effort background notification without claiming it as a guaranteed delivery channel.

### routine-notice
- When the projection reports a routine event, present it as a discreet routine notice and do not promote it to the full-screen alarm.
- While an event urgency is not readable as emergency, present it as a routine notice and do not promote it to an alarm.
- When the caregiver dismisses a routine notice, mark it seen locally so it does not re-pop within the session.
- When the caregiver marks a notice not real, send the false-positive verdict to the feedback endpoint under `evnt.event.record`.
- While the session lacks `evnt.event.record`, hide the mark-not-real action.
- Use the authority `evnt.event.record` for the feedback write and not the superseded `evnt.event.feedback` key.

### evnt-navigation
- When a signed-in caregiver with `evnt.event.read` opens the alarm surface, render the full-screen `/alarm` page.
- If the session is absent on the alarm route, redirect to login and render no EVNT alarm surface.
- If the read guard denies the alarm route, redirect to the forbidden route and do not load the alarm feature library.
- Load the EVNT alarm feature route lazily and do not eager-bundle the alarm feature library into the shell.
- Default the EVNT data adapter to http and use the mock adapter only under an explicit mock provider.
- When the active tenant changes via tenant-context switchTo, invalidate any future EVNT state.
- Treat `evnt.event.ingest` as a device-token authority only and do not expose it as an EVNT dashboard route, guard or menu key.

### push-escalation
- When the caregiver enables alarm notifications through an explicit gesture and grants permission, subscribe with the config VAPID public key and register the subscription under `evnt.subscription.create`.
- When the same browser subscription is registered again, the backend returns it idempotently and no duplicate active channel is created.
- The system does not request notification permission on first paint and does not retry in a loop.
- If the caregiver denies notification permission, mark the push channel off visibly, explain that SMS and voice still cover, and do not fabricate a push subscription.
- When the browser reports `pushsubscriptionchange` or the subscription is `410 Gone`, resubscribe and register the new subscription and do not show a backend error toast.
- When the caregiver turns the push channel off, unsubscribe locally and call delete under `evnt.subscription.delete`.
- When a push notification is clicked, focus the dashboard on `/alarm` and issue an immediate active-alarm poll and do not render an emergency from the push payload alone.
- While ACS does not expose the caregiver phone, show the SMS and voice channels as contact-missing and do not present them as covered.
- When the escalation-attempts view is opened, read the trail under `evnt.escalation.read` and render each attempt with its destination masked.
- While the session lacks `evnt.subscription.create`, hide the enable-push affordance.
- While the session lacks `evnt.escalation.read`, hide the escalation-attempts trail.

### detection-lapse-alert
- When the projection reports an open detection lapse, present a distinct station-not-detecting alert and do not render the detection lapse as the emergency takeover.
- While the patient has an unconfirmed emergency, let the emergency outrank the detection lapse and do not surface the detection lapse as an emergency.
- Poll the detection-lapse list at the server-advertised poll interval reusing the monitoring model and do not hardcode the cadence.
- While the tab is hidden or offline, mark detection-lapse monitoring degraded and do not claim there are no detection lapses.
- If a detection-lapse read fails or is paused, hold the last known detection-lapse state and do not claim there are no detection lapses.
- When the caregiver acknowledges a detection lapse, send the confirmation under `evnt.detection-lapse.confirm` and keep the alert active until the write succeeds.
- When an already-acknowledged detection lapse is acknowledged again, treat the acknowledgement as idempotent and do not show a backend error.
- If an acknowledge-lapse write fails, keep the detection-lapse alert active, offer retry, and do not render it as acknowledged.
- When a detection lapse is resolved server-side, auto-clear the detection-lapse alert on the next read.
- If the backend responds not-found on a detection-lapse read, show a neutral no-lapse-available state and do not disclose whether the detection lapse exists.
- While the session lacks `evnt.detection-lapse.confirm`, hide the acknowledge action on the detection-lapse alert.
- While the session lacks `evnt.detection-lapse.read`, hide the detection-lapse alert surface.
- Treat the detection-lapse raise and resolve endpoints as a service-client path and do not call them from the dashboard.
- Use the detection-lapse authorities exactly as the backend authority constants and do not rename them.

## 3. Stub-integrity rule (carry-forward, Learning ev=45 on acs-e2e)

Generated Playwright stubs MUST fail explicitly until implemented — `test.fixme()` or
`throw new Error('TODO[<ISSUE>]: implement')` — and MUST NOT use a vacuous
`await expect(page).toHaveURL(/.*/)` under `test.skip`. RBAC scenarios seed the authority via the
session mechanism the shell reads (sessionStorage / refresh endpoint — `fe-e2e:auth`), not an unrelated
header (`fe-e2e:rbac-access-decision:setExtraHTTPHeaders-vs-localStorage`). SAFETY scenarios drive
visibility/connectivity through the Playwright page APIs (emulate offline, dispatch
`visibilitychange`), not a fake clock that would also mask the "no timer-derived emergency" invariant.
Each spec resets its own seed to avoid state leak across specs
(`fe-e2e:shared-seed:state-leak-across-specs`).

Detection-lapse-alert scenarios exercise the lapse list + acknowledge against the **mock `LAPSE_PORT`
adapter** (the raise/resolve service-client path is never driven from the dashboard), seed the
`evnt.detection-lapse.read` / `evnt.detection-lapse.confirm` authorities via the session mechanism the
shell reads (`fe-e2e:auth`), and drive the "emergency outranks" precedence by seeding an active
emergency plus an open lapse in the same read — the lapse alert must never render as the takeover. The
degraded / "never claim no lapses" path is driven through the Playwright page APIs (emulate offline,
dispatch `visibilitychange`), not a fake clock.

Push-escalation scenarios drive notification permission through the Playwright **browser-context**
APIs (`context.grantPermissions(['notifications'])` for the granted path, and an un-granted/denied
context for the degraded path) — not by stubbing `Notification` ad hoc; the push subscription,
`410 Gone` and `notificationclick` are exercised against the **mock `PUSH_PORT` adapter + stubbed SW**
(SPEC-06 §5), because a real push service is out of an e2e's control. RBAC scenarios seed the
`evnt.subscription.*` / `evnt.escalation.read` authorities via the session mechanism the shell reads
(`fe-e2e:auth`), never a header.
