# 05 — State and Data Flow — evnt (EVNT)

> Scope: where state lives and how data moves. No Angular code at this stage.

## 1. State topology — ownership is explicit (ADR-005)

The `Event` collection is a **shared read-model** that three modules read for different purposes. In
the prototype they all read one in-memory `EventsFacade`; in production ownership splits:

| Concern | Owner | State it holds |
|---|---|---|
| **Live alarm / notification projection** (active emergency + recent routine notices) | **EVNT** | `AlarmFacade` — a *small, live* signal slice sourced from `evnt-service`; drives `/alarm` and the Home notice slot. |
| **Acknowledge / feedback writes** | **EVNT** | the write path (`confirmedAt/confirmedBy/feedback`); audited to HIST server-side. |
| **Immutable history listing + audit trail** | **HIST** | its own facade/service over the full event log; EVNT does **not** render it. |
| **Cross-patient aggregation / KPIs** | **DASH** | its own aggregation read-model; EVNT does **not** compute totals/trends. |

> **EVNT's facade is a live projection, never a store.** It holds only what the alarm/notice surfaces
> need right now; it never accumulates the full history (that is HIST) and never aggregates across
> patients (that is DASH). This keeps three modules from duplicating a growing in-memory event list.

## 2. Data access pattern

- `AlarmFacade` injects `EVENT_PORT`; the default binding is `EventHttpAdapter`
  (`${ACCESS_HTTP_BASE}/evnt`), **never** the mock (carry-forward `scaffold:mock-adapter-default`).
- **Live delivery = polling (sync REST).** Messaging is disabled, so there is no broker push. The Shell
  polls the EVNT projection on a short interval while the dashboard is foregrounded (emergency budget:
  one read cycle; see ADR-005 for the interval and the pause-when-hidden rule). The FE **never**
  computes "an emergency happened" from a timer — it renders what the projection reports.
- `acknowledge(eventId)` → `POST ${ACCESS_HTTP_BASE}/evnt/events/{id}/acknowledgement` (body derived
  from session; caregiver id server-trusted from JWT) → on success, refresh the projection signal.
- `markFalsePositive(eventId)` → feedback write (`evnt.event.feedback`).
- Components inject the facade only; they never touch `HttpClient` directly.

## 3. Cache strategy

Default: **call the projection endpoint each poll cycle** — the alarm must be fresh, not cached. No
client-side cache of the active emergency. Routine notices may keep a short feature-local `seen` set so
a dismissed notice does not re-pop within the session; that is UI dismissal state, not a data cache.

## 4. Optimistic updates

The acknowledge action **may** optimistically clear the active-emergency takeover for responsiveness,
**but** must roll back and re-raise the alarm if the write fails (rollback = restore the pre-write
projection + show an error banner). Given the mother-flow stakes, the preferred default is
**confirm-then-clear** (await the write) unless latency measurements justify optimism — documented in
ADR-005. The FE never leaves the alarm dismissed on a failed write.

## 5. Error handling

`evnt-service` `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → caregiver message
(`@neuroassist/shared/ui-feedback`). Rules:

- **Read failure** → never render a false "all clear"; show a degraded banner and keep the last known
  state marked stale.
- **Acknowledge failure** → keep the alarm active, surface a retry; do not pretend attendance happened.
- **Correlation** — every call carries the Access-Layer correlation id; failures are reported via
  `@neuroassist/shared/observability`.

## 6. Navigation / shell integration

- EVNT contributes the `/alarm` route and a Shell-embedded routine-notice surface (Home notice slot +
  topbar). The Shell injects `AlarmFacade` to feed those surfaces and to **auto-route / overlay** the
  takeover when an active emergency appears.
- EVNT does not own breadcrumbs beyond its own `/alarm` crumb; the emergency takeover is modal (no
  breadcrumb — total focus, Principle 2.3).
- On acknowledgement, the Shell returns to the prior context (Home); the audited record is thereafter
  readable in **HIST**, not re-rendered by EVNT.
