# 01 — Architectural Vision — edge (EDGE) Frontend

> Module: Edge Device Integration · Shell: `neuroassist-niv-web` (caregiver / DASH shell)
> Scope: frontend vision only. No Angular code is produced at this stage.

## 1. Intent (UX-driven)

By the end of an EDGE interaction, a caregiver or technical lead can, from the dashboard and in plain
language:

- **pair the patient's edge agent** — a fixed station or the patient's own Android/Chromium phone —
  to the patient, during onboarding, watching a simple `idle → pairing → paired` progression;
- **see at a glance whether the detector is online** — the device connectivity (online/offline + how
  long ago it last synced) is **always visible** in the topbar and on Home, never buried in a submenu
  (Principle 2.6, wireframe §0.6);
- **trust the device identity** — the paired phone reuses the same device-identity model already used
  by the fixed station (ADR-014), so GEST detection works the same on either;
- **re-pair or unpair** a device when hardware changes, without touching the patient's command catalog
  or their persistent session.

EDGE is the module that answers "**is this patient's detector paired, and is it alive right now?**" —
the connectivity backbone the rest of the product (GEST detection, EVNT alarms, Home status) reads to
know it can trust what it is showing.

## 2. Problem statement (current journey vs new journey)

**Today (real system, pre-NIV):** the edge agent and its liveness were implicit. There is a pairing
flow (claim → heartbeat) in the real `gest/frontend` repo, but in the SaaS dashboard there is no
first-class, caregiver-facing surface that says "this device is paired to this patient and it is
online". A caregiver cannot tell a dead detector from a quiet patient.

**New journey:** EDGE surfaces the edge device as a first-class dashboard concern. Pairing is a guided
step in onboarding (Screen 05) and, for the patient-phone case, in activation (Screen 07) — reusing
the **same** device-identity model (ADR-014). Connectivity is a persistent, honest read-model:
`DeviceStatusBadge` in the topbar and the Edge-device card on Home show online/offline + last sync, and
an **offline device yields an amber warning, never a false alarm** (the full-screen alarm is reserved
exclusively for a real `HELP_REQUESTED`, wireframe Screen 01 states).

## 3. Personas (jobs-to-be-done)

| Persona | Role / identity | Job-to-be-done in EDGE |
|---|---|---|
| Technical lead (onboarding) | `caregiver` (one-off) | Pair the patient's edge agent (station or phone) during initial setup; confirm it reports online before handing over. |
| Family Caregiver | `caregiver` | Read device status day-to-day; know immediately if the detector went offline; re-pair after a hardware change. |
| Clinic Coordinator | `clinic_coordinator` | Same device-status reads plus device lifecycle (pair/unpair) across the tenant's patients. |
| Edge device (agent) | `edge.device` identity token | Subject/actor only — the agent *reports* heartbeat and *pulls* the catalog; it never operates an EDGE dashboard screen. Its token is **not** a caregiver authority. |
| Patient | EDGE subject | Subject only — the device belongs to *them*; the patient never operates an EDGE screen. |

## 4. MVP scope (in)

- **Device pairing panel** — initiate the pairing claim, render `idle → pairing → paired`, confirm the
  device as paired. Promoted as **Step 3 "Edge device"** of the shell-orchestrated onboarding wizard
  (Screen 05) and reused as the **device-pairing portion** of patient-phone activation (Screen 07).
  When a device already exists for the patient, the panel shows "already paired · version N" + the
  online/offline badge directly (prototype parity: it reads the real `DevicesFacade`, not a reset
  simulation).
- **Device status read-model** — a `DeviceStatusBadge` (online/offline + last-sync relative time)
  surfaced in the **Topbar** (always visible, §3.2.B) and an **Edge-device card** on **Home**
  (status, version, synced-ago). Offline is an amber state, never an alarm.
- **Device lifecycle (lightweight)** — re-pair / unpair a device, guarded by `edge.device.pair` /
  `edge.device.unpair`; unpairing a device never deletes the patient, their catalog or their session.

## 5. Out of scope (MVP)

- Real gesture recognition and landmark extraction — owned by **GEST / edge** (doc 06 carries the seam).
- **PatientSession** provisioning / revocation on Screen 07 — owned by **ACS**
  (`feature-patient-sessions`, ADR-012 / SEC-001). EDGE owns the *device-pairing* portion of that
  screen; ACS owns the *session* portion. The two meet but never merge (doc 02 §3, ADR-005).
- The command-catalog authoring and the catalog→edge sync *business logic* — PAT publishes the catalog;
  `edge-service` pulls it on heartbeat; EDGE FE only *surfaces* sync freshness ("synced N min ago").
- Rendering the emergency full-screen alarm vs the discreet routine notice — owned by **EVNT**.
- The patient runtime shell / "Patient Mode" switch (open question ADR-012 §3.2.B) — a CONV/GEST
  runtime concern, not EDGE.
- Any i18n / locale switch — the product is English-only (ADR-018).

## 6. Architectural principles

- **Standalone-first** in every feature and component; **NgModule only** in the lazy entry
  (`libs/edge/.../edge.module.ts`) — shared ADR-006 (module-entry-as-library).
- **Signals-first** state: facades expose `signal<T>` private + `.asReadonly()`; no NgRx, no manual
  `BehaviorSubject` as source of truth.
- **Lazy-by-default**: the Shell loads `@neuroassist/edge` via `loadChildren`; sub-routes via
  `loadComponent`. The `DeviceStatusBadge` is a small eager-presentational fed by an EDGE facade the
  Shell injects (topbar parity) — the heavy pairing/lifecycle features stay lazy.
- **OnPush mandatory** on all components.
- **Ports & adapters at the data edge**: features talk to facades; facades talk to an `EDGE_*_PORT`
  token; `provideEdge({ adapter })` defaults to **`mock`** *for now* (edge-service is not yet
  architected), with a `MockAdapter` serving fixtures in the same wire shape — ready to flip the
  default to **`http`** the moment `edge-service` lands (carry-forward `scaffold:mock-adapter-default`).
- **The FE never computes liveness.** Online/offline is a **server-derived** value read from
  `edge-service`; the FE renders what the heartbeat projection reports and never infers "offline" from
  client-side timers (ADR-005).
- **Access decisions never inline**: every permission check goes through
  `@neuroassist/shared/access-decision` (`AccessDecisionService.can('edge.device.view' | …)`), never
  `if (user.role === …)` and never a guard that returns a hardcoded `true`
  (carry-forward `guard:stub-permissive`).
- **HTTP only through the Access Layer**: `@neuroassist/shared/access-http-base` (correlation id +
  JWT; tenant is server-derived from the JWT claim); components never touch `HttpClient`.
- **Device identity ≠ caregiver authority.** The `edge.device` token the agent carries (for GEST) is a
  device identity, kept strictly separate from the caregiver `edge.*` authorities the dashboard guards.
- **Design tokens only**: Tailwind v4 utilities bound to oklch tokens from
  `@neuroassist/shared/ui-tokens`; no hardcoded colour/spacing; dark is the default theme.
- **English-only** copy (ADR-018); no locale layer in v1.

## 7. Success signals

| Signal | Target |
|---|---|
| Pairing flow completion (initiate → paired) | ≥ 95% without support |
| Connectivity visibility | device status visible on 100% of dashboard screens (topbar), zero clicks |
| Time-to-interactive, EDGE lazy chunk cold | TTI < 2.5 s on the pilot machine |
| Status-badge freshness | last-sync relative time reflects the server heartbeat within one read cycle |
| CLS on topbar / Home device widgets | < 0.1 (reserved badge slot, no layout shift on status change) |
| Offline handling correctness | offline → amber badge only; never triggers the EVNT alarm |
| Access-decision correctness | zero inline role checks, zero permissive guard stubs (lint + guard spec) |
