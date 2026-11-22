# 01 — Architectural Vision — dash (DASH) Frontend

> Module: Dashboard and Notifications · Shell: `neuroassist-niv-web` (caregiver shell — DASH is its home)
> Scope: frontend vision only. No Angular code is produced at this stage.

## 1. Intent (UX-driven)

By the end of a DASH interaction, a caregiver can, without training and within two seconds of the screen settling:

- **know whether their patient is OK right now** — one headline status card that reads "X is OK", "X asked for
  '<command>'", or "event awaiting confirmation", with the time of the last check (prototype `screens/home`,
  Principle 2.1);
- **trust that "OK" means OK** — the headline is **OK only when every contributing source is confirmed healthy**;
  if history, device, alarm or catalog state is still loading, unknown or failed, the headline degrades to a
  neutral/unknown state and says so, **never** a false "all clear" (SAFETY, ADR-005);
- **see that the system is actually watching** — the edge device's connectivity *and* whether it is detecting,
  so "offline" and "online but not detecting" are both legible (EDGE + EVNT detection-lapse, Principle 2.6);
- **catch up and act** — the day's KPIs (events / confirmed / pending), a read-only recent-events preview, the
  command-catalog summary, and one-tap routes to History, Calibration, and any active EVNT notice.

DASH is the module that answers "**Is my patient OK, and is the system really watching?**" — it turns the live
state of HIST, EVNT, EDGE and PAT into one calm, honest caregiver home.

## 2. Problem statement (current journey vs new journey)

**Today (BA prototype):** `screens/home` reads four in-memory facades (`PatientsFacade`, `EventsFacade`,
`DevicesFacade`, `CommandsFacade`) directly and computes its own "is OK" from them. Two problems make it unsafe to
promote as-is: (a) it **re-derives** state that HIST, EVNT, EDGE and PAT now own in promoted libs — a second
source of truth that will drift; and (b) its `estaBem` is `events.every(confirmed)`, which is **`true` for an empty
array** — so a failed or empty load renders a green "X is OK" exactly when the caregiver must *not* be reassured.

**New journey:** DASH is a **composition host**. It injects the promoted modules' public seams
(`HistShellIntegrationService`, EVNT `AlarmFacade` / notice components, EDGE `DeviceFacade` / status components,
PAT `PatientFacade` / `CommandFacade`), tracks **each source's health**, and derives a headline that is OK only
when all sources are healthy and affirmatively clear. Nothing on DASH is a new store; the emergency takeover stays
in EVNT and outranks the dashboard.

## 3. Personas (jobs-to-be-done)

| Persona | Role / identity | Job-to-be-done in DASH |
|---|---|---|
| Family Caregiver | `caregiver` | Open the dashboard as home; read the patient's current status, device health, recent events and pending confirmations at a glance; jump to History / Calibration / an active notice. |
| Clinic Coordinator | `clinic_coordinator` | The same overview for the tenant's patient(s); the active patient is supplied by the shell/ACS context, not chosen inside DASH. |
| Patient | DASH subject | Subject only — the overview is *about* them; the patient never operates a DASH screen. |

## 4. MVP scope (in)

- **Caregiver home / overview** (`/home`, prototype parity — `screens/home`): composite status card, edge-device
  health panel, the day's KPIs (events / confirmed / pending), read-only recent-events preview, command-catalog
  summary with a **Calibration** entry point (the screen itself is PAT), and an inline **advisory** suggestion
  (Confirm / Ignore, logged, never self-executing). Required states: **loading, empty, degraded, error**.
- **Fail-safe composite status** (SAFETY, ADR-005): per-source health (`ok | empty | loading | unknown | error`)
  tracked for HIST, EVNT, EDGE, PAT; the headline is "all clear" **only** when every source is `ok` and
  affirmatively clear; any other combination degrades the headline and marks the stale/failed panels.
- **Alarm awareness surfacing** (not ownership): DASH renders EVNT's `RoutineNoticeIndicatorComponent` /
  `RoutineNoticeListComponent` and the detection-lapse signal, and routes to them. The **emergency full-screen
  alarm is EVNT's** and takes over above DASH; an unconfirmed emergency outranks every other overview state.

## 5. Out of scope (MVP)

- **The entry / brand screen** (`screens/entry`, `/entry`): a static pre-shell login moment with no operational
  data. **Recommended owner: app shell / ACS** (authentication boundary), not DASH (doc 06 Q1, ADR-005).
- **Owning history, alarm, device or catalog data / writes**: HIST (history + audit read), EVNT (alarm + confirm /
  feedback writes + live projection), EDGE (device identity / connectivity), PAT (patient + command catalog +
  calibration). DASH embeds their public surfaces and holds **no duplicate store and no write path**.
- **Emergency alarm rendering / takeover** — EVNT. DASH never styles a non-emergency surface as an emergency.
- **Calibration screen** — PAT. **History screen** — HIST. DASH only links to them.
- **Any DASH-invented backend endpoint / `dash-service` BFF** — **pending BE** (M1.5); satisfied meanwhile by FE
  composition (doc 06 R1).
- **Cross-tenant analytics, trend charts, exports** — deferred past the caregiver MVP (doc 06 G1).
- **i18n / locale switch** — English-only (ADR-018).

## 6. Architectural principles

- **Composition over re-query (the module's defining stance, ADR-005).** DASH consumes HIST / EVNT / EDGE / PAT
  **only** through their published public API (`src/index.ts`): facades, integration services and presentational
  components. It never re-implements their HTTP, never re-derives their state, and holds no second source of truth.
- **Fail-safe by construction (SAFETY, ADR-005).** The composite headline is derived from explicit per-source
  health; "all clear" requires every source `ok` and clear. Empty / loading / unknown / error ⇒ degraded headline.
  No boolean collapses an unknown into a reassuring default (kills the prototype `events.every()`-on-empty bug).
- **Emergency is sacred and lives in EVNT.** DASH never renders an emergency style for a non-emergency surface and
  never suppresses or outranks EVNT's takeover; an unconfirmed emergency pre-empts the whole dashboard.
- **Standalone-first** in every feature and component; **NgModule only** in the lazy entry — shared ADR-006
  (module-entry-as-library).
- **Signals-first** state: DASH's facade exposes `signal<T>` private + `.asReadonly()` and `computed` derivations
  (per-source health, composite headline, KPIs); **no NgRx, no manual `BehaviorSubject`** as source of truth.
- **Lazy-by-default**: the shell loads `@neuroassist/dash` via `loadChildren`; sub-routes via `loadComponent`.
- **OnPush mandatory** on all components.
- **Access decisions never inline**: every permission check goes through `@neuroassist/shared/access-decision`
  (`AccessDecisionService.can(...)`), never a role `if`, never a guard that returns a hardcoded `true`
  (carry-forward `guard:stub-permissive`). DASH respects each composed widget's own authority (e.g. the embedded
  history widget is gated by `hist.history.read`).
- **HTTP (only if `dash-service` is confirmed) through the Access Layer**: `@neuroassist/shared/access-http-base`,
  base `${ACCESS_HTTP_BASE}/dash` (correlation id + JWT; **tenant server-derived from the JWT claim**). Base is
  **never** `/api/v1`. Any adapter defaults to **`http`**, with a wire-shaped mock behind an explicit flag only
  (carry-forward `scaffold:mock-adapter-default`).
- **Advisory AI is advisory.** The inline suggestion suggests, never executes; Confirm / Ignore are logged to the
  audit trail; it is a deterministic heuristic, not an LLM call (`ai.hasAi = false`).
- **Design tokens only**: Tailwind v4 utilities bound to oklch tokens from `@neuroassist/shared/ui-tokens`; no
  hardcoded colours; dark is the default theme. **English-only** copy (ADR-018).

## 7. Success signals

| Signal | Target |
|---|---|
| Time-to-answer "Is X OK?" | caregiver can read the headline status < 2 s after the screen settles (Principle 2.1) |
| Fail-safe correctness | zero cases where a loading / empty / unknown / failed source renders as "all clear" (unit + review of the status derivation) |
| No duplicate source of truth | zero direct HTTP in `@neuroassist/dash`; all history / alarm / device / catalog data arrives via the composed modules' public seams (lint + review) |
| Emergency integrity | zero non-emergency surfaces styled as emergency; EVNT takeover never suppressed by DASH (review + e2e) |
| Access-decision correctness | zero inline role checks, zero permissive guard stubs; embedded widgets honour their own authorities (lint + guard spec) |
| TTI, DASH lazy chunk cold | TTI < 2.5 s on the pilot machine |
| CLS on the overview | < 0.1 (reserved panels / skeletons; no shift when panels resolve) |
