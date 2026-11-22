# SPEC-01 — API surface

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).
> Canonical contract: `../../contracts/api-contract.md`.

## Objetivo

Pin the full REST surface of EDGE — every endpoint, verb, authority and status code — as the
implementable source for controllers, the FE edge module and the BDD suite. This SPEC is the
**hard barrier** for FE specs: no FE work starts before it names every endpoint. The authority
strings are canonical in SPEC-06; the detailed request/response bodies in `api-contract.md`.

## Escopo

- **In:** the three endpoint families — human device-management (§2 api-contract), device-token
  endpoints (heartbeat §3, catalog §4), and the authorization-endpoint surface (JWKS §5,
  introspection §6, pair §2.5); error model; header rules.
- **Out:** issuance internals (SPEC-06), watchdog mechanics (SPEC-02), persistence (SPEC-04).

## Decisões técnicas

- Two token fabrics on one service: ACS JWKS verifies human tokens; EDGE's own verifier +
  `/edge/.well-known/jwks.json` cover the `edge.device` token (ADR-002 local, key `hexagonal_java`).
- The pairing claim (`POST /edge/devices/pair`) is **code-authenticated** (header `X-Pairing-Code`),
  not JWT-guarded (ADR-003); every other endpoint is token-guarded or public (JWKS, health).
- `GET` is side-effect free; state changes are `POST` / `PATCH` / `DELETE` only.

## Implementação — endpoint map

| Endpoint | Verb | Authority / mechanism | Success | Notable errors |
|---|---|---|---|---|
| `/edge/devices` | POST | `edge.device.enroll` | `201` | `400 validation-error` |
| `/edge/devices` | GET | `edge.device.read` | `200` | — |
| `/edge/devices/{id}` | GET | `edge.device.read` | `200` | `404 not-found` |
| `/edge/devices/{id}/activation` | POST | `edge.device.activate` | `200` | `409 device-revoked`, `404` |
| `/edge/devices/pair` | POST | `edge.device.pair` (code) | `200` | `401 invalid-pairing-code`, `409 device-not-claimable` |
| `/edge/devices/{id}` | DELETE | `edge.device.deactivate` | `204` | `404` |
| `/edge/devices/{id}/pairing` | DELETE | `edge.device.unpair` | `204` | `404` |
| `/edge/devices/{id}/credential` | DELETE | `edge.device.revoke` | `204` | `404` |
| `/edge/heartbeat` | POST | `edge.heartbeat.record` (device token) | `200` | `403` (not paired), `401` (revoked) |
| `/edge/catalog` | GET | `edge.catalog.read` (device token) | `200` / `304` | `403` (not paired), `503 catalog-unavailable` |
| `/edge/.well-known/jwks.json` | GET | public | `200` | — |
| `/edge/device-tokens/introspect` | POST | service-client | `200` | `403` |
| `/edge/health` | GET | public | `200` | `503` |

## Casos de borda

- `X-Tenant-Id` supplied → ignored; tenant from JWT claim only (INV-EDGE-1).
- A human token on a device endpoint (or vice-versa) → `403` (INV-EDGE-2; no cross-fabric accept).
- Pair replay of a consumed code → `401 invalid-pairing-code` (INV-EDGE-3).

## Critérios de aceite (EARS)

- THE SYSTEM SHALL expose exactly the endpoints in the map above, each guarded by the stated authority or mechanism (INV-EDGE-7).
- WHEN a protected endpoint receives no valid bearer token, THE SYSTEM SHALL respond `401` (except the public JWKS / health and the code-authenticated pair endpoint).
- IF a request supplies `X-Tenant-Id`, THEN THE SYSTEM SHALL ignore it and derive tenant from the JWT `tenantId` claim (INV-EDGE-1).
- THE SYSTEM SHALL return `application/problem+json` with a stable `type`, `status` and `correlationId` on every error (api-contract §8).
