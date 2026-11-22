# 05 — State and Data Flow — hist (HIST)

> Scope: where state lives and how data moves. No Angular code at this stage.

## 1. State topology — ownership is explicit (ADR-005)

The `Event` collection and the audit trail are **shared read-models** that several modules touch for
different purposes. In the prototype all surfaces read one in-memory `EventsFacade`; in production
ownership splits cleanly:

| Concern | Owner | State it holds |
|---|---|---|
| **Immutable history listing + audit trail** (events, confirmations, escalation attempts, detection lapses) | **HIST** | `HistoryFacade` — a **read-only** signal window over `hist-service`'s immutable trail; drives `/history` and the escalation/detection-lapse sub-view. |
| **Confirm / feedback writes** | **EVNT** | the write path (`confirmedAt/confirmedBy/feedback`); HIST **displays** the outcome, never writes it. |
| **Live alarm / active-emergency projection** | **EVNT** | the live recent-events projection; HIST serves the *historical* read, not the *live* surface. |
| **Cross-patient aggregation / KPIs** | **DASH** | its own aggregation read-model; HIST exposes the per-patient timeline DASH may embed, never computes totals. |

> **HIST's facade is a read-only window, never a store and never a projection it mutates.** It holds the
> loaded history window for the current patient/period; it accumulates no write state and aggregates
> nothing across patients. This keeps HIST, EVNT and DASH from duplicating a growing event list with
> ambiguous ownership (the exact failure ADR-005 prevents).

## 2. Data access pattern

- `HistoryFacade` injects `HISTORY_PORT`; the default binding is `HistoryHttpAdapter`
  (`${ACCESS_HTTP_BASE}/hist`), **never** the mock (carry-forward `scaffold:mock-adapter-default`).
- **Delivery = plain sync-REST read on navigation / period change.** Messaging is disabled, so there is
  no push; and unlike EVNT, HIST is **not** a live surface — it does **not** poll. It reads when the
  caregiver opens `/history` or widens the period, and offers an explicit refresh.
- Read calls (shapes **pending BE confirmation**, aligned M1.5) — expected to be, for example:
  - `GET ${ACCESS_HTTP_BASE}/hist/history?patientId={id}&period={today|week|month}` → event timeline.
  - `GET ${ACCESS_HTTP_BASE}/hist/audit?patientId={id}&...` → escalation attempts + detection lapses.
  - **Do not implement these as written** — they are placeholders until the BE read-model is published.
- Components inject the facade only; they never touch `HttpClient` directly.
- The feedback affordance (if surfaced on a row) calls **EVNT**'s port, then `HistoryFacade.refresh()`.

## 3. Cache strategy

- **Load-on-navigation, in-memory window.** HIST loads the history window for the current patient and
  keeps it in a signal for the session; switching period **re-filters in memory** when the data is
  already within the loaded window (e.g. today ⊂ week ⊂ month), and **refetches only** when a wider
  window is requested than what is loaded. This matches the prototype (`PERIODO_DIAS` filter over one
  in-memory list) while respecting the project default "call the API per navigation, cache only when
  justified" — here the justification is a strictly larger window reusing a strictly smaller one.
- No optimistic/derived mutation cache (HIST writes nothing).

## 4. Optimistic updates

**None.** HIST has no write path, so there is nothing to apply optimistically. The one write it can
*surface* (EVNT feedback) is owned by EVNT; HIST reflects it by re-reading, never by patching a local
entry. This is a deliberate non-feature (ADR-005).

## 5. Error handling

`hist-service` `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → caregiver message
(`@neuroassist/shared/ui-feedback`). Rules:

- **Read failure** → never render a false "no history"; show a degraded banner and keep the last known
  window marked stale.
- **Partial-trail failure** (timeline ok, escalation/lapse feed down) → render the timeline, flag the
  missing section; never imply "no escalations" when that feed failed.
- **Delegated-feedback failure** (EVNT write) → surfaced by EVNT's error path; HIST does not re-read on
  failure and does not claim the outcome changed.
- **Correlation** — every call carries the Access-Layer correlation id; failures are reported via
  `@neuroassist/shared/observability` (no raw PII in telemetry).

## 6. Navigation / shell integration

- HIST contributes the `/history` route and an optional escalation/detection-lapse trail sub-view. It
  owns its own breadcrumb (`History`); the trail is a section/sub-route under it.
- An optional **read-only history widget** can be embedded by the Shell/DASH (Home or dashboard), fed by
  a slice of `HistoryFacade` the host injects. Whether DASH hosts this widget or HIST stands alone is an
  **open question** (doc 06 Q1) — stated here as a boundary, not a decision.
- HIST never auto-routes and never takes over the screen (that is EVNT's emergency alarm); it is a calm,
  navigable read surface.
