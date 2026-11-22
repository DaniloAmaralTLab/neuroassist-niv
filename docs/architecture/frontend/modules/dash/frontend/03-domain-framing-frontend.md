# 03 — Domain Framing (Frontend) — dash (DASH)

> Scope: the UI-side domain language, view-models, events and invariants. Mirrors the BE; does not redefine it.
> No Angular code at this stage.

## 1. Ubiquitous language (mirror — not redefined here)

DASH introduces **no new domain nouns**; it composes those owned elsewhere. It references them by the owning
module's language (see `_brief.md` §1, each module's doc 03, and PAT/HIST/EVNT/EDGE visions):

| Term | Owner | DASH use |
|---|---|---|
| Patient (subject; `tenantId`, `device`) | PAT / shell context | the overview's subject; supplied by the shell, not chosen in DASH |
| Command (gesture → free-form label + urgency `emergency\|routine` + sensitivity) | PAT | catalog summary + calibration entry point; resolves an event's label/urgency |
| Event (structured occurrence; `confirmedAt/By`, `feedback`) | EVNT (write/live) / HIST (immutable read) | KPIs + recent-events preview (read-only) |
| EdgeDevice (`status online\|offline`, `lastSyncAt`, connectivity) | EDGE | device-health panel; connectivity vs "not detecting" |
| Detection lapse (engine stopped seeing the patient) | EVNT / EDGE (SAFETY-GEST-1) | the "online but not detecting" notice |
| Routine notice / Alarm | EVNT | notice indicators; emergency takeover stays EVNT |

DASH adds only **UI-local, non-domain** concepts: **source health** and **composite overview status** (below).

## 2. View models (draft)

### `OverviewVM` (the /home headline)
| Field | Type | Source |
|---|---|---|
| `patientName` | `string \| null` | PAT `PatientFacade` / shell context |
| `headline` | `CompositeStatus` (see §4) | derived in `dashboard.facade` from per-source health |
| `lastCheckAt` | `string \| null` | HIST summary / EVNT monitoring (last known check) |
| `sources` | `Record<SourceKey, SourceHealth>` | per-source health for HIST / EVNT / EDGE / PAT |
| `degradedReason` | `string \| null` | plain-language reason when `headline = degraded/unknown` |

`SourceKey = 'hist' | 'evnt' | 'edge' | 'pat'`.
`SourceHealth = 'ok' | 'empty' | 'loading' | 'unknown' | 'error'`.

### `KpiVM` (the day)
| Field | Type | Source |
|---|---|---|
| `eventsToday` | `number \| null` | HIST summary (read-only) — `null` when source not `ok` |
| `confirmedToday` | `number \| null` | HIST summary |
| `pendingToday` | `number \| null` | derived (`eventsToday - confirmedToday`) only when both known |

> KPIs are `null` (shown as "—"), never `0`, when their source is not healthy — a failed count must not read as
> "zero events" (SAFETY, ADR-005).

### `DeviceHealthVM`
Projected from EDGE `EdgeDeviceVM` / `DeviceStatusVM` (connectivity, `lastSyncAt`, version, lifecycle). DASH does
not recompute connectivity; it renders EDGE's `DeviceStatusBadgeComponent` / `EdgeDeviceCardComponent`.

### `NoticeVM`
Projected from EVNT `RoutineNoticeVM` / detection-lapse signal; rendered via EVNT's notice components. DASH holds
no alarm state of its own.

### `CatalogSummaryVM`
From PAT `CommandRow[]` — label + urgency badge per command, plus a `/calibration` link (screen owned by PAT).

### `SuggestionVM` (inline advisory)
Deterministic heuristic over the recent events DASH already receives (e.g. a command triggered repeatedly →
"review its sensitivity in Calibration"). `kind: 'advisory'`, `Confirm | Ignore`, logged; never self-executing.

## 3. UI events (user-driven)

| Event | Trigger | Effect |
|---|---|---|
| `OverviewOpened` | `/home` mounts | shell sets active patient; facade subscribes to composed signals; status derives |
| `OverviewRefreshed` | explicit refresh | re-reads composed facades (e.g. HIST `refresh`, EDGE/PAT re-load); re-derives status |
| `NoticeOpened` | tap a routine-notice / detection-lapse | routes to the EVNT surface (no state owned by DASH) |
| `HistoryOpened` | "View history" | routes to HIST `/history` |
| `CalibrationOpened` | "Manage catalog" | routes to PAT calibration screen |
| `SuggestionConfirmed` / `SuggestionIgnored` | Confirm / Ignore on the advisory card | dismisses; records the decision to the audit trail; never executes an action |

## 4. State transitions (UI level)

**Per-source health** (one per composed module):
```
idle → loading → ok | empty | error
            └──────────→ unknown   (facade reachable but state indeterminate)
```

**Composite overview status** (the headline — the heart of ADR-005):
```
loading                              while ANY source ∈ {loading}
  │
  ├─ every source ∈ {ok} AND no pending/unattended AND no active notice ─► all_clear  ("X is OK")
  ├─ any source ∈ {loading, unknown, error}                             ─► degraded   ("Status unavailable — …")
  ├─ EVNT routine notice OR detection-lapse active (all sources ok)     ─► notice      (info/warning styling)
  └─ EVNT unconfirmed emergency                                         ─► emergency → EVNT TAKES OVER (above DASH)
```
`all_clear` is reachable **only** from the first branch. `empty` on a source that should have data (e.g. no device
at all) resolves to `degraded`/`notice`, never `all_clear`. There is **no transition** in which an unknown or
failed source yields `all_clear`.

## 5. Invariants (client-side)

- **INV-1 (fail-safe headline).** `headline = all_clear` ⇒ for every `SourceKey`, `health = 'ok'` and the source is
  affirmatively clear. Contrapositive is the law: any non-`ok` source ⇒ not `all_clear`. (Directly replaces the
  prototype `events.every(confirmed)` that is `true` for an empty list.)
- **INV-2 (no duplicate truth).** DASH stores no history/alarm/device/catalog entity; every such value is read via
  a composed module's public signal/port. DASH binds **zero write endpoints** to those modules.
- **INV-3 (emergency never faked, never hidden).** DASH applies emergency styling to **nothing**; it never renders,
  suppresses, delays or outranks EVNT's emergency takeover.
- **INV-4 (honest KPIs).** A KPI whose source is not `ok` renders as "—" (unknown), never `0`.
- **INV-5 (advisory is inert).** The suggestion never performs a mutation; Confirm/Ignore only dismiss + log.
- **INV-6 (tenant/patient not chosen in DASH).** Tenant is a JWT claim (server-side); the active patient comes from
  the shell/ACS context. DASH scopes by neither a tenant param nor its own patient picker.
