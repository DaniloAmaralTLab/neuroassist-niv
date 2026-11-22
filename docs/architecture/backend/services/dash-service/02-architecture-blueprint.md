<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Module **DASH** · NeuroAssist NIV · **No backend service** (ADR-001). The "system" here is the
> `dash-ui` frontend and its read contracts against PAT / EDGE / EVNT / HIST, all fronted by GWY.

## System Boundary

DASH's boundary is a **frontend** boundary, not a service boundary. Inside: the Angular `dash-ui`
library — the `EntryComponent`, the `HomeComponent` overview, and the host shell that embeds the
widgets of the other module libs. Outside: every piece of data, which is owned and served by another
module's backend. DASH persists nothing and exposes no server API. The only thing DASH "owns" is the
**composition contract** of the home overview (which sources feed which regions, and the fail-safe
rule) — and that contract lives in the frontend vision (`/fe-architect-vision DASH`), not in a
backend spec.

## External Actors and Systems

| Actor / system | Interaction | Owner |
|---|---|---|
| Family Caregiver / Clinic Coordinator | Loads `/entry` then `/home` in the browser; carries the ACS caregiver JWT | — |
| **GWY** (API Gateway, Spring Cloud Gateway) | Single ingress; routes `/pat`, `/edge`, `/evnt`, `/hist`; injects `X-Correlation-Id` | GWY |
| **ACS** | Issued the caregiver JWT; publishes JWKS the modules validate against | ACS |
| **PAT** | `GET /pat/patients`, `GET /pat/patients/{id}` — patient identity/label (caregiver JWT) | PAT |
| **EDGE** | `GET /edge/devices`, `GET /edge/devices/{id}` — connectivity + `detectionState`/`lastDetectingAt` | EDGE |
| **EVNT** | `GET /evnt/patients/{id}/active-alarm` (polled, advertises `pollIntervalSeconds`), `GET .../events`, `GET .../detection-lapses`, push-subscription register/remove | EVNT |
| **HIST** | `GET /hist/patients/{patientId}/history` — timeline + first-page `summary` | HIST |

DASH introduces **no** new external actor and **no** new system of its own.

## End-to-End Flows

**Golden path — "Is the patient okay?" (home render, flow 4.6).**
1. Caregiver opens `/home`; `dash-ui` holds the caregiver JWT.
2. In parallel, the client calls (via GWY, each with the caregiver JWT + the shared
   `X-Correlation-Id`): PAT patient read, EDGE device read, EVNT active-alarm (+ open
   detection-lapses), HIST day summary.
3. Each owning module enforces tenant + ACS link scoping and returns its slice.
4. `dash-ui` composes the four slices: patient name, a device badge (online/offline + detecting),
   the "okay / needs attention" headline, and the day's counts with a link to full History.
5. The client then **polls EVNT active-alarm** at the server-advertised `pollIntervalSeconds` so a
   new emergency surfaces without a reload.

**Alternative / degraded paths.**
- Any of the four reads fails (timeout, 5xx, network) or is stale → that region renders "cannot
  confirm" and the overall headline degrades to "status unknown" — **never** "all clear" (§5, ADR-002).
- An active emergency is present (EVNT `activeAlarm != null`) → the home surfaces the EVNT alarm
  widget at the top; acknowledgement is performed by the EVNT widget calling EVNT directly.
- A detection-lapse is open (`GET /evnt/patients/{id}/detection-lapses?status=open`) → surfaced as a
  distinct "station not detecting" banner, never as an emergency (EVNT LAPSE-3), acknowledged via the
  EVNT widget.
- Out-of-band notification while the dashboard is backgrounded → handled by **EVNT** Web Push →
  SMS → voice (ADR-005); the browser's push subscription is registered/removed by the EVNT widget
  hosted in DASH, not by a DASH backend.

## Internal Boundaries

There are no hexagonal backend layers to describe — DASH has no `api/application/domain/infrastructure`
packages (ADR-001). The internal structure is the `dash-ui` frontend's own layering (components,
routing, state, and typed API clients generated from the PAT/EDGE/EVNT/HIST contracts), defined by
the FE vision. The one invariant that crosses into this backend-vision: **DASH composes typed clients
against the published contracts and adds no server tier between them and the browser.**

## Cross-cutting Concerns

- **Security.** DASH stores no secret and mints no token. It forwards the ACS caregiver JWT on every
  read; authorization (`pat.patient.read`, `edge.device.read`, `evnt.event.read`,
  `evnt.detection-lapse.read`, `hist.history.read`) is held by the caregiver role (SPEC-06) and
  enforced by each owning module. DASH must **not** be modelled as a service-client (see doc 06 R1 —
  PAT's doc currently lists "service client (DASH)"; under ADR-001 that read is the caregiver
  dashboard using the caregiver JWT, not a DASH backend principal).
- **Observability.** The client propagates/echoes `X-Correlation-Id` so a home render correlates
  across PAT/EDGE/EVNT/HIST in one trace. DASH emits no HIST audit of its own (it writes nothing).
- **Multi-tenancy.** DASH holds no schema; tenant isolation is wholly delegated to the owning modules
  (schema-per-tenant, `neuroassist_global`), which derive the tenant from the JWT, never a header
  (shared ADR `ADR-003-multi-tenancy.md`).
- **Safety (SAFETY-DASH-1).** The composed overview is **fail-safe**: a missing/stale/errored source
  degrades to "unknown", never to "okay". This is the single most important cross-cutting rule and is
  recorded as a decision in `adr/ADR-002-fail-safe-home-overview.md`.
