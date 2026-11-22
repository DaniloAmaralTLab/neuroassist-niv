# SPEC-03 — View Models — dash (DASH) Frontend

> The view-models `DashboardFacade` exposes as `computed` signals, and the **fail-safe composite-status**
> derivation that is the module's critical-domain decision (BE `adr/ADR-002`, FE `adr/ADR-005`;
> invariants declared once in `frontend/03-domain-framing-frontend.md` §5 as INV-1..INV-6). Code fences are
> illustration. The invariant ids below are **cited, not redeclared** (ADR-007 of candeeiro-so).

## 1. Source health — the per-source axis (extends doc 03 §3 with `stale`)

```ts
export type SourceKey    = 'hist' | 'evnt' | 'edge' | 'pat';
export type SourceHealth = 'ok' | 'empty' | 'loading' | 'unknown' | 'error' | 'stale';
```

`stale` refines the doc-03 `unknown` state: the source was **read successfully** but its data is **older
than its freshness window** (see §3). It is a distinct, non-`ok` state so the headline can explain
"cannot confirm — last checked HH:MM" rather than a bare error.

| SourceHealth | Meaning | Counts as `ok` for `all_clear`? |
|---|---|---|
| `ok` | read succeeded, data within freshness window | **yes** |
| `loading` | first read in flight | no |
| `empty` | read succeeded but returned nothing where data is expected | no |
| `stale` | read succeeded but older than the freshness threshold (§3) | no |
| `unknown` | facade reachable, state indeterminate | no |
| `error` | read failed / timed out / 5xx | no |

## 2. View-models

### `OverviewVM` (the `/home` headline)

| Field | Type | Source |
|---|---|---|
| `patientName` | `string \| null` | PAT `PatientFacade` / shell context (INV-6) |
| `headline` | `CompositeStatus` (§4) | derived in `DashboardFacade` from per-source health + freshness |
| `lastCheckAt` | `string \| null` | most recent successful source timestamp (EVNT `lastPolledAt` / EDGE `lastSyncAt` / HIST read tick) |
| `sources` | `Record<SourceKey, SourceHealth>` | per-source health |
| `degradedReason` | `string \| null` | plain-language reason when `headline ∈ {degraded, notice}` |

### `KpiVM` (the day)

| Field | Type | Source |
|---|---|---|
| `eventsToday` | `number \| null` | HIST `PeriodSummaryVM.eventsInPeriod` (period = today) — `null` when `hist` not `ok` |
| `confirmedToday` | `number \| null` | HIST `PeriodSummaryVM.confirmed` — `null` when `hist` not `ok` |
| `pendingToday` | `number \| null` | derived `eventsToday - confirmedToday`, only when **both** are known |

> INV-4: a KPI whose source is not `ok` renders as `"—"` (unknown), **never** `0`. A failed count must not
> read as "zero events".

### `DeviceHealthVM`
Projected from EDGE `DeviceStatusVM` (`badge: online | offline | unavailable`, `lastSyncRelative`,
`loading`). DASH does **not** recompute connectivity; it renders EDGE's `EdgeDeviceCardComponent` /
`DeviceStatusBadgeComponent`. DASH only decides the **freshness** of the EDGE read for the composite (§3).

### `NoticeVM`
Projected from EVNT `RoutineNoticeVM` (routine notices) and the EVNT **open-detection-lapse** signal
(INT-DASH-1). Rendered via EVNT's `RoutineNotice*Component` and DASH's `DetectionLapseNoticeComponent`.
DASH holds no alarm/notice state of its own.

### `CatalogSummaryVM`
From PAT `CommandRow[]` — `{ label, urgency: 'emergency' | 'routine' }[]` plus a `/calibration` link
(PAT-owned screen).

### `SuggestionVM`
Deterministic heuristic over the recent events DASH already receives from HIST (e.g. one command triggered
repeatedly this week → "review its sensitivity in Calibration"). `kind: 'advisory'`, actions
`Confirm | Ignore`, logged; never self-executing (INV-5). Behind flag `dash.suggestion.enabled`.

## 3. Freshness thresholds (pinned — doc 06 G4 closed here)

DASH never fabricates liveness; each threshold is tied to the **owning module's** cadence and is applied
only to decide whether a successfully-read source still counts as `ok`.

| Source | Freshness rule (fresh ⇒ eligible for `ok`) | Pinned number | Owner of the cadence |
|---|---|---|---|
| **EVNT alarm / monitoring** | `PollingState == 'live'` AND `now − lastPolledAt ≤ 2 × pollIntervalSeconds` | `2 × pollIntervalSeconds` — server-advertised, default **6 s** (default poll 3 s) | EVNT adopts server `pollIntervalSeconds`; flags its own `stale` after 3 missed windows |
| **EVNT detection-lapse** | reflects EVNT's **OPEN / RESOLVED** lapse state; lapse read fresh within `2 × pollIntervalSeconds` | server lapse window **120 s** (`EDGE_DETECTION_LAPSE_THRESHOLD_SECONDS`), sweep 30 s — **referenced, never recomputed by DASH** | EDGE opens the lapse, EVNT surfaces it (BE EDGE ADR-005 / EVNT ADR-006) |
| **EDGE device / connectivity** | `now − lastSyncAt (lastHeartbeatAt) ≤ 2 × heartbeat cadence` | `2 × 30 s = 60 s` (station heartbeat cadence ≤ 30 s; a single dropped beat is tolerated) | EDGE SPEC-06 (heartbeat ≤ 30 s, below the 120 s lapse window) |
| **HIST day summary** | `now − histReadAt ≤ DASH_HIST_SUMMARY_TTL`; HIST is navigation-read (no poll), so DASH tracks the last successful read tick | `DASH_HIST_SUMMARY_TTL = 60 s` | HIST (read-on-navigation + explicit refresh) |
| **PAT identity** | `now − patReadAt ≤ DASH_PAT_TTL`; low-volatility identity | `DASH_PAT_TTL = 300 s`; PAT `empty` (no patient) ⇒ `degraded`, never `all_clear` | PAT (read-on-navigation) |

```ts
// DASH-owned constants (freshness windows). EVNT's window is adopted from EVNT's server-advertised cadence.
export const DASH_EDGE_HEARTBEAT_STALE_MS = 60_000;   // 2 × 30 s heartbeat cadence
export const DASH_HIST_SUMMARY_TTL_MS     = 60_000;   // HIST summary freshness
export const DASH_PAT_TTL_MS              = 300_000;  // PAT identity freshness
export const DASH_EVNT_FRESH_FACTOR       = 2;        // × server-advertised pollIntervalSeconds
export const EDGE_LAPSE_WINDOW_MS         = 120_000;  // server-owned; referenced for copy only, not a DASH timer
```

## 4. Composite overview status (the headline — the heart of ADR-005/ADR-002)

```ts
export type CompositeStatus = 'loading' | 'all_clear' | 'degraded' | 'notice' | 'emergency';
```

```
loading     while ANY source ∈ {loading}                              → headline held, NEVER all_clear
all_clear   iff EVERY source is 'ok' AND fresh AND affirmatively clear → the ONLY green branch (INV-1)
notice      every source ok+fresh, but EVNT routine-notice OR an OPEN
            detection-lapse ("online but not detecting")              → amber, never emergency
degraded    ANY source ∈ {loading→expired, empty, stale, unknown, error}  → "cannot confirm — last HH:MM"
emergency   EVNT unconfirmed emergency                                → DEFER: EVNT takeover renders above DASH
```

Rules, each a direct consequence of the cited invariants:

- **INV-1 (fail-safe headline; alias SAFETY-DASH-1 / INV-DASH-2 in the ADRs).** `headline == all_clear` ⇒
  for every `SourceKey`, `health == 'ok'` and fresh and affirmatively clear. The contrapositive is the law:
  any non-`ok` or stale source ⇒ **not** `all_clear`. This replaces the prototype `events.every(confirmed)`
  that returns `true` for an empty array.
- **INV-3 (emergency never faked, never hidden).** DASH applies emergency styling to **nothing** and never
  renders, delays, suppresses or outranks EVNT's full-screen emergency takeover; `emergency` here only means
  "defer to EVNT".
- **INV-4 (honest KPIs).** `"—"`, never `0`, for a KPI whose source is not `ok`.
- A detection-lapse while EDGE is online is a **notice (amber)**, never `emergency` and never `all_clear`:
  connectivity is not the same as watching.

## Acceptance criteria (EARS)

- WHILE any composed source is `loading`, THE SYSTEM SHALL hold the composite headline in `loading` and SHALL NOT show `all_clear`.
- THE SYSTEM SHALL set the composite headline to `all_clear` only when every source is `ok` and fresh and affirmatively clear.
- IF a KPI source is not `ok`, THEN THE SYSTEM SHALL render that KPI as an em dash and SHALL NOT render it as zero.
- WHILE the active patient is supplied by the shell context, THE SYSTEM SHALL scope the overview to that patient and SHALL NOT present a patient picker.
