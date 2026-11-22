# SPEC-06 — Security

> EARS guide: `../../../../standards/ears-notation.md`. Authority strings canonical here.

## Objective
Enforce the ACS resource-server model, the patient-session vs TRN service-client token split, tenant
isolation, and the authority set — the single source of truth for `@PreAuthorize` constants.

## Scope
- **In:** token validation (ACS JWKS); authority → endpoint mapping; tenant-filter ordering;
  RoleAuthorityPolicy constants; privacy of audio/voice references.
- **Out:** token minting (ACS); device tokens (EDGE); consent capture (TRN).

## Authority set (canonical — computed with the English verb table, D-639)
| Authority | Resource | Action (verb) | Token |
|---|---|---|---|
| `conv.tree.read` | tree | read (`get`) | patient-session |
| `conv.audio.read` | audio | read (`get`) | patient-session |
| `conv.usage.record` | usage | record | patient-session |
| `conv.tree.publish` | tree | publish | TRN service-client |
| `conv.tree-version.retire` | tree-version | retire | TRN service-client |
| `conv.audio.delete` | audio | delete | TRN service-client |

> `withdraw`/`erase`/`supersede` are not generator verbs → expressed as `retire`/`delete` (and
> supersede as a side-effect of `publish`). No invented verbs.

## Implementation
- CONV is an **OAuth2 resource server**; patient-session and TRN service-client tokens validated via
  **ACS JWKS**; CONV mints nothing. Patient-session authorities are restricted to `conv.*`/`gest.*`
  (ACS INV-3); honor the ACS blacklist (`401` on revoke).
- `TenantContextFilter` registered **inside** the `SecurityFilterChain`, **after**
  `BearerTokenAuthenticationFilter`, so tenant is extracted only after the JWT is authenticated
  (Learning `security:tenant-filter:order-before-spring-security`).
- Inbound ports carry **no** `tenantId` (RULE-04); services call `TenantContextHolder.require()` first;
  `api` must not import `infrastructure.security` (ArchUnit RULE-04).
- `@PreAuthorize` strings MUST equal the `RoleAuthorityPolicy` constants above (D-535/D-639).

## Edge cases
- Patient-session token on a TRN endpoint (or vice-versa) → `403` (ACS INV-3).
- `X-Tenant-Id` supplied → ignored (INV-CONV-7).
- Audio/voice references never exposed in list/read bodies beyond the opaque `assetId`/`storageRef`.

## Acceptance criteria (EARS)
- WHEN a request bears no valid bearer token on a protected endpoint, THE SYSTEM SHALL respond `401`.
- IF the token class does not match the endpoint (patient-session on TRN path or vice-versa), THEN THE SYSTEM SHALL respond `403` (ACS INV-3).
- THE SYSTEM SHALL derive tenant from the JWT `tenantId` claim and SHALL ignore `X-Tenant-Id` (INV-CONV-7).
- THE SYSTEM SHALL set each controller `@PreAuthorize` to the matching `RoleAuthorityPolicy` constant and SHALL define no authority outside the six above (D-639).
- THE SYSTEM SHALL never expose a patient's `voice_model_ref` or raw `storage_ref` to a station beyond the playable `assetId`/URL (ADR-005 privacy).
