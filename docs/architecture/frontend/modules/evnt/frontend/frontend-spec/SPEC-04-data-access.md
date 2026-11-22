# SPEC-04 — Data Access — evnt (EVNT) Frontend

> `Component → AlarmFacade (signals) → EVENT_PORT (Http/Mock adapter) → HttpClient via access-http-base →
> evnt-service`. The HTTP adapter is the only holder of `HttpClient`; the facade exposes `signal<T>`
> private + `.asReadonly()` and `computed` derivations. Every call carries the bearer token + correlation
> id via the interceptor; tenant scope is derived server-side from the JWT claim, never from
> `X-Tenant-Id` (api-contract §0.1, INV-EVNT-1). Base path is the **gateway** prefix `/evnt`, not
> `/api/v1` (carry-forward `http-adapter:wrong-prefix`). Sources: BE
> `../../../../backend/services/evnt-service/contracts/api-contract.md`, BE `spec/backend/SPEC-03-alarm-delivery-safety.md`,
> `frontend/05-state-and-data-flow.md`, local `adr/ADR-005`.

## 1. Master resource table

The FE dashboard consumes **only** the caregiver paths (api-contract §3–§5). The device path
`POST /evnt/gesture-reports` (§2, `edge.device` token, `evnt.event.ingest`) and `GET /evnt/health` (§6)
are **out of FE scope** — the station/edge agent and ops own them.

| Resource | Endpoint (BE-canonical) | Service | Facade | Operations | Cache? |
|---|---|---|---|---|---|
| ActiveAlarm | `GET /evnt/patients/{patientId}/active-alarm` | `EventApiService.getActiveAlarm` | `AlarmFacade` | getActiveAlarm (**poll**, §5) | no — read every cycle |
| PatientEvents | `GET /evnt/patients/{patientId}/events` | `EventApiService.listPatientEvents` | `AlarmFacade` | listPatientEvents (routine-notice feed, slow poll) | no |
| Event | `GET /evnt/events/{eventId}` | `EventApiService.getEvent` | `AlarmFacade` | getEvent | no |
| Confirmation | `POST /evnt/events/{eventId}/confirmation` | `EventApiService.confirmAlarm` | `AlarmFacade` | confirmAlarm | — (write) |
| Feedback | `POST /evnt/events/{eventId}/feedback` | `EventApiService.recordFeedback` | `AlarmFacade` | recordFeedback (`{verdict}`) | — (write) |
| PushSubscription | `POST /evnt/push-subscriptions` (§6.1) · `DELETE /evnt/push-subscriptions/{subscriptionId}` (§6.2) | `PushSubscriptionApiService.create` / `.delete` | `PushChannelFacade` | createPushSubscription (idempotent), deletePushSubscription | — (write) |
| EscalationAttempts | `GET /evnt/events/{eventId}/escalation-attempts` (§3.4) | `EventApiService.listEscalationAttempts` | `AlarmFacade` | listEscalationAttempts (masked) | no — on-demand, read every open |
| DetectionLapses | `GET /evnt/patients/{patientId}/detection-lapses?status=open\|all` (§11.1) | `DetectionLapseApiService.listDetectionLapses` | `LapseAlertFacade` | listDetectionLapses (**poll**, reuses the monitoring model — §6) | no — read every cycle |
| DetectionLapseConfirmation | `POST /evnt/detection-lapses/{lapseId}/confirmation` (§12.1) | `DetectionLapseApiService.acknowledgeDetectionLapse` | `LapseAlertFacade` | acknowledgeDetectionLapse | — (write) |

> **New resources (SAFETY-GEST-1 closure, ADR-006 / BE SPEC-12, product decision 2026-11-20).** These are
> the FE's half of the detection-lapse alert. `DetectionLapses` is the distinct "station not detecting"
> list (BE §11); `DetectionLapseConfirmation` is the caregiver acknowledgement that stops BE escalation
> (BE §12, LAPSE-5). The **raise/resolve** endpoints (§10.1/§10.2, authorities
> `evnt.detection-lapse.create`/`evnt.detection-lapse.resolve`) are a **service-client `edge-service`**
> path — **out of FE scope**, exactly like the `edge.device` gesture-report ingest (§Master table note):
> the dashboard never calls them. There is **no** per-lapse escalation-attempts endpoint in this contract
> version, so the FE exposes no lapse attempts trail (§6, SPEC-03 §4c).

> **New resources (SAFETY-1 closure, ADR-005 / BE SPEC-11, product decision 2026-11-20).** These are the
> FE's half of the out-of-band escalation. `PushSubscription` registers the browser's Web Push
> subscription as the BE **Tier 0** channel (`T+0 s`); the BE then escalates **SMS Tier 1 (`T+30 s`) →
> voice Tier 2 (`T+90 s`)** for any still-unconfirmed emergency, stopping on confirmation (ESC-1/ESC-2).
> `EscalationAttempts` reads the masked attempt trail for an event (who was notified, channel, outcome).
> The phone tiers depend on the caregiver phone number, which **ACS does not yet expose**
> (`INT-EVNT-ACS-001`, OPEN) — until it lands, Tiers 1/2 record `no-contact` BE-side and the FE shows the
> phone channels as **unavailable, honestly** (SPEC-03 `PushChannelVM`, §5.2).

Cache strategy = **none for the alarm**: the active emergency must be fresh, not cached (doc 05 §3). A
`tenant-context` change invalidates any future EVNT state. Routine notices keep a short feature-local
`seen` set (UI dismissal, not a data cache). The FACADE is a **live projection, never a store** — it
holds only the current active emergency and the recent routine notices, never the full history (HIST)
and never cross-patient totals (DASH) (ADR-005 §Decision 1).

## 2. Adapter default (carry-forward, Learning ev=7) — HTTP

`evnt.providers.ts` MUST default the adapter to **`http`** because `evnt-service` exists (its
api-contract is published). `EventHttpAdapter` is based at **`${ACCESS_HTTP_BASE}/evnt`**;
`EventMockAdapter` serves fixtures in the same wire shape via the same mappers. A providers spec MUST
prove the default is `http`, not mock (`scaffold:mock-adapter-default:shell-provider-not-switched-to-http`).

> Supersedes the vision pre-condition (`frontend/04` §8 implied a mock default while `evnt-service` was
> being architected in parallel). That pre-condition is resolved: the evnt-service api-contract exists,
> so the default is `http` (gap G-EVNT-3). `MockAdapter` remains available only under an explicit mock
> provider for tests / offline dev.

## 3. Wire records (mirror BE 1:1) and mappers

```ts
type Urgency = 'emergency' | 'routine';
type Feedback = 'not_evaluated' | 'real' | 'false_positive';

// mirror of GET /evnt/patients/{id}/active-alarm (api-contract §3.1)
interface ActiveAlarmEnvelopeWire {
  activeAlarm: AlarmEventWire | null;   // null → no active emergency (a POSITIVE answer, not absence)
  serverTime: string;                   // ISO; used for skew/stalled-loop detection (§5)
  pollIntervalSeconds: number;          // server-advertised cadence (default 3) — the FE ADOPTS it (§5)
}
interface AlarmEventWire {
  id: string; patientId: string; commandId: string;
  commandLabel: string; urgency: Urgency; occurredAt: string;
  confirmedAt: string | null; feedback: Feedback;
  // NOTE: no patientName / caregiverName in the BE payload (G-EVNT-6) — resolved separately, not fabricated.
}
// mirror of GET /evnt/patients/{id}/events (§3.2)
interface PatientEventsPageWire {
  events: EventRowWire[];
  nextBefore: string | null;            // keyset page cursor by occurredAt
}
interface EventRowWire {
  id: string; commandLabel: string; urgency: Urgency;
  occurredAt: string; confirmedAt: string | null; feedback: Feedback;
}
// mirror of POST /evnt/events/{id}/confirmation response (§4.1)
interface ConfirmationResultWire {
  id: string; urgency: 'emergency';
  confirmedAt: string; confirmedBy: string; feedback: Feedback;
}
// mirror of POST /evnt/events/{id}/feedback request/response (§5.1)
interface FeedbackRequestWire  { verdict: 'real' | 'false_positive'; }
interface FeedbackResultWire   { id: string; feedback: Feedback; }

// mirror of POST /evnt/push-subscriptions request/response (api-contract §6.1)
interface PushSubscriptionRequestWire {
  endpoint: string;                     // from PushSubscription.endpoint (browser Push API)
  keys: { p256dh: string; auth: string }; // from PushSubscription.getKey('p256dh'|'auth'), base64url
  userAgent?: string;                   // optional diagnostics; NOT caregiverId/tenantId (JWT-derived — INV-EVNT-1)
}
interface PushSubscriptionResultWire { id: string; createdAt: string; } // 201 new OR 200 idempotent re-register
// mirror of GET /evnt/events/{id}/escalation-attempts (api-contract §3.4)
type EscalationChannel = 'web_push' | 'sms' | 'voice';
type EscalationStatus  = 'sent' | 'failed';
interface EscalationAttemptWire {
  tier: 0 | 1 | 2; channel: EscalationChannel; caregiverId: string;
  target: string;                       // ALREADY MASKED BE-side ("+55•••••1234", "sub:chrome-…") — never the raw endpoint/keys
  status: EscalationStatus; providerMessageId?: string; errorReason?: string; attemptedAt: string;
}
interface EscalationTrailWire { eventId: string; urgency: 'emergency'; attempts: EscalationAttemptWire[]; }

// mirror of GET /evnt/patients/{id}/detection-lapses (api-contract §11.1)
type LapseCause = 'NOT_RUNNING' | 'HEARTBEAT_STOPPED';
type DetectionState = 'RUNNING' | 'PAUSED' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
type LapseStatus = 'open' | 'acknowledged' | 'resolved';
interface DetectionLapseWire {
  id: string; deviceId: string; cause: LapseCause;
  detectionState: DetectionState | null;   // optional in the BE payload — kept nullable, never guessed
  status: LapseStatus;
  lapseStartedAt: string; acknowledgedAt: string | null; resolvedAt: string | null;
}
interface DetectionLapsePageWire {
  patientId: string; lapses: DetectionLapseWire[];
  pollIntervalSeconds?: number;             // server-advertised cadence when present — the FE ADOPTS it (§6); else reuse the alarm cadence
}
// mirror of POST /evnt/detection-lapses/{id}/confirmation response (api-contract §12.1)
interface DetectionLapseAckResultWire {
  id: string; status: 'acknowledged'; acknowledgedAt: string; acknowledgedBy: string;
}
```

- `toAlarmVM`, `toRoutineNoticeVM`, `toAcknowledgedVM` convert wire → VM (SPEC-03). The mapper reads
  `commandLabel`/`urgency`/`occurredAt` verbatim and **joins** the resolved `patientName`/
  `confirmedByName` from the name resolver — it never invents them (G-EVNT-6,
  `fe-facade:fabricated-null-fields`).
- Request bodies send every field the BE requires and no more
  (`http-adapter:request-body-field-whitelist`): confirmation → `{}` (empty); feedback →
  `{ verdict }`; the reads carry no body. The confirm body is empty — `confirmedBy` is server-trusted
  from the JWT `sub`, never sent by the FE (api-contract §4.1).

## 4. Operations — semantics

| Operation | Verb · path | Idempotent? | Optimistic? |
|---|---|---|---|
| getActiveAlarm | `GET /evnt/patients/{id}/active-alarm` | n/a (read) | — (the poll — §5) |
| listPatientEvents | `GET /evnt/patients/{id}/events?urgency=routine&limit=` | n/a (read) | — (routine-notice feed, slow poll) |
| getEvent | `GET /evnt/events/{id}` | n/a (read) | — |
| confirmAlarm | `POST /evnt/events/{id}/confirmation` | yes (BE §4.1 idempotent — INV-EVNT-5) | **confirm-then-clear by default** (await write); optimistic clear ONLY with rollback that re-raises |
| recordFeedback | `POST /evnt/events/{id}/feedback` | yes (BE §5.1 idempotent per verdict) | pessimistic |
| createPushSubscription | `POST /evnt/push-subscriptions` | yes (BE §6.1 idempotent on `(tenantId, endpoint)` — `201` new / `200` re-register) | pessimistic — await write, THEN mark the channel enrolled |
| deletePushSubscription | `DELETE /evnt/push-subscriptions/{id}` | yes (BE §6.2 idempotent for owned rows) | pessimistic |
| listEscalationAttempts | `GET /evnt/events/{id}/escalation-attempts` | n/a (read) | — (on-demand, not polled) |
| listDetectionLapses | `GET /evnt/patients/{id}/detection-lapses?status=open` | n/a (read) | — (the lapse poll — §6) |
| acknowledgeDetectionLapse | `POST /evnt/detection-lapses/{id}/confirmation` | yes (BE §12.1 idempotent) | **ack-then-clear by default** (await write); same mother-flow stakes as confirm — optimistic clear ONLY with a rollback that re-raises the lapse |

- **Push subscription write body** sends exactly `{ endpoint, keys:{p256dh,auth}, userAgent? }`
  (`http-adapter:request-body-field-whitelist`); `caregiverId`/`tenantId` are **JWT-derived server-side
  and NEVER sent** (INV-EVNT-1, api-contract §6.1). The `delete` path carries no body.
- **Escalation targets stay masked.** `toEscalationAttemptVM` reads `target` verbatim — the FE **never**
  unmasks, re-derives, or joins a full phone/endpoint onto the masked value (`fe-facade:fabricated-null-fields`
  inverse: it must not *enrich* a deliberately masked field either). `providerMessageId`/`errorReason`
  render as a short status note, never a raw provider payload.

**Acknowledge is confirm-then-clear by default** (ADR-005 §Decision 2, doc 05 §4): the FE awaits the
`200` before clearing the takeover, because the mother-flow stakes make a false "attended" unacceptable.
Optimistic clear is **allowed only** with a rollback that restores the pre-write projection and
**re-raises** the alarm on failure, plus an error banner — the FE NEVER leaves the alarm dismissed on a
failed write (doc 05 §4). Confirm is routed through `canConfirmEventGuard`
(`AccessDecisionService.can('evnt.event.confirm')`) at the handler, not only the route (SPEC-01 §1).
`recordFeedback` (`evnt.event.record`) is a separate axis from confirm (doc 03 §1) — marking
`false_positive` is never inferred.

## 5. SAFETY — polling, Page Visibility and connectivity contract (critical sub-feature)

> **This is an assistive / life-safety product.** The emergency alarm is the whole reason EVNT exists.
> **In-app delivery is dashboard polling** (BE SPEC-03); **SAFETY-1 is now CLOSED by design** by an
> out-of-band escalation ladder that runs **inside EVNT** (product decision 2026-11-20, ADR-005 / BE
> SPEC-11): on an unconfirmed emergency the BE escalates **Web Push (Tier 0, `T+0 s`) → SMS (Tier 1,
> `T+30 s`) → voice (Tier 2, `T+90 s`)** to every linked caregiver, stopping the instant the emergency
> is confirmed (ESC-1/ESC-2). This section is the FE's half of **both** contracts: it keeps the polling
> limits **visible and testable** AND specifies the Web Push **client** (the Tier 0 enrollment the FE
> owns — §5.6) plus the honest channel-status surface (§5.7). It mirrors BE
> `spec/backend/SPEC-03-alarm-delivery-safety.md` and BE `SPEC-11-emergency-escalation.md`.

### 5.1 Polling cadence (server-advertised)

- The `AlarmFacade` **polls** `GET /evnt/patients/{id}/active-alarm` at the **server-advertised**
  `pollIntervalSeconds` (default **3 s**) from the response envelope — it ADOPTS the server cadence and
  **never hardcodes** it, so the budget is tunable without a client release (BE SPEC-03 Decision 1).
- The routine-notice feed (`listPatientEvents`) polls on a **slower** cadence (≈ 10 s) — it is **not**
  the emergency path (BE SPEC-03 Decision 1).
- The FE renders what the projection reports and **never** infers "an emergency happened" from a timer
  (doc 05 §2, doc 03 §5). The read is strongly consistent server-side: a committed emergency is visible
  to the **very next** poll (INV-EVNT-3).

### 5.2 What the in-app poll budget does / does not guarantee, and how SAFETY-1 is now covered

- The ≤ **5 s p95** commit-to-visibility budget still applies **only** WHILE the caregiver client is
  **foregrounded and online** (`MonitoringVM.polling='live'`, BE SPEC-03 Decision 2) — **the in-app
  polling limits of §5.3–§5.5 are unchanged**. The FE never claims this budget while hidden/offline/stale.
- **SAFETY-1 — CLOSED by design (product decision 2026-11-20, ADR-005 / BE SPEC-11).** Polling alone
  cannot reach a backgrounded/asleep/closed/offline client; that gap is now covered by the **out-of-band
  escalation ladder** running inside EVNT **alongside** polling. No event is lost either way (INV-EVNT-3
  keeps the emergency in the `active-alarm` query until confirmed). **What the FE now GUARANTEES:** it
  enrolls the browser as the Tier 0 Web Push channel when permission is granted (§5.6), keeps that
  subscription live (refresh / `410 Gone` → resubscribe), and shows the caregiver **honestly** which
  channels are armed (§5.7). **What the FE still does NOT guarantee:** physical receipt — a voice/SMS
  still needs cellular coverage and a powered, reachable phone; Web Push still needs a live subscription
  and a reachable push service; and the phone tiers need the caregiver phone number, which **ACS does not
  yet expose** (`INT-EVNT-ACS-001`, OPEN) so Tiers 1/2 currently record `no-contact` BE-side. The FE
  surfaces each of these as a visible channel state, never a silent failure and never a false "covered".
  → residuals recorded in `contracts/backend-api-cross-link.md` §3 and doc 06.

### 5.3 Page Visibility change (`document.visibilitychange`)

- WHILE the tab is **hidden**, browsers throttle/suspend background timers and network (background-tab
  throttling clamps and deprioritizes `setInterval`/`fetch`), so the fast 3 s emergency poll is **not
  reliable**. The FE therefore treats hidden as a **degraded** state: `MonitoringVM.polling='paused-hidden'`,
  `foregroundRequired=true`, and the visible `MonitoringStatusBanner` tells the caregiver to keep the
  window in front (SPEC-02 §1). The FE does **not** pretend the hidden tab is covered.
- WHEN the tab becomes **visible**, THE FE issues an **immediate** `getActiveAlarm` poll (bypassing the
  interval) and resumes the normal cadence — it does **not** wait up to one interval to re-learn the
  state. If that immediate read surfaces a still-active emergency, the takeover renders at once
  (INV-EVNT-3 keeps it available).
- WHILE hidden, the FE NEVER transitions `AlarmVM` to `none`: a missed/throttled poll is not an
  all-clear (§5.5).

### 5.4 Connectivity loss (`navigator.onLine` / transport error)

- WHEN the client goes **offline** (the `offline` event or a transport-level read failure),
  `MonitoringVM.polling='offline'`, `foregroundRequired=true`, and the FE shows the visible
  offline/degraded banner while **holding the last known alarm state** — it NEVER renders "no active
  emergency" while it cannot poll (doc 05 §5 "Read failure → never render a false all-clear").
- WHEN connectivity returns (the `online` event), THE FE issues an **immediate** poll and resumes the
  cadence.
- **Clock-skew / stalled loop:** the FE compares `serverTime` to wall time each cycle; if successful
  polls stop advancing or skew exceeds the interval it sets `polling='stale'` and surfaces the stale
  banner (BE SPEC-03 Edge cases).

### 5.5 In-page foreground cue (unchanged) + relation to the real Web Push channel

- WHILE foreground, an emergency still triggers the in-page audible + visual alarm (part of the
  takeover). The local in-page `Notification`/audio cue under flag `evnt.alarm-notification` remains a
  **foreground courtesy only** — it never was and is not a delivery guarantee.
- **What changed:** the *real* out-of-band delivery is now the **Web Push subscription** registered in
  §5.6 (BE Tier 0), which — unlike an in-page `Notification` — is delivered by the OS push service to a
  **backgrounded or closed** tab via the service worker. The service-worker `notificationclick` focuses
  the dashboard on `/alarm` (§5.6). So the background nudge is no longer the FE's only backgrounded
  story; it is a foreground extra on top of Tier 0 Web Push + Tier 1/2 SMS/voice.
- **SAFETY-2 (residual, partially addressed):** the time-based ladder now escalates Web Push → SMS →
  voice to **every caregiver linked to the patient** (ESC-3); routing to an *unlinked* secondary /
  coordinator role is still deferred (BE SPEC-03 SAFETY-2 residual). The FE's on-screen alarm still never
  auto-clears until confirmed.

### 5.6 Web Push client — service worker + subscription lifecycle (Tier 0, the FE owns this)

> The FE registers the browser as the BE **Tier 0** channel. BE SPEC-11 §6 is the server side; this is
> the client side. The VAPID **public** key is read from **app config** (`APP_CONFIG.vapidPublicKey`),
> not from an EVNT endpoint (api-contract §6 note). Consumed via `PushChannelFacade → PUSH_PORT
> (Http/Mock) → PushSubscriptionApiService` — same adapter rules as every other resource (default
> `http`, base `${ACCESS_HTTP_BASE}/evnt`, bearer + correlation id).

- **Where it lives (EVNT lib vs shell).** The **service-worker registration is a SHELL concern**: a
  browser allows **one** SW registration per origin/scope and push is **origin-wide**, so the shell app
  `neuroassist-niv-web` registers the SW (via Angular `provideServiceWorker('ngsw-worker.js', { enabled:
  isProd, registrationStrategy: 'registerWhenStable:30000' })`, or a hand-written `sw-push.js`) and owns
  the `notificationclick` handler. The **EVNT lib owns the subscription LOGIC and UI** —
  `PushChannelFacade`, `PUSH_PORT`/adapter, `PushEnrollmentComponent`, `EscalationChannelStatusComponent`
  (SPEC-02 §5). A lazy lib cannot register a SW (it does not control app bootstrap or the SW manifest),
  so the lib depends only on `navigator.serviceWorker.ready` + `registration.pushManager`; the Shell
  passes the ready registration (or uses `@angular/service-worker` `SwPush`) into
  `EvntShellIntegrationService` (SPEC-06 §5).
- **Nx / Angular service-worker implications.** `ngsw-worker.js` + `ngsw-config.json` (and/or the custom
  `sw-push.js`) live in the **shell app** `src/`, listed in `project.json` `assets`/`serviceWorker` — not
  in the lib. `@angular/service-worker` is an **app** dependency; `SwPush.messages` /
  `SwPush.notificationClicks` give the push + click streams. SW + Push require **HTTPS** (or
  `localhost`) and a **production build** for ngsw — so in dev the push path uses the `PUSH_PORT` **mock
  adapter** and a stubbed SW (`scaffold:mock-adapter-default` still proves `http` is the shipped default).
- **Subscribe (create).** On enrollment (§5.7 — never on first paint): `permission = await
  Notification.requestPermission()`; WHERE `granted`, `sub = await registration.pushManager.subscribe({
  userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(APP_CONFIG.vapidPublicKey) })`; then
  `POST /evnt/push-subscriptions` with `{ endpoint, keys:{p256dh,auth}, userAgent }`. The BE is
  idempotent on `(tenantId, endpoint)` (`201` new / `200` re-register), so re-enroll is safe.
- **Refresh.** On every shell start WHILE permission is `granted`, read the existing
  `pushManager.getSubscription()`; if present, **re-POST** it (idempotent — keeps the BE row fresh and
  re-binds it to the current caregiver/tenant); if absent, resubscribe and POST.
- **`pushsubscriptionchange` / `410 Gone` → resubscribe.** The push service can expire a subscription.
  WHEN the SW fires `pushsubscriptionchange`, OR a push send later makes the endpoint stale, the FE
  **resubscribes** (`pushManager.subscribe` again) and `POST`s the new subscription; the old row is
  removed with `DELETE /evnt/push-subscriptions/{oldId}` where its id is known. A `410 Gone` observed on
  a client-side probe is treated as "subscription expired → resubscribe", **not** as a BE error toast —
  it is an expected lifecycle transition (§5.7 keeps the channel status truthful across it).
- **Unsubscribe (delete).** WHEN the caregiver turns the push channel off (§5.7), `await
  sub.unsubscribe()` locally **and** `DELETE /evnt/push-subscriptions/{subscriptionId}` so the BE stops
  targeting a dead endpoint. Delete is idempotent for owned rows (§6.2).
- **Permission denied.** IF `Notification.requestPermission()` returns `denied` (or `default` with no
  grant), the FE does **NOT** retry in a loop and does **NOT** fabricate a subscription. The push channel
  shows **degraded / off, VISIBLY** (§5.7), with a plain explanation that **SMS and voice (Tier 1/2)
  still cover** the caregiver (once ACS exposes the phone) and that the on-screen alarm still runs — the
  caregiver is never silently left thinking they are covered when they are not, and never blocked by a
  prompt loop (carry-forward `fe-push:permission-denied-must-degrade-visibly-not-loop`).
- **Notification click → `/alarm`.** The SW `notificationclick` (or `SwPush.notificationClicks`) focuses
  an existing dashboard client if one is open (and `postMessage`s it to run an immediate `getActiveAlarm`
  poll), else `clients.openWindow('/alarm?event=<eventId>')`. `/alarm` is the global takeover (SPEC-01
  §1.1): the click brings the caregiver to the focused emergency; the event id rides the push payload and
  triggers the immediate poll, it is not trusted to *render* an alarm by itself (ADR-005 "alarm state is
  read, never derived" — the takeover still renders what the next projection read reports).

### 5.7 Permission / onboarding UX and the honest channel-status surface

- **When to ask.** Notification permission is requested **never on first paint** and **never on a
  silent page load** — only from an **explicit caregiver gesture** in the enrollment affordance
  (`PushEnrollmentComponent`, SPEC-02 §5), after a one-line explanation of *why* ("so we can still reach
  you when this window isn't in front"). This avoids the browser permanently hard-blocking the origin
  after an unexplained `default`→dismiss, which would silently kill Tier 0 (carry-forward
  `fe-push:no-permission-prompt-on-first-paint`).
- **Re-ask affordance.** IF the caregiver previously dismissed (`default`) the FE keeps a visible
  "Enable alarm notifications" affordance; IF the browser has hard-`denied`, the FE shows how to
  re-enable it in site settings (it cannot re-prompt) — it never pretends push is on.
- **Channel-status indicator (honest).** An always-reachable `EscalationChannelStatusComponent` renders
  `PushChannelVM` (SPEC-03 §5): **Push** = on / off / blocked / unsupported; **SMS** and **Voice** =
  available / `contact-missing`. WHILE ACS does not expose the caregiver phone (`INT-EVNT-ACS-001`,
  OPEN), SMS/Voice show **"contact missing — add a phone number to enable"**, not a green "covered": the
  status is the truth, so the caregiver knows exactly which tiers protect them right now (BE SPEC-03
  residuals, mandate: limitation is visible). The FE derives phone-channel availability from a BE/ACS
  capability signal, **never** guesses it from the absence of data.

## 6. SAFETY-GEST-1 — detection-lapse alert: polling, precedence, acknowledge and auto-clear

> **This is a life-safety path** (BE SPEC-12: a station connected but silently not *detecting* is EDGE's
> "worst failure mode"). A lapse produces **no** `event`, so the FE reads it from its own list
> (`GET /evnt/patients/{id}/detection-lapses`) and alerts on it distinctly — never as the emergency
> takeover. This section is the FE's half of ADR-006 / BE SPEC-12: a `LapseAlertFacade` that **reuses the
> `AlarmFacade` monitoring model** (server-advertised cadence, Page-Visibility/connectivity handling,
> read-failure = degraded, never a false all-clear) and the caregiver acknowledgement that stops BE
> escalation.

### 6.1 Facade and adapter

- `LapseAlertFacade` consumes `LAPSE_PORT` (Http default / Mock) → `DetectionLapseApiService`, based at
  **`${ACCESS_HTTP_BASE}/evnt`** on the **`http`** adapter — the **same** adapter rules as every other
  resource (§2); a providers spec proves the default is `http`. It exposes `signal<T>` private +
  `.asReadonly()` and `computed` derivations (`detectionLapseAlertVm()` — SPEC-03 §4c). Like
  `AlarmFacade` it is a **live projection, never a store**: it holds only the current open lapses, never
  history (HIST owns the audit `DetectionLapseRaised/Resolved/Acknowledged`).

### 6.2 Polling reuses the AlarmFacade monitoring model (do not fork it)

- The lapse list is **polled**; the FE **adopts** the server-advertised cadence
  (`DetectionLapsePageWire.pollIntervalSeconds` when present, else the alarm's `pollIntervalSeconds`) and
  **never hardcodes** it (mirror §5.1). The poll runs on the **same** `MonitoringVM`
  Page-Visibility/connectivity machinery as the alarm (§5.3/§5.4) — one visibility + connectivity listener
  stack owned by the Shell (SPEC-06 §2), not a second one.
- **Read failure / paused / offline / stale → degraded, never "no lapses".** Exactly as the alarm poll
  (§5.2–§5.5), a failed/paused/throttled lapse read is a **monitoring** condition: the facade holds the
  last known lapse state and the `MonitoringStatusBanner` shows degraded — it **NEVER** renders a "no
  detection lapses" all-clear while it cannot poll. "No lapses" is a **positive** server answer (a read
  that returned an empty list), never the absence of a read.

### 6.3 Emergency precedence (LAPSE-6)

- WHILE the patient has an unconfirmed emergency (`AlarmVM.state='active'`), the facade sets
  `DetectionLapseAlertVM.suppressedByEmergency=true`: the lapse alert is **held back** (not cleared) and
  never shown above or as the emergency. It resumes on the next read after the emergency is confirmed
  while the lapse is still open. The FE never *promotes* a lapse to an emergency and never *demotes* an
  emergency to a lapse — precedence is applied in the facade's `computed`, not in a component.

### 6.4 Acknowledge (confirm) and auto-clear

- **Acknowledge is ack-then-clear by default** (same mother-flow stakes as `confirmAlarm`, §4): the FE
  awaits the `200` from `POST /evnt/detection-lapses/{id}/confirmation` (authority
  `evnt.detection-lapse.confirm`) before removing the lapse from the active alert; an optimistic clear is
  allowed **only** with a rollback that re-raises the lapse on failure. The confirm body is empty (`{}`);
  `acknowledgedBy` is server-trusted from the JWT `sub`, never FE-sent. The write is idempotent BE-side
  (§12.1), so a re-tap is safe.
- **Auto-clear.** The alert clears for a lapse that the next read reports `resolved` (EDGE's resolve —
  station back to `RUNNING`) or `acknowledged`. The FE **never** clears a lapse from a timer or from
  device/network state; it clears only from a read that reported the lapse closed (mirror of ADR-005
  "state is read, never derived").

### 6.5 Service-client endpoints and the (absent) lapse attempts trail

- The **raise** (`POST /evnt/detection-lapses`) and **resolve**
  (`POST /evnt/detection-lapses/{id}/resolution`) endpoints are the EDGE backend's service-client path
  (authorities `evnt.detection-lapse.create`/`.resolve`) — the dashboard **never** calls them and the
  adapter exposes no method for them (same posture as `POST /evnt/gesture-reports`).
- **Escalation-attempt visibility reuse — deferred.** The contract exposes escalation attempts for an
  **event** only (§3.4); there is **no** per-lapse attempts endpoint. The FE therefore shows **no** lapse
  escalation trail in this version (it does not fabricate one). WHERE a future contract adds a lapse
  attempts read, the FE reuses `EscalationAttemptVM` + `evnt.escalation.read` unchanged (SPEC-03 §4c).

## Criterios de aceite (EARS)

- THE SYSTEM SHALL route every EVNT request through `@neuroassist/shared/access-http-base` based at `${ACCESS_HTTP_BASE}/evnt` and SHALL NOT call `HttpClient` from any component.
- THE SYSTEM SHALL default the EVNT data adapter to `http` and SHALL use the mock adapter only under an explicit mock provider.
- THE SYSTEM SHALL poll `GET /evnt/patients/{id}/active-alarm` at the server-advertised `pollIntervalSeconds` and SHALL NOT hardcode the emergency poll cadence.
- THE SYSTEM SHALL render the active alarm from the server projection and SHALL NOT infer an emergency from a client-side timer.
- WHILE the caregiver client is foregrounded and online, THE SYSTEM SHALL treat the five-second commit-to-visibility budget as applicable and SHALL NOT claim that budget while backgrounded or offline.
- WHEN the tab becomes visible, THE SYSTEM SHALL issue an immediate active-alarm poll and SHALL NOT wait a full interval to re-learn the alarm state.
- WHEN connectivity returns, THE SYSTEM SHALL issue an immediate active-alarm poll and resume the normal cadence.
- WHILE the tab is hidden, offline or stale, THE SYSTEM SHALL mark monitoring as degraded and show the visible limitation banner and SHALL NOT render a no-active-emergency all-clear.
- IF an active-alarm read fails or is paused, THEN THE SYSTEM SHALL hold the last known alarm state and SHALL NOT display "no active emergency".
- WHEN a caregiver confirms an emergency, THE SYSTEM SHALL await the confirmation response before clearing the takeover unless an optimistic clear is paired with a rollback that re-raises the alarm on failure.
- IF a confirmation write fails, THEN THE SYSTEM SHALL keep the alarm active and SHALL NOT leave it dismissed.
- WHEN a caregiver records a false-positive verdict, THE SYSTEM SHALL send `{verdict}` to the feedback endpoint under `evnt.event.record` and SHALL NOT infer the verdict automatically.
- WHEN the active tenant changes via `tenant-context.switchTo`, THE SYSTEM SHALL invalidate any future EVNT state.
- WHERE the `evnt.alarm-notification` flag is on and notification permission is granted, THE SYSTEM SHALL raise a best-effort foreground notification without claiming it as a guaranteed delivery channel.
- WHEN the caregiver grants notification permission through the enrollment gesture, THE SYSTEM SHALL subscribe via `pushManager.subscribe` with the config VAPID public key and register the subscription with `POST /evnt/push-subscriptions` under `evnt.subscription.create`.
- THE SYSTEM SHALL request notification permission only from an explicit caregiver gesture and SHALL NOT prompt on first paint or in a retry loop.
- IF the caregiver denies notification permission, THEN THE SYSTEM SHALL mark the push channel off visibly, explain that SMS and voice still cover, and SHALL NOT fabricate a push subscription or re-prompt repeatedly.
- WHEN the shell starts and notification permission is already granted, THE SYSTEM SHALL re-register the existing browser subscription idempotently and SHALL NOT create a duplicate active channel.
- WHEN the browser reports `pushsubscriptionchange` or a subscription is `410 Gone`, THE SYSTEM SHALL resubscribe and register the new subscription and SHALL NOT surface it as a backend error toast.
- WHEN the caregiver turns the push channel off, THE SYSTEM SHALL unsubscribe locally and call `DELETE /evnt/push-subscriptions/{subscriptionId}` under `evnt.subscription.delete`.
- WHEN a push notification is clicked, THE SYSTEM SHALL focus the dashboard on `/alarm` and issue an immediate active-alarm poll and SHALL NOT render an emergency from the push payload alone.
- WHILE ACS does not expose the caregiver phone (`INT-EVNT-ACS-001`), THE SYSTEM SHALL show the SMS and voice channels as contact-missing and SHALL NOT present them as covered.
- WHEN the escalation-attempts view is opened for an emergency, THE SYSTEM SHALL read `GET /evnt/events/{id}/escalation-attempts` under `evnt.escalation.read` and render the attempts with destinations masked, and SHALL NOT unmask or enrich the masked destination.
- THE SYSTEM SHALL poll `GET /evnt/patients/{id}/detection-lapses` at the server-advertised poll interval reusing the alarm monitoring model and SHALL NOT hardcode the detection-lapse poll cadence.
- WHILE detection-lapse polling is paused, offline or stale, THE SYSTEM SHALL mark detection-lapse monitoring degraded, hold the last known detection-lapse state, and SHALL NOT claim there are no detection lapses.
- WHILE the patient has an unconfirmed emergency, THE SYSTEM SHALL suppress the detection-lapse alert behind the emergency and SHALL NOT surface the detection lapse as an emergency.
- WHEN a caregiver acknowledges a detection lapse, THE SYSTEM SHALL send the empty confirmation to `POST /evnt/detection-lapses/{id}/confirmation` under `evnt.detection-lapse.confirm` and SHALL NOT infer the acknowledgement automatically.
- WHEN an already-acknowledged or resolved detection lapse is acknowledged again, THE SYSTEM SHALL treat the acknowledgement as idempotent and SHALL NOT surface a backend error.
- WHEN a detection lapse is reported resolved or acknowledged by a read, THE SYSTEM SHALL auto-clear the detection-lapse alert and SHALL NOT clear it from a client-side timer.
- THE SYSTEM SHALL treat the detection-lapse raise and resolve endpoints as a service-client path and SHALL NOT call them from the dashboard adapter.
