# SPEC-01 — API Surface

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical contract: [`contracts/api-contract.md`](../../contracts/api-contract.md).

## Objective

Pin the REST surface of EVNT so the frontend (`evnt-ui` / DASH) and the backlog/scaffold derive
controllers, DTOs and `@PreAuthorize` constants mechanically.

## Scope

- **In:** every endpoint enumerated in the api-contract §1 barrier table (the core event surface plus
  the out-of-band escalation surface of ADR-005/SPEC-11 and the detection-lapse surface of
  ADR-006/SPEC-12); authorities; headers; RFC 7807 errors.
- **Out:** internal orchestration (SPEC-02), delivery mechanics (SPEC-03), persistence (SPEC-04).

## Technical decisions

- Dual resource-server (ADR-002 local; SPEC-06): device path = EDGE issuer, caregiver paths = ACS
  issuer. Hexagonal per shared `ADR-001-hexagonal-architecture.md` (key `hexagonal_java`).
- Base path `/evnt`; state changes are `POST` only (domain actions: `ingest`, `confirm`, `record`).

## Implementation

Two controllers: `EventReportController` (device path, §2) and `EventController` (caregiver,
§3–5), plus `HealthController` (§7). DTOs map 1:1 to the api-contract bodies.

| Operation | Method/path | Authority |
|---|---|---|
| `ingestGestureReport` | POST `/evnt/gesture-reports` | `evnt.event.ingest` |
| `getActiveAlarm` | GET `/evnt/patients/{id}/active-alarm` | `evnt.event.read` |
| `listPatientEvents` | GET `/evnt/patients/{id}/events` | `evnt.event.read` |
| `getEvent` | GET `/evnt/events/{id}` | `evnt.event.read` |
| `confirmAlarm` | POST `/evnt/events/{id}/confirmation` | `evnt.event.confirm` |
| `recordFeedback` | POST `/evnt/events/{id}/feedback` | `evnt.event.record` |
| `createDetectionLapse` (raise, service-client) | POST `/evnt/detection-lapses` | `evnt.detection-lapse.create` |
| `resolveDetectionLapse` (service-client) | POST `/evnt/detection-lapses/{id}/resolution` | `evnt.detection-lapse.resolve` |
| `listDetectionLapses` (caregiver) | GET `/evnt/patients/{id}/detection-lapses` | `evnt.detection-lapse.read` |
| `acknowledgeDetectionLapse` (caregiver) | POST `/evnt/detection-lapses/{id}/confirmation` | `evnt.detection-lapse.confirm` |

> The escalation-read (`evnt.escalation.read`, api §3.4) and push-subscription CRUD
> (`evnt.subscription.create`/`.delete`, api §6) authorities of ADR-005/SPEC-11 are also part of the
> surface; see the api-contract §1 barrier table for the full enumeration.

## Edge cases

- Wrong issuer for a path → `401` (device token on caregiver path and vice-versa).
- Unknown/cross-tenant/unlinked resource → `404` (never disclose existence — INV-EVNT-7).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL expose exactly the endpoints enumerated in the api-contract §1 barrier table under base path `/evnt`, and no others.
- THE SYSTEM SHALL enforce each endpoint's authority via `@PreAuthorize` equal to the
  `evnt.<resource>.<action>` constant (D-639); no endpoint uses `.view`/`.edit`/`.register`.
- IF any protected endpoint receives no valid bearer token, THEN THE SYSTEM SHALL respond `401`.
- THE SYSTEM SHALL return `application/problem+json` with `type`, `status`, `correlationId` on every error (api-contract §8).
