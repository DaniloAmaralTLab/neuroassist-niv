<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

> Module **DASH — Dashboard and Notifications** · Project: NeuroAssist NIV · Stack: n/a (no backend).
> **Central decision (ADR-001 local, revisable): DASH is a frontend composition/host module and has
> NO backend service.** This vision deliberately defines no `dash-service`, no schema and no
> `/dash/**` endpoints. The reasoning, the alternatives weighed and the upstream consequences are in
> `adr/ADR-001-dash-has-no-backend-service.md`.

## Intent

DASH is the caregiver's front door to NeuroAssist NIV: the **entry** (brand/login) screen and the
**home** overview that answers, at a glance, "Is the patient okay right now?" and offers one-tap
access to History, Calibration and Notifications. DASH is a **presentation and composition** concern,
not a data owner. Every fact it shows is already owned, scoped and served by another module; DASH's
job is to assemble those facts into one calm, trustworthy screen and to host the widgets the other
frontend libraries export.

## Problem Statement

A caregiver should not have to reason about a system of nine modules. They need one place that (a)
reassures them the patient is being watched and nothing is wrong, (b) makes any real problem
impossible to miss, and (c) leads them to the detail screens when they want them. Building a new
backend to serve this would duplicate data and scoping rules that PAT, EDGE, EVNT and HIST already
enforce, and would insert a new always-on dependency between the caregiver and the life-safety
signals. The problem DASH solves is **composition and trustworthy presentation**, not storage.

## Personas

| Persona | Role code | Need DASH serves |
|---|---|---|
| Family Caregiver (primary) | `FAMILY_CAREGIVER` | "Is my person okay?" answered in <2s; reliable notification; one-tap to history. |
| Clinic Coordinator (secondary) | `CLINIC_COORDINATOR` | The same home shell, scoped to the patients they are ACS-linked to within their tenant. |

DASH itself authenticates no one — it carries the **caregiver JWT** issued by ACS and relies on each
module to enforce tenant + caregiver↔patient link scoping on every read.

## MVP Scope

- **Entry screen** (`/entry`): static brand moment and the single "Enter the dashboard" CTA. No
  operational data (prototype `entry.plan.md`).
- **Home screen** (`/home`): a **read-only** overview composed from four sources:
  - patient identity ("okay?" headline) — from **PAT**;
  - edge device status (online/offline, last sync, detecting vs. not-detecting) — from **EDGE**;
  - the day's events and any active emergency — from **EVNT**;
  - the day's summary / quick timeline link — from **HIST**.
- **Host shell** for the widgets other FE libs export (HIST `HistoryWidget`, PAT calibration, EVNT
  alarm/notification surfaces, EDGE `DeviceStatusBadge`/`EdgeDeviceCard`) and the navigation between
  them.

## Out of Scope

- Any `dash-service`, database schema, table, migration or `/dash/**` HTTP endpoint (ADR-001).
- Any newly persisted data — dashboard layout, saved filters, notification quiet-hours. The prototype
  (`home.plan.md` "writes: none") and the BA data model require none.
- Server-side fan-out / aggregation / caching of the overview (a BFF). Recorded as a **revisable**
  future option, not taken at MVP (ADR-001, option B).
- Owning any write path: confirming an alarm, recording feedback, calibrating a command, registering
  a push subscription — all stay with EVNT / PAT; DASH only hosts the widgets that invoke them.

## Architectural Principles

1. **Compose, do not duplicate.** DASH reads existing contracts; it never re-stores or re-derives a
   fact another module owns.
2. **No new blast radius.** A caregiver's reach to a life-safety signal (EVNT active-alarm) must not
   gain a new single point of failure. DASH adds no server between the browser and EVNT/EDGE/HIST/PAT.
3. **Fail safe, never false-calm.** The home overview must never show "all clear" when any source
   could not be read or is stale (see doc 02 §5 and ADR-002). Silence is "unknown", never "okay".
4. **Caregiver identity end-to-end.** Reads use the caregiver's own ACS JWT; scoping is enforced by
   each owning module (tenant + ACS link), not re-implemented in DASH.
5. **Pull where the owner advertises pull.** EVNT advertises `pollIntervalSeconds` (ADR-003); DASH's
   client honors the server-advertised cadence rather than inventing one.

## Success Signals

- A caregiver can answer "is the patient okay?" from the home screen in under two seconds.
- When EVNT, EDGE, HIST or PAT is unreachable or returns stale data, the home screen shows a visible
  "unknown / cannot confirm" state for that source and **never** a green "all clear" (ADR-002).
- Zero new backend surface: no `/dash/**` route in GWY, no `dash-service` in REG, no DASH schema in
  MIG — confirmed at scaffold time.
- No data-ownership overlap: every field on the home screen traces to exactly one owning module's
  documented contract (doc 02 §2).
