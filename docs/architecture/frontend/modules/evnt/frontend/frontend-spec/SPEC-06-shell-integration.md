# SPEC-06 — Shell Integration — evnt (EVNT) Frontend

> How EVNT plugs into the `neuroassist-niv-web` shell: module descriptor, integration service (incl. the
> Home notice slot / topbar notice contributions and the active-emergency takeover), and bootstrap
> lifecycle. Sources: `frontend/02-architecture-blueprint.md` §4, `frontend/04-frontend-architecture-direction.md` §2/§5,
> `frontend/05-state-and-data-flow.md` §6, shared ADR-006 (module-entry-as-library), local ADR-005.

## 1. `evnt.descriptor.ts` — Shell descriptor (fallback + registration)

```ts
export const EVNT_MODULE_DESCRIPTOR: ModuleDescriptor = {
  key: MODULE_KEY,                          // 'evnt'
  menu: MODULE_MENU_METADATA,               // SPEC-05 §1 (contextual "Emergency alarm")
  loadChildren: () => import('@neuroassist/evnt').then(m => m.EvntModule),
  routeBase: '/alarm',
  permissions: Object.keys(MODULE_PERMISSION_MAP),
  featureFlags: MODULE_FEATURE_FLAGS,
  shellSurfaces: ['HomeNoticeSlot', 'TopbarRoutineNoticeIndicator', 'EmergencyTakeover', 'EscalationChannelStatus', 'DetectionLapseAlert'],
};
```

The shell registers EVNT by importing `@neuroassist/evnt` in `config/module-descriptors.ts` and pushing
`EVNT_MODULE_DESCRIPTOR` into `MODULE_DESCRIPTORS`. The descriptor is the shell's fallback source for
menu/permission metadata if the lazy chunk has not loaded yet. Because the emergency is the parent flow,
the descriptor also declares the Shell surfaces EVNT contributes — the Home notice slot, the topbar
routine-notice indicator, and the full-screen **emergency takeover**.

## 2. `EvntShellIntegrationService` (`libs/evnt/integration`, `type:domain`)

Responsibilities:

- **Active-emergency takeover (SAFETY):** observe `AlarmFacade.activeEmergency`; WHEN it becomes
  non-null and `evnt.alarm-autoroute` is on, auto-route to `/alarm` **or** render the takeover overlay
  (ADR-005 §3). It never clears the takeover on its own — only an acknowledge write does (doc 05 §6).
- **Monitoring visibility (SAFETY):** surface `AlarmFacade.monitoringVm()` so the Shell can keep the
  monitoring-limitation banner visible wherever the caregiver is, not only on `/alarm` — a backgrounded/
  offline/stale state is shown, never hidden (SPEC-04 §5, mandate: limitation is visible).
- **Page Visibility & connectivity wiring:** own the `document.visibilitychange`, `window.online` and
  `window.offline` listeners and drive the facade to pause/resume and to issue the **immediate** resume
  poll (SPEC-04 §5.3/§5.4). The Shell owns these because polling must follow the whole dashboard's
  foreground/online state, not a single route.
- **Home notice slot + topbar indicator:** contribute `RoutineNoticeList` (Home) and
  `RoutineNoticeIndicator` (topbar) fed by `AlarmFacade.routineNoticesVm()` (doc 02 §3, §3.2.E).
- **Web Push bridge (SAFETY-1, SPEC-04 §5.6):** pass the Shell's **ready service-worker registration**
  (or `@angular/service-worker` `SwPush`) to `PushChannelFacade`, and relay the SW's
  `notificationclick` / `pushsubscriptionchange` streams into the facade — the Shell owns the SW, the
  EVNT lib owns the subscription logic. On a push click it focuses the dashboard, routes to `/alarm`, and
  asks `AlarmFacade` for an **immediate** `getActiveAlarm` poll (the takeover still renders what the
  projection reports, never the push payload — ADR-005).
- **Detection-lapse alert (SAFETY-GEST-1):** surface `LapseAlertFacade.detectionLapseAlertVm()` so the
  Shell renders the distinct "station not detecting" alert in the Home notice region / escalation-status
  slot — **never** as the emergency takeover (SPEC-02 §2b, LAPSE-3). The lapse poll **reuses the same**
  Page-Visibility / connectivity listeners and `MonitoringVM` as the alarm (one stack, SPEC-04 §6.2); the
  Shell drives both facades from one visibility/online state, it does not register a second listener
  stack. WHILE the facade reports `suppressedByEmergency` the emergency takeover keeps precedence and the
  lapse alert is held back (LAPSE-6); the Shell never ranks a lapse above an unconfirmed emergency.
- **Audit hand-off:** forward alarm-raised-shown, acknowledge, mark-false-positive,
  push-enroll/disable and detection-lapse acknowledge UI actions to `@neuroassist/shared/observability`
  with the Access-Layer correlation id so HIST consumes them downstream (EVNT never calls HIST directly —
  doc 02 §2, ADR-005; BE audits `DetectionLapseAcknowledged` server-side — SPEC-12 LAPSE-7).
- It holds no `HttpClient` and no business state; it observes facade signals.

## 3. `evnt.bootstrap.ts` — lifecycle

```ts
export const evntBootstrap: ModuleBootstrap = {
  init(ctx) {
    // 1. read active tenant + linked patients from @neuroassist/shared/* (EVNT never writes tenant)
    // 2. start the active-alarm poll at the server-advertised pollIntervalSeconds (SPEC-04 §5)
    // 3. wire visibilitychange/online/offline → pause/resume + immediate resume poll (SPEC-04 §5.3/§5.4)
    // 4. mount the Home notice slot + topbar routine-notice indicator, bound to AlarmFacade
    // 5. arm the emergency-takeover observer (auto-route/overlay on an active emergency)
    // 5b. (WHERE evnt.detection-lapse-alert on) start the detection-lapse list poll on the SAME monitoring
    //     model (no second visibility/online stack); mount the embedded "station not detecting" alert;
    //     keep the emergency ranked above the lapse (suppressedByEmergency — LAPSE-6)
    // 6. (WHERE evnt.push-escalation on) bind the Shell SW registration; if permission already granted,
    //    re-register the existing push subscription idempotently (refresh — SPEC-04 §5.6); relay
    //    notificationclick/pushsubscriptionchange; NEVER request permission here (only on gesture — §5.7)
  },
  destroy(ctx) {
    // 1. stop the poll loop; remove the visibilitychange/online/offline listeners (no dangling timers)
    // 2. unmount the notice surfaces and disarm the takeover observer
    // 3. clear module-local AlarmFacade signals (active emergency, routine notices, monitoring state)
    // 4. a tenant switch during the session invalidates any future EVNT state (bootstrap-flow)
    // 5. detach the SW notificationclick/pushsubscriptionchange relays (do NOT unsubscribe the browser
    //    push subscription — it must survive the dashboard being closed; that is the whole point of Tier 0)
  },
};
```

`init` never performs login (owned by `@neuroassist/shared/auth-session`) and never writes the active
tenant. `destroy` must leave no dangling poll timers or event listeners and must clear EVNT signals so a
later re-entry starts clean and never shows a stale alarm.

## 4. `module-descriptors.ts` fallback

If the shell renders before the EVNT lazy chunk resolves, it uses the static
`EVNT_MODULE_DESCRIPTOR.menu` + `shellSurfaces` as the fallback so the Home notice slot and the topbar
indicator reserve their layout (no CLS) and the takeover route resolves without eager-loading the alarm
feature library. The emergency-takeover observer is armed at `init`; until then no alarm can be missed
because the first poll runs at `init` and surfaces any already-active emergency (INV-EVNT-3).

## 5. Service-worker ownership (SAFETY-1 Web Push — shell vs EVNT lib)

> A browser allows **one** service-worker registration per origin/scope and Web Push is **origin-wide**,
> so the SW is a **Shell app** concern, not a lazy-lib concern. The EVNT lib owns the subscription
> *logic* (`PushChannelFacade`, `PUSH_PORT`/adapter) and the enrollment/status UI (SPEC-02 §2a); the
> Shell owns registration and the push event handlers (SPEC-04 §5.6).

- **Shell app `neuroassist-niv-web` owns:**
  - SW registration — Angular `provideServiceWorker('ngsw-worker.js', { enabled: isProd,
    registrationStrategy: 'registerWhenStable:30000' })` **or** a hand-written `sw-push.js`. `ngsw-config.json`
    (+/or `sw-push.js`) and `@angular/service-worker` are **app** `dependencies`/assets in the shell's
    `project.json` — never in `frontend/libs/evnt`.
  - The SW `push` → `showNotification` and `notificationclick` → focus-or-`openWindow('/alarm?event=…')`
    handlers; it `postMessage`s open clients to run the immediate poll.
- **EVNT lib `frontend/libs/evnt` owns:** `PushChannelFacade`, `PUSH_PORT` (http default / mock),
  `PushSubscriptionApiService`, and the §2a components. It reaches the browser only through
  `navigator.serviceWorker.ready` + `registration.pushManager`; it never registers a SW itself (a lazy
  lib does not control app bootstrap or the SW manifest).
- **Constraints:** SW + Push need **HTTPS** (or `localhost`) and, for ngsw, a **production build** — so
  **dev** uses the `PUSH_PORT` **mock** adapter + a stubbed SW while `http` stays the shipped default
  (`scaffold:mock-adapter-default`). The VAPID **public** key is read from `APP_CONFIG.vapidPublicKey`,
  not an EVNT endpoint (api-contract §6).

## Criterios de aceite (EARS)

- WHEN the shell boots, THE SYSTEM SHALL register `EVNT_MODULE_DESCRIPTOR` and reserve the Home notice slot and topbar routine-notice indicator without eager-loading the alarm feature library.
- WHEN EVNT `init` runs, THE SYSTEM SHALL start the active-alarm poll, wire the visibility and connectivity listeners, and arm the emergency-takeover observer.
- WHEN the projection reports an active emergency and `evnt.alarm-autoroute` is on, THE SYSTEM SHALL auto-route to or overlay the full-screen takeover.
- THE SYSTEM SHALL keep the monitoring-limitation state visible across dashboard screens WHILE monitoring is degraded and SHALL NOT hide it behind a submenu.
- WHEN EVNT `destroy` runs, THE SYSTEM SHALL stop the poll loop, remove the visibility and connectivity listeners, and clear module-local alarm signals.
- WHEN an acknowledge or mark-not-real action completes, THE SYSTEM SHALL forward it to `@neuroassist/shared/observability` and SHALL NOT call `console.log`.
- THE SYSTEM SHALL register the service worker in the shell app and SHALL NOT register it from the lazy EVNT library.
- WHEN EVNT `init` runs and notification permission is already granted, THE SYSTEM SHALL re-register the existing push subscription idempotently and SHALL NOT request notification permission outside an explicit caregiver gesture.
- WHEN a push notification is clicked, THE SYSTEM SHALL focus the dashboard on `/alarm` and request an immediate active-alarm poll.
- WHEN EVNT `destroy` runs, THE SYSTEM SHALL detach the push event relays and SHALL NOT unsubscribe the browser push subscription.
- WHEN EVNT `init` runs, THE SYSTEM SHALL start the detection-lapse poll on the same monitoring model as the active-alarm poll and SHALL NOT register a second visibility or connectivity listener stack.
- WHILE the patient has an unconfirmed emergency, THE SYSTEM SHALL keep the emergency takeover ranked above the detection-lapse alert and SHALL NOT render the detection lapse as an emergency.
