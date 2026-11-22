# SPEC-06 — Security

> Module **GEST** · Service `gest-service` · EARS guide: `../../../../standards/ears-notation.md`.

## Objetivo
Specify authentication (ACS resource server), the authority model, and the station-auth decision.

## Escopo
- **In:** JWKS validation, the `gest.*` authority catalog, `RoleAuthorityPolicy`, station `edge.device`
  token, write-path introspection.
- **Out:** token minting (ACS), device pairing (EDGE), patient-session issuance (ACS).

## Decisões técnicas
- GEST is an **ACS resource server**; it validates JWKS-trusted JWTs and mints nothing.
- **Authority naming (D-639):** `gest.<resource>.<action>`, English, reads `.read`, mutations
  `.create`/`.retire`; never `.view`/`.edit`/`.register`.
- **Declared resources (D-641):** `engine`, `capability` (both differ from service name `gest`).
- **Station auth (decision, api-contract §1.2):** station reads use the `edge.device` token (machine
  identity available at boot), not a caregiver JWT; patient-session JWT accepted as fallback.

## Authority catalog
`gest.engine.read`, `gest.engine.create`, `gest.engine.retire`, `gest.capability.read`,
`gest.capability.create`, `gest.capability.retire` — the complete set (api-contract §1.1). Controller
`@PreAuthorize` strings MUST equal the `RoleAuthorityPolicy` constants (D-535).

## Implementação
- `SecurityConfig` (OAuth2 resource server) → JWKS at `${ACS_JWKS_URI}`.
- Writes additionally call `AcsIntrospectionPort` to reject revoked `jti`; reads do not (advisory
  global data).
- Reads require only the relevant `.read` authority; no tenant scoping (INV-GEST-3).

## Casos de borda
- Patient-session / `edge.device` token on a write path → `403` (INV-GEST-5).
- `edge.device` token missing `gest.capability.read` → `403` (provisioning is INT-GEST-ACS-1).

## Critérios de aceite (EARS)
- WHEN a request lacks a valid bearer token, THE SYSTEM SHALL respond `401`.
- IF a read-only token is used on any write path, THEN THE SYSTEM SHALL respond `403` and SHALL NOT
  mutate (INV-GEST-5).
- WHEN a write request bears a revoked `jti`, THE SYSTEM SHALL respond `401` (introspection).
- THE SYSTEM SHALL authorise every endpoint via a `RoleAuthorityPolicy` constant equal to the
  controller `@PreAuthorize` string (D-535).
