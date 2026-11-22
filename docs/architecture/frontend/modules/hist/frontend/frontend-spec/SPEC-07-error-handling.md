# SPEC-07 — Error Handling — hist (HIST) Frontend

> BE `ProblemDetail` (RFC 7807) → `AppError` (`@neuroassist/shared/error-model`) → user-facing message
> via `@neuroassist/shared/ui-feedback`. Errors are mapped by the stable `type` **slug**, never by HTTP
> status alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`); the BE
> `detail`/`correlationId` are preserved — the FE never shows a raw HTTP body
> (`fe-error-handler:raw-http-error-detail`) and never discards the BE detail behind a fixed string
> (`fe-facade:toast-fixed-text-discards-be-detail`). **HIST's overriding rule: a read failure MUST NEVER
> render a false "no history" (doc 05 §5, doc 03 §5).** Sources: BE api-contract §5 (ProblemDetail
> slugs), `frontend/05-state-and-data-flow.md` §5. English-only (ADR-018).

## 1. Pipeline

```
hist-service application/problem+json
  → access-http-base error-normalize interceptor (reads `type` slug + detail + correlationId)
  → AppError { code: <slug>, detail, correlationId }
  → feature maps AppError.code → degraded history banner | inline range error | toast
  → rendered via @neuroassist/shared/ui-feedback (BE detail shown, correlationId attached)
```

## 2. BE `type` slug → FE surface (canonical, BE api-contract §5)

| BE `type` slug | HTTP | FE-reachable path | FE surface | FE message (English, ADR-018) |
|---|---|---|---|---|
| `unauthorized` | 401 | any history read / expired token | redirect to login | — (guard-driven) |
| `forbidden` | 403 | unlinked / cross-tenant patient (BE §2) | degraded history error (no list) | "You don't have access to this patient's history." (existence never disclosed) |
| `audit-validation` / `validation-error` | 400 | bad range (`from` without `to`, bad `period`/`size`) (BE §2/§5) | inline range error on the period/range control | per-field from BE detail |
| transport / `5xx` | 502/503/timeout | history read failed | degraded banner, hold stale window | "We couldn't refresh the history. Showing the last loaded view." |
| `tenant-required` | 400 | not FE-reachable (tenant is JWT-derived, BE §6) | — | — (producer/ingest path) |
| `subject-not-found` | 404 | erasure path (BE §4) — operator only | **not an FE caregiver surface** | — (out of FE scope) |
| `audit-unavailable` | 502 | emitted by **producers**, not HIST (BE §5) | **not an FE caregiver surface** | — (producer-side; see EVNT SPEC-07 §2) |

> `subject-not-found` (erasure) and `audit-unavailable` ride on paths the caregiver dashboard never calls
> (BE §4 erasure is operator-only; `audit-unavailable` is a producer→HIST ingest condition) — out of FE
> scope, like EVNT's device-path slugs.

## 2.1 SAFETY — read failure is NOT "no history"; partial-trail failure is flagged, not hidden

- **History read failure (transport / 5xx)** → `HistoryViewState='error'`, a **visible degraded banner**
  with Retry, and the **last known window is held and marked `stale`** (`HistoryPageVM.stale=true`). The FE
  **NEVER** renders an empty "no events" list from a failed read (doc 05 §5, doc 03 §5) — an empty list is
  only a **successful** read that returned zero entries.
- **Partial-trail failure** (the event timeline loaded but the escalation/detection-lapse section failed) →
  render the timeline, set `HistoryPageVM.trailDegraded=true`, and show a **"couldn't load the escalation &
  detection-lapse trail"** notice on that section only. The FE NEVER implies "there were no escalations"
  when that part of the read failed (doc 05 §5).
- **`forbidden` (403)** on a history read → a neutral "no access to this patient's history" state; the FE
  never discloses whether the patient exists for another tenant/caregiver (BE §2 link-scoping).

## 2.2 Delegated-feedback failure — EVNT owns the error, HIST does not re-read

- The "Was it real?" write is EVNT's (SPEC-04 §4). **IF the EVNT feedback write fails**, EVNT's own error
  path surfaces it (EVNT SPEC-07); HIST does **not** re-read and does **not** claim the outcome changed —
  the row keeps the outcome the last successful HIST read reported (doc 05 §5).

## 3. Toast vs banner vs inline — criteria

- **Degraded history banner:** the history read failed or is stale — a visible, non-silent notice with
  Retry over the held (stale) window. Never a silent failure, never a false empty list.
- **Inline range error:** a `validation-error` on the period/range control (e.g. `from` without `to`) — shown
  on the control, mapped from the BE detail; the FE does not render fabricated entries.
- **Toast:** reserved for transient, non-blocking outcomes; HIST's primary read failure uses the banner (a
  stale history is a standing condition, not a transient one).
- **Modal:** not used — HIST has no destructive or write flow of its own (ADR-005).

## 4. Retry strategy

- **History read (GET):** manual Retry on the degraded banner forces an immediate re-read; **no** silent
  auto-retry loop and **no** background poll (HIST is not a live surface, doc 05 §2).
- **Delegated feedback (EVNT):** no HIST retry; the caregiver re-acts through EVNT, which is idempotent
  per verdict (EVNT api-contract §5.1).

## Acceptance criteria (EARS)

- IF the backend responds `unauthorized`, THEN THE SYSTEM SHALL redirect to the login route.
- IF the backend responds `forbidden` on a history read, THEN THE SYSTEM SHALL show the no-access history state and SHALL NOT disclose whether the patient exists for another tenant.
- IF the backend responds `validation-error` on a period or range query, THEN THE SYSTEM SHALL show an inline range error mapped from the backend detail and SHALL NOT render fabricated history entries.
- IF a history read fails with a transport or 5xx error, THEN THE SYSTEM SHALL show the degraded history banner, hold the last known window marked stale, and SHALL NOT render a no-history all-clear.
- IF the escalation and detection-lapse section fails while the event timeline succeeds, THEN THE SYSTEM SHALL render the timeline, flag the trail section as degraded, and SHALL NOT imply there were no escalations.
- IF a delegated EVNT feedback write fails, THEN THE SYSTEM SHALL surface EVNT's error path and SHALL NOT re-read the history or claim the feedback outcome changed.
- THE SYSTEM SHALL map every HIST error by its `type` slug, preserve the backend `detail` and `correlationId`, and SHALL NOT display a raw HTTP response body.
