<!-- OUTPUT-SCHEMA
- Status
- Context
- Decision
- Consequences
-->

# ADR-001 — DASH has no backend service

## Status

aceita — accepted (owner-adopted orchestrator default, 2026-11-20) — **revisable**. Scope: local to module DASH.
Supersedes the registry assumption that DASH ships a `dash-service`.

## Context

DASH ("Dashboard and Notifications") is the caregiver's entry + home shell. The open question carried
from M0 was: *does DASH need its own backend (`dash-service`), or is it a frontend composition/host
module only?*

The facts the home screen shows are each already owned by another module, with caregiver-scoped,
tenant- and link-enforced read contracts already specified:

- **History / day summary** — HIST `GET /hist/patients/{patientId}/history` (authority
  `hist.history.read`), which returns a first-page `summary` computed over the whole period.
- **Calibration** — PAT (`GET/PATCH /pat/patients/{id}/commands`), and patient identity via
  `GET /pat/patients`.
- **Alarms / notifications / detection-lapse alerts / push subscriptions** — EVNT
  (`active-alarm` polled per ADR-003; Web Push→SMS→voice per ADR-005; detection-lapse per ADR-006;
  `push-subscriptions`).
- **Device + detection state** — EDGE device read model (`connectivity`, `detectionState`,
  `lastDetectingAt`).
- **Caregiver↔patient links + sessions** — ACS.

The prototype's two unowned screens were inspected: `entry` (static brand/login, no data) and `home`
(`home.plan.md`: reads Patient/EdgeDevice/Event, **`writes: (none)`**). The BA draft data model (9
entities) contains no DASH-owned entity. So there is **no data that no module owns**.

The project also has `stack.messaging.enabled = false` (all cross-module traffic is synchronous REST)
and a GWY API Gateway (Spring Cloud Gateway) that already provides the single ingress and fan-out
routing with `X-Correlation-Id` injection.

Options weighed:

- **(A) No `dash-service`** — DASH is a FE composition/host module; `dash-ui` calls the module APIs
  directly through GWY with the caregiver JWT.
- **(B) Thin BFF / aggregation `dash-service`** — one `GET /dash/home-overview` fan-out + caching.
  It would own no data (only a fan-out), but would add an always-on service between the caregiver and
  life-safety reads: its downtime would fail the home screen even while PAT/EDGE/EVNT/HIST are up (new
  blast radius / SPOF), it would duplicate each module's tenant+link scoping, and it would risk
  consistency drift by re-projecting fields owned elsewhere. It centralizes the "okay" computation —
  the single most safety-sensitive thing — into one place where a bug yields a false "all clear".
- **(C) `dash-service` owning genuinely new data** (dashboard layout prefs, notification quiet-hours).
  No such data is required by the prototype or BA docs; and were it added later, caregiver-scoped
  preferences would more naturally extend ACS than spawn a new service.

## Decision

**We will not build a `dash-service`.** DASH is a **frontend composition/host module** (`dash-ui`):
it reads PAT, EDGE, EVNT and HIST directly through GWY using the caregiver's ACS JWT, composes their
responses into the home overview, and hosts the widgets those modules' FE libs export. DASH persists
nothing, exposes no `/dash/**` endpoint, and is not a service-client. The **home-overview composition
contract** (which source feeds which region, polling cadence, and the fail-safe rule) lives in the
**frontend** vision/specs (`/fe-architect-vision DASH`), not in a backend spec. Option (A) is adopted;
(B) and (C) are recorded and **not taken at MVP** (revisable — see triggers below).

## Consequences

Positive:

- No new data duplication and no re-implemented tenant/link scoping — each owning module stays the
  single source of truth.
- No new availability blast radius: the caregiver's reach to EVNT (alarms) and EDGE (detection state)
  gains no extra always-on hop. GWY already fans out.
- Smaller build/operate surface: no DASH Gradle module, no schema, no deployable.

Negative / trade-offs accepted:

- The home screen issues ~4 parallel client calls per render (mitigated by per-tile states; revisit
  option B only if clinic-scale fan-out proves costly — the revisit trigger).
- The fail-safe "okay status" rule must be enforced in the frontend (ADR-002) rather than in one
  backend place.

Upstream / cross-module impacts (must be honored downstream):

- **Registry.** Set `modules.registry[prefix=DASH].backendService = null` in
  `project-context.json` (currently `"dash-service"`). DASH keeps `frontendLib: dash-ui`,
  `hasUi: true`. (This phase does not edit the registry; flagged for the owner — doc 06 G3.)
- **MIG** (`neuroassist-niv-migrations`): add **no** DASH schema/migration set — DASH owns no table.
- **GWY** (API Gateway): register **no** `/dash/**` route; DASH is served as frontend static assets /
  the Nx app shell and routes only to the existing `/pat`, `/edge`, `/evnt`, `/hist`.
- **REG** (Eureka): **no** `dash-service` instance to register.
- **`/be-architect-scaffold DASH`**: should be a **no-op / skipped** — there is no microservice
  skeleton to generate. The backend pipeline (specs/backlog/scaffold) for DASH produces no service;
  the module's build work is entirely the FE pipeline.
- **PAT doc reconciliation**: PAT's "service client (DASH)" actor annotation should read
  "caregiver dashboard (caregiver JWT)" (doc 06 G1).
- The directory `docs/architecture/backend/services/dash-service/` remains only as the docs home for
  this decision; it is not evidence of a running service.

Revisit triggers (this ADR is revisable): (1) a measured need for server-side aggregation/caching at
clinic scale; (2) a new requirement for caregiver-owned preference data — and even then prefer ACS.
