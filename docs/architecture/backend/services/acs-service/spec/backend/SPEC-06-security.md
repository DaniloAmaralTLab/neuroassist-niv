# SPEC-06 — Security (identity, authority, JWT)

> Service `acs-service` · Module **ACS** · EARS guide: `../../../../standards/ears-notation.md`

## Objetivo

Specify the authentication, authority model and JWT issuance/validation that make ACS the
platform's authorization server, and design out the authority-string drift pitfall (D-535).

## Escopo

- **In:** framework-native authentication, `RoleAuthorityPolicy` (single source of
  authority strings), four identity types, JWT claims, JWKS, blacklist-aware validation,
  least-authority patient session.
- **Out:** external OAuth/SSO IdP (deferred), edge device token minting (EDGE).

## Decisões técnicas

- Four identity types — local `adr/ADR-002-identity-and-authority-model.md`
  (caregiver, patient-session, platform-ops, edge-device[validated only]).
- Revocation blacklist — local `adr/ADR-003-session-revocation-jwt-blacklist.md`.
- Hexagonal: `TokenIssuer` / `TokenBlacklist` are domain ports; Spring Security is the
  infrastructure adapter.

## Implementação — RoleAuthorityPolicy (single source)

Authorities follow `acs.<resource>.<action>`. Canonical verbs (doc 03): `create`,
`deactivate`, `authenticate`, `link`, `unlink`, `provision`, `revoke`, `onboard`.

| Authority |
|---|
| `acs.caregiver.create` |
| `acs.caregiver.deactivate` |
| `acs.patient-link.link` |
| `acs.patient-link.unlink` |
| `acs.patient-session.provision` |
| `acs.patient-session.revoke` |
| `acs.tenant.onboard` |

**Role → authority mapping (canonical):**

| Role / actor | Authorities |
|---|---|
| `CAREGIVER` | `acs.patient-link.link`, `acs.patient-link.unlink`, `acs.patient-session.provision`, `acs.patient-session.revoke` |
| `CLINIC_COORDINATOR` | all of `CAREGIVER` + `acs.caregiver.create`, `acs.caregiver.deactivate` |
| `platform-ops` | `acs.tenant.onboard` |
| patient-session | `conv.*`, `gest.*` only (no `acs.*`) |

> `PATIENT_SUPPORT` appears in BA `fluxo-e-perfis.md` (doc 06 gap). It is **not** adopted
> as a distinct role in this spec; the patient-with-session actor covers that need via the
> `conv.*`/`gest.*` authority set. TODO[architect]: reconcile naming with the live service
> at scaffold.

## Casos de borda

- Patient-session token presented to a management endpoint → `403` (INV-3).
- Blacklisted `jti` on any endpoint → `401`.
- `platform-ops` has no `tenantId` claim; tenant-scoped endpoints reject it with `403`.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL source every controller `@PreAuthorize` string from a `RoleAuthorityPolicy` constant, with no divergent strings (INV-7).
- WHEN ACS issues a caregiver token, THE SYSTEM SHALL populate `authorities` from the role mapping above.
- WHEN ACS issues a patient-session token, THE SYSTEM SHALL restrict authorities to `conv.*`/`gest.*` and SHALL exclude every `acs.*` authority (INV-3).
- IF a request bears a token whose `jti` is blacklisted, THEN THE SYSTEM SHALL respond `401`.
- IF any actor without `acs.tenant.onboard` calls `POST /acs/ops/tenants`, THEN THE SYSTEM SHALL respond `403` (INV-5).
- THE SYSTEM SHALL serve active signing keys at `/acs/.well-known/jwks.json` for resource-server verification.
