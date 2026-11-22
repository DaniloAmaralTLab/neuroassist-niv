# SPEC-07 — Error Handling — dash (DASH) Frontend

> The fail-safe core (BE `adr/ADR-002`, FE `adr/ADR-005`; INV-1/INV-3/INV-4 declared in doc 03 §5). DASH
> reflects each composed module's own `ProblemDetail → AppError` mapping; it adds **no** write, so it maps
> no write failure. The rule everywhere: a source that is not affirmatively `ok` can never contribute to a
> green headline. Code fences are illustration.

## 1. `ProblemDetail` → `AppError` → caregiver copy

Each composed module already maps its `ProblemDetail` (`@neuroassist/shared/error-model`) to an `AppError`
and renders caregiver copy via `@neuroassist/shared/ui-feedback`. DASH does not re-map a module's failures;
it observes each module's health/error signal and translates it into a **per-source `SourceHealth`**
(SPEC-03 §1) and a **composite `degradedReason`**.

## 2. Per-source failure → headline (the fail-safe table)

| Source signal | DASH `SourceHealth` | Effect on composite headline |
|---|---|---|
| EVNT `PollingState = offline\|stale` or alarm read error | `error` / `stale` | `degraded` — "Alarm status unavailable — cannot confirm" |
| EVNT open detection-lapse while EDGE online | (source `ok`) | `notice` (amber) — "Online but not detecting" — never `all_clear`, never `emergency` |
| EDGE device read error / timeout | `error` | `degraded`; device panel shows an **error** state (not "offline", not blank) |
| EDGE last heartbeat older than 60 s | `stale` | `degraded` — "Device status may be out of date" |
| HIST summary read error | `error` | `degraded`; KPIs render `"—"`, never `0` |
| HIST summary older than 60 s | `stale` | `degraded` — "History may be out of date — last checked HH:MM" |
| PAT identity read error / `empty` (no patient) | `error` / `empty` | `degraded` — "Cannot confirm the patient" |
| EVNT unconfirmed emergency | (defer) | `emergency` → EVNT takeover renders **above** DASH; DASH never restyles or suppresses it |

## 3. Failure-code → FE copy (composed, not DASH-owned)

DASH surfaces no backend `failure_code` of its own (it has no backend). It reflects the owning module's
mapped `AppError`:

| Origin (owning module) | `AppError` kind | Caregiver surface in DASH |
|---|---|---|
| EVNT 5xx / timeout on `active-alarm` | `transient` | banner on the alarm region + headline `degraded` |
| EDGE 404 device / 5xx | `not-found` / `transient` | **error panel** on the device card (never "offline") |
| HIST 5xx on summary | `transient` | KPIs `"—"` + "History may be out of date" |
| PAT 5xx / empty | `transient` / `empty` | headline `degraded`; catalog panel shows a degraded note |
| any `AppError.kind = 'forbidden'` | `forbidden` | the panel is hidden (authority self-gate, SPEC-05 §4) |

## 4. Toast vs banner vs modal, retry

- **Banner** (inline, per-panel): the default — a failed/stale panel shows an inline degraded banner while
  the rest of the overview keeps working (progressive, not all-or-nothing).
- **Toast** (transient): only for a **refresh** that failed outright, so the standing panels are not
  disturbed.
- **Modal**: **never** from DASH — DASH never takes over the viewport. The only viewport takeover in the
  product is EVNT's emergency alarm, which is not DASH's to render (INV-3).
- **Retry**: DASH adds none of its own; it relays a caregiver **refresh** to the composed facades (SPEC-04
  §3). EVNT keeps its own poll-backoff.
- **Correlation / PII**: every composed read already carries the Access-Layer correlation id; DASH reports
  composed-read failures through `@neuroassist/shared/observability` using that id and places no raw
  patient PII in telemetry.

## Acceptance criteria (EARS)

- IF any composed source errors or times out, THEN THE SYSTEM SHALL set the composite headline to `degraded` with a plain-language reason and SHALL NOT show `all_clear`.
- IF the EDGE device read fails, THEN THE SYSTEM SHALL show an error state on the device panel and SHALL NOT show offline and SHALL NOT show a blank card.
- IF the HIST summary read fails, THEN THE SYSTEM SHALL render the day KPIs as an em dash and SHALL NOT render zero events.
- WHILE EDGE connectivity is online and an EVNT detection lapse is open, THE SYSTEM SHALL show an online-but-not-detecting notice in amber and SHALL NOT show `all_clear` and SHALL NOT raise an emergency.
- IF EVNT signals an unconfirmed emergency, THEN THE SYSTEM SHALL defer to EVNT's full-screen emergency takeover and SHALL NOT style itself as emergency and SHALL NOT suppress the takeover.
- THE SYSTEM SHALL keep the healthy panels rendered while a failed panel shows its error state during a partial failure.
- THE SYSTEM SHALL report composed-read failures through the shared observability correlation id and SHALL NOT place raw patient PII in telemetry.
