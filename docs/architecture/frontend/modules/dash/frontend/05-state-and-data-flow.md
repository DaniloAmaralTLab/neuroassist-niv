# 05 — State and Data Flow — dash (DASH)

> Scope: where state lives and how data moves. No Angular code at this stage.

## 1. State topology — DASH owns orchestration, not data (ADR-005)

In the BA prototype, `screens/home` reads four in-memory facades directly and derives everything itself. In
production that ownership is already settled in the promoted modules; DASH holds **only** UI-local orchestration
state:

| Concern | Owner | State DASH holds |
|---|---|---|
| Immutable history + the day's event summary | **HIST** (`HistShellIntegrationService` / `HistoryFacade`, read-only) | **none** — DASH reads HIST's read-only signals |
| Alarms, confirm/feedback, live projection, routine notices, detection-lapse | **EVNT** (`AlarmFacade`, notice components) | **none** — DASH renders EVNT's signals/components |
| Device identity, connectivity, liveness | **EDGE** (`DeviceFacade`, status components) | **none** — DASH renders EDGE's signals/components |
| Patient + command catalog + calibration | **PAT** (`PatientFacade`, `CommandFacade`) | **none** — DASH reads PAT's signals; calibration is PAT's screen |
| **Per-source health + composite overview status** | **DASH** | `signal<SourceHealth>` per source; `computed` `CompositeStatus` headline; KPI projection; advisory-dismissed flag |

> **DASH's facade is an aggregator of read-only windows, never a store.** It accumulates no entity list, writes
> nothing to the composed modules, and derives the headline from their health. This is what prevents a second
> drifting source of truth and keeps the fail-safe rule enforceable in one place.

## 2. Data access pattern

- **No HTTP of DASH's own at MVP.** `DashboardFacade` injects the composed modules' public facades / integration
  services and reads their signals. It injects **no `HttpClient`** unless a `dash-service` is confirmed by BE.
- **Patient context** is pushed in by the shell: `DashShellIntegrationService` → `HistShellIntegrationService
  .setActivePatient(id)` (and the equivalent for EDGE/PAT/EVNT as their seams require). DASH owns no patient picker.
- **Reads happen as the composed modules define them** — HIST reads on navigation with explicit refresh (no poll);
  EVNT polls server-advertised for live awareness (EVNT-owned); EDGE/PAT read on navigation. DASH re-derives its
  composite status reactively whenever any composed signal changes — it adds no polling of its own.
- **If `dash-service` is later confirmed** (pending BE, M1.5): a `DASH_*_PORT` with `DashHttpAdapter`
  (`${ACCESS_HTTP_BASE}/dash`, default `http`, mock behind a flag) is added behind the facade. **Do not implement
  any `dash-service` call at vision/specs stage** — the shapes are placeholders until the BE read-model is published.

## 3. Cache strategy

- **No DASH-owned cache.** DASH reflects whatever window each composed module holds (HIST's in-memory period
  window, EDGE/PAT's last load, EVNT's live projection). DASH keeps only the derived composite status in a signal,
  recomputed from upstream signals — it is never persisted and never stale independently of its sources.
- An explicit **refresh** on the overview asks each composed facade to refresh (e.g. HIST `refresh`), then
  re-derives. DASH adds no optimistic layer.

## 4. Optimistic updates

**None.** DASH writes nothing, so there is nothing to apply optimistically. The one write a caregiver can reach
from DASH (confirm/feedback on an event) is **EVNT's**, surfaced through EVNT's own path; DASH reflects the result
by re-reading the composed signals, never by patching a local value.

## 5. Error handling — the fail-safe core (SAFETY, ADR-005)

Composed-module `ProblemDetail` → `AppError` (`@neuroassist/shared/error-model`) → caregiver copy
(`@neuroassist/shared/ui-feedback`). Rules, each a direct consequence of INV-1 / INV-4:

- **Any source fails or is unknown → headline degrades.** The composite status becomes `degraded`/`unknown` with a
  plain reason ("Status unavailable — N panels could not load"). It is **never** `all_clear` while a source is not
  `ok`. A loading source holds the headline in `loading`, not `all_clear`.
- **A failed panel shows an error/degraded state, never a blank or a reassuring default.** EDGE failure shows an
  error panel, **not** "offline" and **not** an empty card; a failed HIST summary shows "—", **not** `0` events.
- **Partial failure is progressive, not all-or-nothing.** Healthy panels still render; only the failed panel is
  flagged and the headline degraded. (Inverse of the prototype's empty-array "OK".)
- **"Online but not detecting"** (EDGE online + EVNT detection-lapse) is a **notice/degraded** headline, never
  `all_clear` — connectivity is not the same as watching.
- **Emergency outranks everything.** If EVNT signals an unconfirmed emergency, EVNT's takeover renders above DASH;
  DASH does not restyle itself as emergency and does not compute a "clear".
- **Correlation:** every composed read already carries the Access-Layer correlation id; failures report via
  `@neuroassist/shared/observability`; no raw PII in telemetry.

## 6. Breadcrumbs and navigation state

- DASH is the shell's **home**; its breadcrumb is the root (`Home` / dashboard). It does not nest under another
  module.
- DASH contributes outbound navigation to `/history` (HIST), `/calibration` (PAT) and EVNT notice surfaces — these
  are **other modules' routes**; DASH owns no breadcrumb for them.
- DASH never auto-routes and never takes over the viewport; the only screen takeover in the product is EVNT's
  emergency alarm, which is not DASH's to render.
