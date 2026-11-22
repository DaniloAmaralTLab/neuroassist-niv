# SPEC-01 — API surface

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical contract: `../../contracts/api-contract.md`.

## Objetivo

Enumerate PAT's REST surface and the cross-cutting rules every endpoint obeys, so controllers
and their `@PreAuthorize` strings are derivable without re-reading the vision.

## Escopo

- **In:** all `/pat` endpoints (patients, commands, gesture-types), mandatory headers, the
  error model, the authority→endpoint matrix.
- **Out:** per-endpoint behavioral detail (SPEC-02/03), security internals (SPEC-06).

## Decisões técnicas

- Base path `/pat`; media `application/json`, errors `application/problem+json` (RFC 7807).
- Authorities `pat.<resource>.<action>` from the single `RoleAuthorityPolicy` (SPEC-06),
  shared hexagonal ADR key `hexagonal_java` (`../../../adr/ADR-001-hexagonal-architecture.md`).
- State-changing verbs on `POST`/`PATCH`/`DELETE` only (INV-PAT-8); `GET` side-effect free.
- No public endpoint — PAT issues no token (A1).

## Implementação

Endpoints (full detail in `../../contracts/api-contract.md`):

| # | Verb | Path | Authority | Use case |
|---|---|---|---|---|
| 1 | POST | `/pat/patients` | `pat.patient.create` | RegisterPatient |
| 2 | GET | `/pat/patients` | `pat.patient.read` | ListPatients |
| 3 | GET | `/pat/patients/{id}` | `pat.patient.read` | ReadPatient |
| 4 | DELETE | `/pat/patients/{id}` | `pat.patient.deactivate` | DeactivatePatient |
| 5 | POST | `/pat/patients/{id}/activation` | `pat.patient.activate` | ReactivatePatient |
| 6 | POST | `/pat/patients/{id}/commands` | `pat.command.create` | CreateCommand |
| 7 | GET | `/pat/patients/{id}/commands` | `pat.command.read` | ReadCatalog |
| 8 | GET | `/pat/commands/{id}` | `pat.command.read` | ReadCommand |
| 9 | PATCH | `/pat/commands/{id}` | `pat.command.calibrate` | CalibrateCommand |
| 10 | DELETE | `/pat/commands/{id}` | `pat.command.retire` | RetireCommand |
| 11 | GET | `/pat/gesture-types` | `pat.gesture-type.read` | ListGestureTypes |
| 12 | GET | `/pat/gesture-types/{id}` | `pat.gesture-type.read` | ReadGestureType |
| 13 | POST | `/pat/gesture-types` | `pat.gesture-type.create` | RegisterGestureType |

## Casos de borda

- `X-Tenant-Id` supplied → ignored; tenant from JWT claim (INV-PAT-1).
- Patient-session token on any `/pat` path → `403` (INV-PAT-7).
- Cross-tenant resource id → `404`, no existence disclosure (INV-PAT-2).

## Critérios de aceite (EARS)

- THE SYSTEM SHALL require a valid `Authorization` bearer token on every `/pat` endpoint and SHALL respond `401` without one.
- THE SYSTEM SHALL source every controller `@PreAuthorize` string from a `RoleAuthorityPolicy` constant (INV-PAT-8).
- IF an `X-Tenant-Id` header is present, THEN THE SYSTEM SHALL ignore it and derive tenant from the JWT `tenantId` claim (INV-PAT-1).
- THE SYSTEM SHALL return `application/problem+json` with a stable `type`, HTTP `status` and request `correlationId` on every error.
