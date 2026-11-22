<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

> Service: `evnt-service` · Module **EVNT — Events and Alarms** · Project: NeuroAssist NIV
> All intra-project interactions are **sync REST** (messaging disabled). EVNT pushes nothing.

## System Boundary

EVNT is a single Spring Boot microservice (`evnt-service`) that owns the **Event** aggregate and the
**notification orchestration** surface. It plays **two security roles at once**, exactly like EDGE:

- On the **report path** it is an **EDGE resource server** — it validates the `edge.device` token
  (EDGE JWKS + introspection) and never issues a token.
- On the **caregiver path** it is an **ACS resource server** — it validates ACS caregiver /
  coordinator JWTs (ACS JWKS + introspection) and enforces `evnt.*` authorities.

Inside the boundary: generate the Event from a report, snapshot the Command's urgency/label, compute
the active-emergency query, confirm an alarm, record feedback, audit to HIST. Outside the boundary:
detection (GEST/edge), device lifecycle (EDGE), catalog (PAT), identity (ACS), audit storage (HIST),
and the alarm/toast **rendering** (the `evnt-ui` / DASH frontend, which polls this service).

## External Actors and Systems

| Actor / system | Direction | Interaction |
|---|---|---|
| **Edge station** (`edge-device` token) | inbound | `POST /evnt/gesture-reports` — reports the recognized command (G5). |
| **Caregiver dashboard** (`evnt-ui` / DASH, caregiver token) | inbound | polls `GET /evnt/patients/{id}/events`, `GET /evnt/patients/{id}/active-alarm`; `POST .../confirmation`; `POST .../feedback`. |
| **EDGE** (`edge-service`) | outbound | `GET /edge/.well-known/jwks.json` (public), `POST /edge/device-tokens/introspect` (service-client) — validate the report token. |
| **PAT** (`pat-service`) | outbound | `GET /pat/commands/{commandId}` (service-client, `pat.command.read`) — resolve urgency + label. |
| **ACS** (`acs-service`) | outbound | JWKS + `POST /acs/auth/introspect` (validate caregiver tokens); `GET /acs/caregivers/{id}/links` (who-to-notify). |
| **HIST** (`hist-service`) | outbound | `POST /audit` (service-client) — append-only audit. |
| **MIG** (`neuroassist-niv-migrations`) | build-time | EVNT authors Flyway scripts; MIG applies them centrally. |
| **REG** (Eureka) / **GWY** (gateway) | infra | discovery + fronting; `*.base-url` direct fallback. |

## End-to-End Flows

The golden path is the emergency alarm; the routine notification and feedback are the main
alternatives, and the failure branches cover the degrade policies refined at specs.

### Golden path — emergency alarm

1. The edge station recognizes the active `emergency` command offline and `POST /evnt/gesture-reports`
   with its `edge.device` token and a station-generated `reportId` + the `commandId`.
2. EVNT validates the token (EDGE JWKS; introspection on this revoke-sensitive path), derives
   `deviceId` / `patientId` / `tenantId` from the **claims**, and checks `evnt.event.ingest`.
3. EVNT dedups on `(deviceId, reportId)` — a replay returns the already-created event (`200`),
   no duplicate.
4. EVNT calls `GET /pat/commands/{commandId}` (service-client) to resolve `urgency` + `label`, and
   generates one `Event` with `urgency` + `label` **snapshotted** (ADR-008/ADR-004 local).
5. EVNT audits `EventGenerated` to HIST; responds `201` with the event id.
6. The caregiver dashboard, polling `GET /evnt/patients/{id}/active-alarm`, receives the unconfirmed
   `emergency` event and renders the **full-screen alarm** (`--color-alarm`, single confirm action).
7. The caregiver confirms → `POST /evnt/events/{id}/confirmation` writes `confirmedAt` / `confirmedBy`,
   audits `AlarmConfirmed`; the active-alarm query now returns empty and every screen calms.

### Alternative — routine notification

Steps 1–5 identical for a `routine` command. The dashboard poll of the events surface shows the new
`routine` event and renders a **discreet toast** (label + timestamp, auto-dismiss); no screen
takeover and no blocking confirmation. The event is still recorded for History.

### Alternative — feedback

On any past event the caregiver `POST /evnt/events/{id}/feedback` with `real` | `false_positive`;
EVNT updates `feedback`, audits `FeedbackRecorded`.

### Failure branches

- Invalid / revoked device token → `401`; no event generated.
- PAT unreachable at generation → see ADR-004 (local) resolution: fail the report so the station
  retries (TODO[architect] confirm degrade policy at specs).
- HIST audit failure → project HIST failure policy (hard `502` vs enqueue — TODO[architect], same
  open item ACS/PAT/EDGE flagged).

## Internal Boundaries

Hexagonal layers (`com.neuroassist.evnt`), dependencies pointing inward:

- **api** — `EventReportController` (device path), `EventController` (caregiver path), DTOs, mappers.
- **application** — use-case services (`IngestGestureReport`, `ConfirmAlarm`, `RecordFeedback`,
  `ReadActiveAlarm`, `ListPatientEvents`); `@Transactional` lives here; orchestrates ports.
- **domain** — `Event` aggregate, value objects (`Urgency`, `Feedback`, `CommandSnapshot`,
  `ReportId`), and ports (`EventRepository`, `CommandCatalogPort`, `CaregiverLinkPort`,
  `DeviceTokenIntrospectionPort`, `AuditPort`).
- **infrastructure** — JPA adapter (schema-per-tenant), Feign/REST clients to PAT/ACS/EDGE/HIST,
  JWT resource-server config (dual issuer: ACS + EDGE), security.

## Cross-cutting Concerns

- **Security:** dual resource-server trust (ACS issuer for caregivers, EDGE issuer for the device);
  authority checks `evnt.<resource>.<action>`; tenant from JWT claim only; body-supplied identity
  on the report is ignored in favour of token claims (anti-forgery).
- **Multi-tenancy:** schema-per-tenant (`t_<tenantId>`); the `event` table lives per tenant; tenant
  routing from the `tenantId` claim (mirrors ACS/PAT/EDGE, ADR-003 shared).
- **Observability:** `X-Correlation-Id` propagated end-to-end and echoed on every HIST audit; the
  report `reportId` and `correlationId` are the join keys across EDGE → EVNT → HIST.
- **Idempotency:** exactly-once event per `(deviceId, reportId)` reconciles at-least-once delivery.
- **Resilience:** per-dependency timeouts + JWKS caching; PAT/EDGE/ACS reachability degrade policies
  defined at specs (see doc 06).
