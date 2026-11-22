# ADR-005 — Composition host + fail-safe composite overview: no false "all clear" (DASH)

> Module-local record in the DASH namespace. It does **not** occupy the shared ADR-005 slot
> (the project's shared folder reserves 005 for "design tokens" — see `../README.md` and the
> shared `../../../../adr/README.md`). Keep the two separate when cross-referencing.

| Section | Content |
|---|---|
| **Status** | proposed · 2026-11-20 |
| **Scope** | `@neuroassist/dash` — the caregiver home/overview surface (`/home`), its composite-status derivation, and the read seam with HIST, EVNT, EDGE and PAT. Also records the ownership recommendation for the unowned `entry` screen. |

## Context

DASH is the caregiver's home: the first screen after sign-in, whose job is to answer "Is my patient OK right now?"
in under two seconds. Two forces shape it.

**1. It sits on top of four already-promoted modules.** HIST owns history/audit (read-only), EVNT owns
alarms/confirm-feedback/live projection and routine-notice/detection-lapse surfaces, EDGE owns device
identity/connectivity, PAT owns the patient and command catalog + calibration. In the BA prototype,
`screens/home` bypasses all of that: it reads four in-memory facades (`PatientsFacade`, `EventsFacade`,
`DevicesFacade`, `CommandsFacade`) and re-derives everything. Promoted naïvely, DASH would become a **second,
drifting source of truth** for data these modules already own, and would re-implement their HTTP.

**2. The overview is a safety surface.** The prototype computes `estaBem = eventsOfToday().every(e => e.confirmedAt)`.
`Array.prototype.every` returns **`true` for an empty array** — so a failed load, an empty response, or a source
that has not resolved renders a green "X is OK" **exactly when the caregiver must not be reassured**. For a system
whose purpose is to catch a help request from someone who cannot otherwise call out, a false "all clear" is the
worst possible failure. There is a second, related hazard: "online but not detecting" — the camera is connected
(EDGE online) but the engine stopped seeing the patient (EVNT detection-lapse); connectivity must not be read as
watching. And the emergency takeover must never be faked (false alarm) or suppressed/outranked (missed alarm).

**3. The backend is undecided.** Whether a `dash-service` (BFF/aggregation read) exists is **pending the BE vision**
(authoritative, running in parallel; resolved at M1.5). DASH must not invent endpoints to fill the gap.

We must decide **what DASH owns**, **how it reads the composed modules**, and **how the composite status is
derived so it is honest under partial failure**.

## Decision

1. **DASH is a composition / host module, not a data owner.** It consumes HIST / EVNT / EDGE / PAT **only** through
   their published public API (`src/index.ts`): `HistShellIntegrationService` + `HistoryWidgetComponent`;
   EVNT `AlarmFacade` / `PushChannelFacade` + `RoutineNoticeIndicatorComponent` / `RoutineNoticeListComponent`;
   EDGE `DeviceFacade` + `DeviceStatusBadgeComponent` / `EdgeDeviceCardComponent`; PAT `PatientFacade` /
   `CommandFacade`. It re-implements none of their HTTP, re-derives none of their state, holds no duplicate store
   and binds **zero write endpoints** to them. The Nx boundary tag enforces import-via-`index.ts` only (doc 04 §3).
2. **The composite overview status is fail-safe by construction.** `DashboardFacade` tracks an explicit
   `SourceHealth ∈ {ok, empty, loading, unknown, error}` per source and derives one `CompositeStatus` headline.
   The headline is **`all_clear` ("X is OK") only when every source is `ok` and affirmatively clear**; any source
   that is loading, unknown, empty-where-data-is-expected, or failed yields **`degraded` / `unknown`** with a
   plain-language reason. A KPI whose source is not `ok` shows "—", never `0`. There is exactly one reachable
   branch to `all_clear` (doc 03 §4/§5, INV-1/INV-4). This directly replaces the prototype `every()`-on-empty bug.
3. **Emergency lives in EVNT and is sacred.** DASH applies emergency styling to **nothing** and never renders,
   delays, suppresses or outranks EVNT's full-screen emergency takeover; an unconfirmed emergency pre-empts the
   whole dashboard (INV-3).
4. **No DASH-invented backend.** Whether a `dash-service` exists is **pending BE (M1.5)**. Until confirmed, DASH is
   composition-only and performs no HTTP of its own. If BE confirms a `dash-service`, the read is isolated behind a
   `DASH_*_PORT` (`${ACCESS_HTTP_BASE}/dash`, default `http`, mock behind a flag; never `/api/v1`). Prospective
   `dash.*` authorities equal the BE authorities once published; none is invented ahead of the BE.
5. **The `entry` screen is not DASH's.** `screens/entry` (`/entry`) is a static, pre-shell brand/login moment with
   no operational data. **Recommended owner: the app shell / ACS** (the authentication/app boundary). DASH, a
   shell-hosted operational surface, does not promote it (doc 06 Q1).

## Alternatives considered

- **Promote `screens/home` as-is (four local facades, `every()` status)** — rejected: creates a second source of
  truth that drifts from HIST/EVNT/EDGE/PAT, re-implements their HTTP, and ships the false-"all clear" bug.
- **One shared events/device facade across modules + DASH** — rejected (same reason HIST/EVNT ADR-005 rejected it):
  duplicated growing state and ambiguous ownership. DASH reads each owner's public seam instead.
- **Block the whole overview until every source loads (all-or-nothing)** — rejected: a single slow/failed panel
  would blank the home screen; worse for a caregiver than a progressive, honestly-degraded view. DASH renders
  healthy panels and degrades only the headline + the failed panel.
- **Treat empty/unknown as "clear" for a calmer default** — rejected outright: this *is* the hazard. Calm is a
  *styling* goal, never a reason to imply safety the system cannot confirm.
- **Invent `dash-service` endpoints now and reconcile later** — rejected: the BE is authoritative; endpoints are
  marked pending and isolated behind a port to avoid churn (doc 06 R4).
- **Give DASH the `entry` screen because it is the "front door" to the dashboard** — rejected: `entry` is
  unauthenticated and operational-data-free; it belongs to the shell/ACS boundary, not to a shell-hosted module.

## Consequences

- **Positive:** a single owner per concern (HIST read / EVNT alarm+write / EDGE device / PAT catalog /
  **DASH orchestration**); no duplicated store; the headline cannot silently read "OK" under partial failure; the
  emergency takeover is untouched; works with messaging disabled and with the BE backend undecided; one place
  (`DashboardFacade`'s headline `computed`) concentrates the safety invariant, so it is testable in isolation.
- **Negative / mitigations:** DASH couples to four modules' public APIs (R3) — mitigated by consuming only their
  `index.ts` seams and testing against those contracts; the home view can show "degraded" more often than a naïve
  "OK" (accepted — honesty over false calm), tuned by clear copy and per-panel flags; `dash-service` existence is
  unresolved (R4) — mitigated by composition-only default and the port seam; the advisory heuristic catalogue and
  its decision log are still thin (doc 06 G4/Q5) — deferred to specs.

## References

- `_brief.md` §2/§4/§5/§8 (problem, scope, anchor `OverviewAssembled`); docs 01 §1/§4/§6, 02 §1/§3/§4,
  03 §2/§4/§5 (INV-1..INV-6), 04 §3/§6/§7, 05 §1/§2/§5, 06 R1/R2/R4/Q1/Q3.
- M0 handoff (state.json): DASH = caregiver dashboard composing HIST/PAT/EVNT/EDGE; unowned prototype screens
  `home` (→ DASH) and `entry` (→ shell/ACS, this ADR §5); open question "does DASH need `dash-service`?".
- Composed seams (verified in `frontend/libs/*/src/index.ts`): HIST `HistShellIntegrationService` +
  `HistoryWidgetComponent`; EVNT `AlarmFacade`/`PushChannelFacade` + `RoutineNotice*Component`; EDGE `DeviceFacade`
  + `DeviceStatusBadgeComponent`/`EdgeDeviceCardComponent`; PAT `PatientFacade`/`CommandFacade`.
- Siblings: HIST ADR-005 (read-only reader), EDGE ADR-005 (server-derived liveness & pairing seam) — the data
  owners DASH composes. Shared ADR-006 (module-entry-as-library); project shared-ADR scheme `../../../../adr/README.md`.
- Prototype parity: `screens/home/home.component.ts` (`estaBem` empty-array bug), `.build-plans/home.plan.md`;
  `screens/entry/entry.component.ts`, `.build-plans/entry.plan.md` (re-homes to shell/ACS).
- Learning carry-forwards: `scaffold:mock-adapter-default` (http default), `guard:stub-permissive`
  (non-permissive guards), `fe-nx-register-module:e2e-stub:empty-describe-passes-as-green` (no silently-green empty
  e2e suite — relevant downstream at backlog/scaffold).
