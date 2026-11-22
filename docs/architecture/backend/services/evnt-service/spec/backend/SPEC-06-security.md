# SPEC-06 — Security

> Service: `evnt-service` · Module **EVNT** · EARS guide: `../../../../standards/ears-notation.md`
> ADR: `../../adr/ADR-002-gesture-report-ingestion-contract.md`. RBAC standard:
> `../../../../standards/rbac.md`.

## Objective

Define EVNT's dual resource-server trust, the authority model, and tenant/link isolation.

## Scope

- **In:** dual JWT issuer trust (EDGE + ACS), authority constants, tenant isolation, read scoping,
  anti-forgery on ingest.
- **Out:** the ACS service-client minting path (TODO[architect], integration-contracts §2 and
  INT-EVNT-ACS-002 for the `edge-service` detection-lapse token, §9).

## Technical decisions

- **Triple resource server** (ADR-002 + ADR-006): the device path trusts the **EDGE** issuer
  (`edge.device` token, EDGE JWKS + introspection); the caregiver paths trust the **ACS** issuer
  (caregiver JWTs, ACS JWKS + introspection on confirm); the **detection-lapse ingest path** (raise /
  resolve, api §10) trusts an ACS-issued **service-client** JWT for the `edge-service` principal
  (`actorType = service-client`), **never** the `edge.device` station token. A token from the wrong
  issuer/type on a path → `401`.
- **Authority model (`evnt.<resource>.<action>`, D-639):** `evnt.event.ingest`, `evnt.event.read`,
  `evnt.event.confirm`, `evnt.event.record`; the out-of-band escalation surface (ADR-005 / SPEC-11):
  `evnt.subscription.create`, `evnt.subscription.delete`, `evnt.escalation.read`; and the
  detection-lapse surface (ADR-006 / SPEC-12): `evnt.detection-lapse.create` (raise) +
  `evnt.detection-lapse.resolve` — **service-client (`edge-service`)** authorities — plus
  `evnt.detection-lapse.read` (caregiver list) + `evnt.detection-lapse.confirm` (caregiver
  acknowledgement, the same human-ack shape as `evnt.event.confirm`). English canonical actions only
  (`ingest`/`read`/`confirm`/`record`/`create`/`delete`/`resolve`) — the raise op is `create` because
  `raise` is not a listed verb, and acknowledgement reuses `confirm` rather than an unlisted
  `acknowledge`; never `.view`/`.edit`/`.register`/`.raise`/`.acknowledge`. A single
  `RoleAuthorityPolicy` is the source; `@PreAuthorize` strings equal those constants.
- **Tenant isolation (INV-EVNT-1):** tenant derives from the JWT `tenantId` claim; `X-Tenant-Id` and
  any body-supplied tenant are ignored.
- **Read scoping (INV-EVNT-7, resolved gap):** a caregiver reads/confirms/records only events of
  patients they are linked to in ACS, within their tenant; unlinked/cross-tenant → `404`.
- **Anti-forgery on ingest (INV-EVNT-6):** `deviceId`/`patientId`/`tenantId` come from the
  `edge.device` claims, never the body; a revoked device is rejected `401` via introspection.

## Edge cases

- A valid caregiver token but patient not linked → `404` (not `403` — existence hidden).
- EDGE introspection briefly down → signature-valid unexpired device token still passes, logged
  best-effort; ACS/EDGE JWKS cached.

## Acceptance criteria (EARS)

- IF a request supplies `X-Tenant-Id`, THEN THE SYSTEM SHALL ignore it and use the JWT `tenantId` claim (INV-EVNT-1).
- IF the device path receives a caregiver token (or a caregiver path an `edge.device` token), THEN THE SYSTEM SHALL respond `401` (INV-EVNT-6).
- WHEN a caregiver accesses an event, THE SYSTEM SHALL verify the event's `patientId` is in the caller's ACS links and respond `404` otherwise (INV-EVNT-7).
- THE SYSTEM SHALL take ingest identity exclusively from the `edge.device` claims and reject a revoked device `401` (INV-EVNT-6).
- THE SYSTEM SHALL enforce each endpoint's `evnt.<resource>.<action>` authority and respond `403` when it is missing.
- WHEN a caregiver registers or removes a Web Push subscription, THE SYSTEM SHALL bind it to the caller's `caregiverId`/`tenantId` from the JWT and respond `404` on a subscription the caller does not own (SPEC-11, api §6).
- THE SYSTEM SHALL mask destinations (phone, push endpoint) in the `GET .../escalation-attempts` response so a read never discloses full contact material (SPEC-11, api §3.4).
- WHEN the detection-lapse raise/resolve path (api §10) receives anything other than an `edge-service` service-client token carrying `evnt.detection-lapse.create`/`.resolve`, THE SYSTEM SHALL respond `401`/`403` and SHALL NOT accept the `edge.device` station token on that path (ADR-006, SPEC-12).
- WHEN a caregiver lists or acknowledges a detection lapse (api §11–12), THE SYSTEM SHALL scope it by tenant + ACS link and respond `404` for an unlinked/cross-tenant patient (INV-EVNT-7).
