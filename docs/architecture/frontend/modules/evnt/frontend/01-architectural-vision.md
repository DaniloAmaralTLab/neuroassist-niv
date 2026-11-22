# 01 — Architectural Vision — evnt (EVNT) Frontend

> Module: Events and Alarms · Shell: `neuroassist-niv-web` (caregiver / DASH shell)
> Scope: frontend vision only. No Angular code is produced at this stage.

## 1. Intent (UX-driven)

By the end of an EVNT interaction, a caregiver can, without training and in plain language:

- **know the instant the patient needs help** — when the patient makes an `emergency` command,
  the dashboard is taken over by a **full-screen, unmistakable alarm** (`--color-alarm`,
  full-bleed) naming the patient, the command label and the time the gesture was detected
  (wireframe §5.1–5.5, flow 4.2 — the product's parent flow);
- **close the loop deliberately** — the only action on the alarm is a single **acknowledge**
  button ("Confirm I attended to …"); the system returns to normal **only** after an explicit
  human confirmation (Principle 2.3), and the acknowledgement is recorded for audit;
- **notice routine requests without being alarmed** — a `routine` command surfaces as a
  **discreet, non-blocking notice** (toast / inline card), never as the full-screen takeover
  (wireframe §3.2.E);
- **see at a glance, on Home, whether anything is pending** — Home reads EVNT's live projection to
  answer "is there an active emergency, or a routine notice I have not seen?" with zero clicks.

EVNT is the module that answers "**did the patient just ask for something, how much does it
matter, and have I acknowledged it?**" — it turns a recognized command into a *structured,
urgency-routed, acknowledgeable alarm*.

## 2. Problem statement (current journey vs new journey)

**Today (real system, pre-NIV):** the edge detector produces a recognition, but there is no
caregiver-facing surface that (a) distinguishes an emergency from a routine request, (b) forces the
emergency to be impossible to miss, and (c) demands and records a human acknowledgement. A caregiver
could miss a help request, or could silence it without any trace that it was attended.

**New journey:** EVNT consumes the recognized-command event and **routes by urgency**. Emergency →
full-screen takeover that only an explicit human acknowledgement can dismiss. Routine → a discreet
notice that is noticed but does not alarm the household. Every acknowledgement sets
`Event.confirmedAt` / `confirmedBy` and is audited to HIST. The alarm is reserved **exclusively** for
a real emergency: an offline device (EDGE) yields an amber warning, never an EVNT alarm.

## 3. Personas (jobs-to-be-done)

| Persona | Role / identity | Job-to-be-done in EVNT |
|---|---|---|
| Family Caregiver | `caregiver` | See the full-screen alarm the instant an emergency is raised; acknowledge attendance; notice routine requests without being alarmed. |
| Clinic Coordinator | `clinic_coordinator` | The same alarm/acknowledge loop across the tenant's patients; same audit obligation. |
| Patient | EVNT subject | Subject only — the alarm exists *for* them; the patient never operates an EVNT screen. |
| Edge device (agent) | `edge.device` identity token | Upstream source only — it *raises* the recognition that `evnt-service` turns into an event; it never operates an EVNT dashboard screen, and its token is **not** a caregiver authority. |

## 4. MVP scope (in)

- **Full-screen emergency alarm** (`/alarm`) — full-bleed `--color-alarm`, patient name + command
  label + detection time, **single acknowledge** action; returns to normal only on explicit
  confirmation. Exclusive to `urgency = emergency`. Required states: active-alarm, just-acknowledged
  (session feedback), no-active-alarm, loading, error.
- **Discreet routine notification** — a non-blocking toast / inline notice for `urgency = routine`
  recognitions (wireframe §3.2.E), dismissible, never a takeover.
- **Home alarm/notification surfaces** — the "active emergency" takeover trigger and the routine-notice
  slot that Home reads from EVNT's live projection (EVNT owns the projection; Home embeds it).
- **Acknowledge write** — sets `confirmedAt` / `confirmedBy` / `feedback='real'`, guarded by
  `evnt.event.confirm`, audited to HIST via `evnt-service` (sync REST; messaging disabled).

## 5. Out of scope (MVP)

- **History listing and the immutable audit trail** — owned by **HIST**. EVNT *emits* the
  acknowledgement for audit; it does **not** render the event log (doc 05 §1, ADR-005).
- **Cross-patient dashboard aggregation / KPIs** (e.g. total emergencies, trends) — owned by **DASH**.
  EVNT exposes a per-patient live projection; DASH aggregates across patients from its own read-model.
- **Gesture recognition / the recognized-command signal** — owned by **GEST / edge**; EVNT consumes
  the resulting event, it does not detect.
- **Device connectivity** (online/offline badge, last-sync) — owned by **EDGE**; offline is an amber
  EDGE state, never an EVNT alarm.
- **Patient-session provisioning / revocation** — owned by **ACS**.
- **OS/push, SMS or voice escalation** of the emergency — deferred (doc 06); v1 emergency channel is
  the in-app full-screen takeover only.
- **i18n / locale switch** — English-only (ADR-018).

## 6. Architectural principles

- **Standalone-first** in every feature and component; **NgModule only** in the lazy entry
  (`libs/evnt/.../evnt.module.ts`) — shared ADR-006 (module-entry-as-library).
- **Signals-first** state: facades expose `signal<T>` private + `.asReadonly()`, `computed` for the
  active-emergency derivation; **no NgRx, no manual `BehaviorSubject`** as source of truth.
- **Lazy-by-default**: the Shell loads `@neuroassist/evnt` via `loadChildren`; sub-routes via
  `loadComponent`. The routine-notice surface is a small presentational fed by an EVNT facade the Shell
  injects (Home/topbar parity); the alarm feature loads lazily on `/alarm`.
- **OnPush mandatory** on all components.
- **Ports & adapters at the data edge**: features talk to facades; facades talk to an `EVNT_*_PORT`
  token; **`provideEvnt({ adapter })` defaults to `http`** — `evnt-service` is being architected in
  parallel and the acknowledge/read contract is owned by it (carry-forward
  `scaffold:mock-adapter-default`: the default is **never** `mock`; a `MockAdapter` serving
  wire-shaped fixtures exists for dev/test only).
- **The FE never decides urgency.** `urgency` (emergency | routine) is a property of the `Command`
  resolved by the BE; the FE **routes presentation** by it but never re-classifies an event
  (doc 03 §5, ADR-005).
- **Acknowledgement is deliberate and audited.** The return-to-normal transition requires an explicit
  human action; the FE never auto-dismisses an active emergency, and every acknowledgement is written
  through `evnt-service` (which audits to HIST) — no fire-and-forget.
- **Access decisions never inline**: every permission check goes through
  `@neuroassist/shared/access-decision` (`AccessDecisionService.can('evnt.event.read' | …)`), never
  `if (user.role === …)` and never a guard that returns a hardcoded `true`
  (carry-forward `guard:stub-permissive`).
- **HTTP only through the Access Layer**: `@neuroassist/shared/access-http-base` (correlation id + JWT;
  tenant is server-derived from the JWT claim); components never touch `HttpClient`.
- **Design tokens only**: Tailwind v4 utilities bound to oklch tokens from
  `@neuroassist/shared/ui-tokens`; `--color-alarm` is a token, never a hardcoded red; dark is default.
- **English-only** copy (ADR-018); no locale layer in v1.

## 7. Success signals

| Signal | Target |
|---|---|
| Emergency time-to-visible (event raised → full-screen alarm shown) | ≤ one live-read cycle (doc 05 §2, ADR-005 polling budget) |
| Alarm unmissability | full-screen takeover on 100% of `emergency` events; zero cases where an emergency renders as a toast |
| Acknowledgement completeness | 100% of dismissals carry `confirmedAt` + `confirmedBy` + `feedback`, audited to HIST |
| Routine ≠ emergency correctness | 100% of `routine` events render as a discreet notice, never as the full-screen alarm |
| Offline handling correctness | an EDGE offline state never triggers an EVNT alarm (amber EDGE badge only) |
| Time-to-interactive, EVNT lazy chunk cold | TTI < 2.5 s on the pilot machine |
| CLS on Home notice slot | < 0.1 (reserved notice slot, no layout shift when a notice appears) |
| Access-decision correctness | zero inline role checks, zero permissive guard stubs (lint + guard spec) |
