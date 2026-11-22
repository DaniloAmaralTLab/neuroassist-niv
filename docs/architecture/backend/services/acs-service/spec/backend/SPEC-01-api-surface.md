# SPEC-01 — API surface

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`
> Canonical contract: `../../contracts/api-contract.md`.

## Objetivo

Define the complete HTTP surface of ACS — the authorization server — so controllers,
`@PreAuthorize` strings and ProblemDetail responses are derivable without rereading the
vision.

## Escopo

- **In:** auth (`/acs/auth/login`, JWKS, introspect), caregivers CRUD-lite, links, patient
  sessions, tenant onboarding, RFC 7807 error model, mandatory headers.
- **Out:** patient aggregate (PAT), device identity (EDGE), broker events (messaging
  disabled), external IdP.

## Decisões técnicas

- Hexagonal — `../../../adr/ADR-001-hexagonal-architecture.md` (key `hexagonal_java`):
  controllers in `api`, no business logic.
- Identity/authority model — local `adr/ADR-002-identity-and-authority-model.md`.
- State-changing verbs are `POST`/`DELETE` only (doc 03 convention).

## Implementação

Controllers map 1:1 to the api-contract sections: `AuthController`,
`CaregiverController`, `LinkController`, `PatientSessionController`, `TenantOpsController`.
Each endpoint's `@PreAuthorize` string equals a `RoleAuthorityPolicy` constant (SPEC-06).
See api-contract §7 for the authority→endpoint matrix.

## Casos de borda

- Missing/blacklisted token on a protected route → `401`.
- `X-Tenant-Id` header supplied by a client → ignored (tenant from JWT only).
- Unknown enum value in body → `400 validation-error`.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL expose exactly the endpoints listed in api-contract §7, each guarded by its mapped authority.
- WHEN any protected endpoint is called without a valid bearer token, THE SYSTEM SHALL respond `401`.
- WHEN any error occurs, THE SYSTEM SHALL return `application/problem+json` carrying `type`, `status` and `correlationId` (api-contract §6).
- IF a client supplies `X-Tenant-Id`, THEN THE SYSTEM SHALL ignore it and use the JWT `tenantId` claim.
