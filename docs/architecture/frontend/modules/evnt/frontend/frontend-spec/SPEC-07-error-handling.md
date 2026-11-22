# SPEC-07 — Error Handling — evnt (EVNT) Frontend

> BE `ProblemDetail` (RFC 7807) → `AppError` (`@neuroassist/shared/error-model`) → user-facing message
> via `@neuroassist/shared/ui-feedback`. Errors are mapped by the stable `type` **slug**, never by HTTP
> status alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`), and the BE
> `detail`/`correlationId` are preserved — the FE never shows a raw HTTP body
> (`fe-error-handler:raw-http-error-detail`) and never discards the BE detail behind a fixed string
> (`fe-facade:toast-fixed-text-discards-be-detail`). Sources: BE api-contract §8,
> `frontend/05-state-and-data-flow.md` §5, BE `spec/backend/SPEC-03` (safety). **For EVNT the
> highest-stakes rule is the SAFETY one: a read failure MUST NEVER render a false "all clear".**

## 1. Pipeline

```
evnt-service application/problem+json
  → access-http-base error-normalize interceptor (reads `type` slug + detail + correlationId)
  → AppError { code: <slug>, detail, correlationId }
  → feature maps AppError.code → degraded monitoring banner | toast | inline notice error | modal
  → rendered via @neuroassist/shared/ui-feedback (BE detail shown, correlationId attached)
```

## 2. BE `type` slug → FE surface (canonical, api-contract §8)

| BE `type` slug | HTTP | Raised by (FE-reachable path) | FE surface | FE message (English, ADR-018) |
|---|---|---|---|---|
| `unauthorized` | 401 | any caregiver read/write / expired token | redirect to login | — (guard-driven) |
| `forbidden` | 403 | authority check failed (missing `evnt.event.{read,confirm,record}`) | toast | "You don't have permission for this action." |
| `not-found` | 404 | cross-tenant / unlinked patient / unknown event | toast (reads) · inline (writes) | "That alarm is no longer available." (existence never disclosed — INV-EVNT-7) |
| `not-confirmable` | 409 | confirm attempted on a `routine` event (§4.1) | toast | "Only emergencies can be acknowledged." |
| `validation-error` | 400 | bad `verdict` / bad query param on reads / malformed push subscription body (§6.1) | inline notice error | per-field from BE detail |
| `occurred-at-out-of-bounds` | 400 | gesture-report ingest (§2.1) | **not an FE dashboard surface** | — (device path, out of FE scope) |
| `command-not-found` | 404 | gesture-report ingest (§2.1) | **not an FE dashboard surface** | — (device path, out of FE scope) |
| `catalog-unavailable` | 503 | PAT unavailable at ingest (§2.1) | **not an FE dashboard surface** | — (device path, out of FE scope) |
| `audit-unavailable` | 502 | HIST audit write failed at ingest/confirm (§2.1) | toast (if surfaced on confirm) | "Saved, but the audit trail is temporarily unavailable." — the confirm still succeeded; observability flags it |

> The device-path slugs (`occurred-at-out-of-bounds`, `command-not-found`, `catalog-unavailable`) ride on
> `POST /evnt/gesture-reports`, which the dashboard never calls (G-EVNT-5); they are out of FE scope.
> `audit-unavailable` is a BE-side prod policy (api-contract §2.1 TODO); it is surfaced only if a
> caregiver write returns it, and never blocks the acknowledge the caregiver already performed.

## 2.1 SAFETY — read failure is NOT an all-clear (the overriding rule)

A failed/timed-out/paused `GET active-alarm` is a **transport/monitoring** condition, not an empty
result. It drives `MonitoringVM` (SPEC-03 §4, SPEC-04 §5), **not** `AlarmVM.state='none'`:

- **Read failure (transport / 5xx) on the poll** → `MonitoringVM.polling='offline'`/`'stale'`, a visible
  degraded banner with Retry, and the **last known alarm state is held**. The FE NEVER renders "no
  active emergency" from a failed read (doc 05 §5, mandate). An active takeover already on screen STAYS
  on screen.
- **Offline / backgrounded** (not an HTTP error) → the visible monitoring-limitation banner (SPEC-04
  §5.3/§5.4); resume triggers an immediate poll.
- **`not-found` on the active-alarm read** (unlinked/cross-tenant) → treated as "no data for this
  caregiver", a neutral state with the limitation note — never a confident "all clear" claim about a
  patient the caller cannot see (INV-EVNT-7).

## 2.2 Acknowledge (confirm) failure — keep the alarm active

- **Confirm write fails (any error)** → the FE **keeps the alarm active**, returns `AlarmVM.state` to
  `active` (not `acknowledged`), and surfaces a retry; it does **not** pretend attendance happened (doc
  05 §4). If an optimistic clear was used, it rolls back and **re-raises** the alarm (SPEC-04 §4).
- **`not-confirmable` (409)** → the event was `routine`; toast "Only emergencies can be acknowledged"
  and no state change (routine notices are dismissed/feedback, not confirmed — INV-EVNT-5).

## 2.3 Out-of-band escalation client — push lifecycle vs BE errors (SAFETY-1 closure)

The push client distinguishes **browser / push-service lifecycle** conditions (not EVNT errors) from
**BE ProblemDetail** errors:

- **`410 Gone` / `pushsubscriptionchange` (push service, not evnt-service)** → an **expected lifecycle
  transition**, not an error: the FE **resubscribes** and re-`POST`s the subscription, and `DELETE`s the
  stale row where its id is known (SPEC-04 §5.6). It is **never** shown as an error toast.
- **`Notification` permission `denied` / `default`** → not an HTTP error: the push channel degrades
  **visibly** to off with the "SMS and voice still cover" explanation (`PushChannelVM`, SPEC-04 §5.7);
  no toast loop, no fabricated subscription.
- **`validation-error` (400) on `POST /evnt/push-subscriptions`** → a malformed subscription body (rare,
  a client bug); inline error on the enrollment surface from the BE detail — the channel stays off.
- **`forbidden` (403)** on create/delete/escalation-read → toast "You don't have permission for this
  action."; the affordance should already be hidden by RBAC (SPEC-05), so this is defense-in-depth.
- **`not-found` (404) on `DELETE /evnt/push-subscriptions/{id}`** → the row is already gone (idempotent
  success from the caregiver's view): treat as success, no error surface (existence not disclosed —
  INV-EVNT-7).
- **`not-found` (404) on `GET …/escalation-attempts`** → unlinked/cross-tenant: neutral "no trail
  available", never a disclosure.
- **Escalation-attempts read failure (5xx/transport)** → the trail is a **diagnostic aid, not the alarm
  path**: show an inline "couldn't load the escalation trail" with retry; it NEVER affects the alarm
  takeover or the monitoring banner.

## 2.4 Detection-lapse alert — read failure is NOT a "no lapses" all-clear; acknowledge failure keeps it active (SAFETY-GEST-1)

The detection-lapse list poll obeys the **same** overriding safety rule as the active-alarm poll
(§2.1), because a silently-not-detecting station is a life-safety condition (BE SPEC-12):

- **Detection-lapse read failure (transport / 5xx) or paused/offline/stale** → `MonitoringVM` degraded
  banner (the **same** banner as the alarm, §2.1) and the **last known lapse state is held**. The FE
  NEVER renders "no detection lapses" from a failed/paused read — "no lapses" is only a read that
  returned an empty list (SPEC-04 §6.2).
- **`not-found` (404) on `GET …/detection-lapses`** (unlinked/cross-tenant) → a neutral "no lapse data
  for this caregiver" state with the limitation note, never a confident "all clear" about a patient the
  caller cannot see (INV-EVNT-7) and never a disclosure of existence.
- **Acknowledge-lapse write fails (any error)** → the FE **keeps the lapse alert active**, returns
  `DetectionLapseAlertVM.state` to `active` (not cleared), and offers retry; it does not pretend the
  lapse was attended (same posture as confirm, §2.2). If an optimistic clear was used, it rolls back and
  **re-raises** the lapse (SPEC-04 §6.4).
- **`forbidden` (403)** on the lapse read/confirm → toast "You don't have permission for this action.";
  the affordance should already be hidden by RBAC (SPEC-05), so this is defense-in-depth.
- The lapse alert is **separate** from the emergency takeover: a lapse error NEVER affects the
  `/alarm` takeover or the emergency monitoring state, and an unconfirmed emergency always outranks the
  lapse (LAPSE-6, SPEC-04 §6.3).

## 3. Toast vs banner vs modal — criteria

- **Degraded monitoring banner (SAFETY):** the always-visible state when the poll cannot run or failed
  (offline / paused-hidden / stale / read 5xx) — a non-alarm, non-dismissible safety notice with Retry;
  it is NEVER a silent failure and NEVER a false all-clear (SPEC-04 §5, SPEC-03 §4).
- **Toast:** transient, non-blocking outcome of a caregiver action (`forbidden`, `not-found` on a write,
  `not-confirmable`, `audit-unavailable`).
- **Inline notice error:** a `validation-error` on a feedback write, shown on the notice/event card.
- **Modal:** reserved; EVNT has no destructive-confirm flow of its own (acknowledge is a single
  deliberate action, not a destructive one), so modals are not used for routine error display.

## 4. Retry strategy

- **Active-alarm poll (GET):** the poll loop **is** the retry — it continues at the server cadence; a
  failed cycle sets the degraded banner and the next cycle retries automatically (SAFETY: the emergency
  path must keep trying). A manual Retry affordance also forces an immediate poll.
- **Confirm (POST):** **no** silent auto-retry — the caregiver re-initiates via the still-active alarm;
  confirm is idempotent BE-side so a re-tap is safe (INV-EVNT-5).
- **Feedback (POST):** no auto-retry; idempotent per verdict (api-contract §5.1), the caregiver re-acts.

## Criterios de aceite (EARS)

- IF an active-alarm read fails or times out, THEN THE SYSTEM SHALL show the degraded monitoring banner, hold the last known alarm state, and SHALL NOT render a no-active-emergency all-clear.
- IF the backend responds `forbidden`, THEN THE SYSTEM SHALL show a toast and SHALL NOT reveal whether the target event exists.
- IF the backend responds `not-found`, THEN THE SYSTEM SHALL show a toast and SHALL NOT disclose whether the event exists for another tenant or patient.
- IF the backend responds `not-confirmable` on a confirm, THEN THE SYSTEM SHALL show a toast that only emergencies can be acknowledged and SHALL NOT change the alarm state.
- IF a confirm write fails, THEN THE SYSTEM SHALL keep the alarm active, offer retry, and SHALL NOT render the alarm as acknowledged.
- IF the backend responds `validation-error` on a feedback write, THEN THE SYSTEM SHALL show an inline notice error mapped from the backend detail.
- IF the backend responds `unauthorized`, THEN THE SYSTEM SHALL redirect to the login route.
- IF the backend responds `audit-unavailable` after a successful confirm, THEN THE SYSTEM SHALL keep the acknowledgement and show a non-blocking toast that the audit trail is temporarily unavailable.
- THE SYSTEM SHALL map every EVNT error by its `type` slug and SHALL NOT branch on HTTP status alone.
- THE SYSTEM SHALL preserve the backend `detail` and `correlationId` in every surfaced EVNT error and SHALL NOT display a raw HTTP response body.
- IF a push subscription is `410 Gone` or the browser fires `pushsubscriptionchange`, THEN THE SYSTEM SHALL resubscribe and re-register the subscription and SHALL NOT display a backend error toast.
- IF the backend responds `validation-error` on a push-subscription register, THEN THE SYSTEM SHALL show an inline enrollment error from the backend detail and keep the push channel off.
- IF a push-subscription delete responds `not-found`, THEN THE SYSTEM SHALL treat the channel as already removed and SHALL NOT show an error.
- IF the escalation-attempts read fails, THEN THE SYSTEM SHALL show an inline retry on the trail only and SHALL NOT affect the alarm takeover or the monitoring banner.
- IF a detection-lapse read fails or times out, THEN THE SYSTEM SHALL show the degraded monitoring banner, hold the last known detection-lapse state, and SHALL NOT claim there are no detection lapses.
- IF the backend responds `not-found` on a detection-lapse read, THEN THE SYSTEM SHALL show a neutral no-lapse-available state and SHALL NOT disclose whether the detection lapse exists for another tenant or patient.
- IF an acknowledge-lapse write fails, THEN THE SYSTEM SHALL keep the detection-lapse alert active, offer retry, and SHALL NOT render it as acknowledged.
