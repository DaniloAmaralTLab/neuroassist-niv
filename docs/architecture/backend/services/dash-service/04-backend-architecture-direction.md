<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

> Module **DASH** · NeuroAssist NIV. The project default stack is `java` (Java 21 / Spring Boot,
> hexagonal), but **DASH has no backend** (ADR-001), so no stack is instantiated for it. This
> document records the "no service" direction and its consequences rather than a package layout.

## Stack

**Not applicable — no backend is built for DASH.** Had a service been warranted, it would have
followed the project default (`stack.backend.language = java`: Java 21 / Spring Boot, Gradle Kotlin
DSL, Flyway, hexagonal per shared `adr/ADR-001-hexagonal-architecture.md`). That stack is deliberately
**not** instantiated. The caregiver-facing surface is the Angular `dash-ui` library, whose stack is
owned by the frontend vision (`/fe-architect-vision DASH`).

## Service Boundary

**No service.** DASH is not a single service and not a decomposition — it is a frontend composition
host. The single-service-vs-decomposition decision for this module is therefore "**no backend
service**", recorded locally in `adr/ADR-001-dash-has-no-backend-service.md`.

Three options were weighed:

- **(A) No `dash-service` — recommended.** DASH is a FE composition/host module; `dash-ui` calls
  PAT/EDGE/EVNT/HIST directly via GWY with the caregiver JWT. Chosen: nothing to persist, no new
  blast radius, no duplicated scoping.
- **(B) Thin BFF / aggregation service.** Would own one `GET /dash/home-overview` fan-out + caching.
  *Not taken at MVP.* It would own no data (only a fan-out), add a new always-on dependency between
  the caregiver and life-safety reads (its downtime fails the home even when PAT/EDGE/EVNT/HIST are
  up), duplicate each module's tenant+link scoping, and risk consistency drift by re-projecting fields
  owned elsewhere. GWY already provides the single ingress and fan-out routing. Revisit only if
  clinic-scale fan-out (many patients per coordinator) later makes N client calls per render costly.
- **(C) `dash-service` owning genuinely new data** (e.g. dashboard preferences, notification
  quiet-hours). *Not taken.* The prototype `home.plan.md` is explicitly `writes: none`, the `entry`
  screen is static, and the BA data model (9 entities) contains no DASH-owned entity. There is no
  data no module owns. If a future requirement introduces caregiver-level preferences, that is the
  trigger to revisit (C) — and even then it may belong in ACS (caregiver-scoped) rather than a new
  service.

## Package Organization

**None.** There is no `com.neuroassist.dash` package and no `api/application/domain/infrastructure`
tree, because no backend module is generated (ADR-001, INV-DASH-4). The frontend package/layout of
`dash-ui` is defined by the FE vision, not here.

## Hub Service Dependencies

DASH (the `dash-ui` frontend) depends, read-only and synchronously, on these module contracts, each
called with the **caregiver JWT** through **GWY**:

| Dependency | Endpoint(s) consumed | Authority (held by caregiver role) |
|---|---|---|
| **PAT** | `GET /pat/patients`, `GET /pat/patients/{patientId}` | `pat.patient.read` |
| **EDGE** | `GET /edge/devices`, `GET /edge/devices/{deviceId}` (connectivity + `detectionState`/`lastDetectingAt`) | `edge.device.read` |
| **EVNT** | `GET /evnt/patients/{patientId}/active-alarm`, `GET .../events`, `GET .../detection-lapses`, `POST`/`DELETE /evnt/push-subscriptions` (via the hosted EVNT widget) | `evnt.event.read`, `evnt.detection-lapse.read`, `evnt.subscription.create/delete` |
| **HIST** | `GET /hist/patients/{patientId}/history` (timeline + first-page `summary`) | `hist.history.read` |
| **ACS** | Token issuer / JWKS (indirect — DASH only carries the token) | — |
| **GWY** | Ingress + routing + `X-Correlation-Id` injection | — |

No TechLab AI hub dependency (the project uses none; inline-AI in the prototype is advisory UI only).

## External Integrations

None owned by DASH. All integrations are internal module reads listed above. DASH adds no third-party
API, no legacy system and no outbound integration of its own.

## Async vs Sync Decisions

- **All reads synchronous REST.** `stack.messaging.enabled = false`; there is no broker to subscribe
  to, and DASH is a read composition, so every call is a synchronous HTTPS/JSON `GET`.
- **Live updates by polling, not push-to-DASH.** The dashboard polls EVNT `active-alarm` at the
  server-advertised `pollIntervalSeconds` (EVNT ADR-003); DASH introduces no websocket/SSE server.
- **Out-of-band notification is EVNT's, not DASH's.** Web Push → SMS → voice escalation (EVNT ADR-005)
  and detection-lapse alerting (EVNT ADR-006) run inside EVNT; the browser push subscription is
  registered via the EVNT widget hosted in DASH. DASH owns no async machinery.
- **No fan-out on a server.** Fan-out across PAT/EDGE/EVNT/HIST happens in the browser (parallel
  client calls), not in a DASH backend (that would be option B, not taken).
