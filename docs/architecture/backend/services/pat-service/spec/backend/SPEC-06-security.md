# SPEC-06 — Security (authority, JWT validation, tenant isolation)

> Service `pat-service` · Module **PAT** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../adr/ADR-001-hexagonal-architecture.md`).

## Objetivo

Specify PAT as an ACS resource server: how it validates ACS-issued JWTs, the single
`RoleAuthorityPolicy` source of authority strings (designing out the D-535 drift pitfall),
the role→authority mapping, and tenant isolation. **This is the canonical authority source** —
the domain-framing preview (doc 03) is finalized here.

## Escopo

- **In:** JWT validation (JWKS + revocation-aware introspection), `RoleAuthorityPolicy`,
  role→authority mapping, the service-client read path (ADR-004), tenant isolation (INV-PAT-1/2).
- **Out:** token issuance (ACS owns it — PAT issues none, A1); external IdP (none in MVP).

## Decisões técnicas

- PAT holds `TokenValidationPort` / `AcsIntrospectionPort` as domain ports; Spring Security
  resource server (JWKS) is the infrastructure adapter.
- Standard validation (signature via cached JWKS + `exp` + authorities) runs on every request;
  **introspection** (blacklist-aware) runs on state-changing operations (integration-contracts §1).
- Authorities `pat.<resource>.<action>`; every controller `@PreAuthorize` equals a
  `RoleAuthorityPolicy` constant (INV-PAT-8, D-535). Canonical verbs (doc 03): `register`,
  `read`, `deactivate`, `activate`, `create`, `calibrate`, `retire`.

## Implementação — RoleAuthorityPolicy (single source)

| Authority |
|---|
| `pat.patient.create` |
| `pat.patient.read` |
| `pat.patient.deactivate` |
| `pat.patient.activate` |
| `pat.command.create` |
| `pat.command.read` |
| `pat.command.calibrate` |
| `pat.command.retire` |
| `pat.gesture-type.read` |
| `pat.gesture-type.create` |

**Role → authority mapping (canonical):**

| Role / actor | Authorities |
|---|---|
| `CAREGIVER` | `pat.patient.create`, `pat.patient.read`, `pat.command.create`, `pat.command.read`, `pat.command.calibrate`, `pat.command.retire`, `pat.gesture-type.read` |
| `CLINIC_COORDINATOR` | all of `CAREGIVER` + `pat.patient.deactivate`, `pat.patient.activate`, `pat.gesture-type.create` |
| detection service client (GEST/EDGE/EVNT backends) | `pat.command.read`, `pat.gesture-type.read` (ADR-004) |
| DASH / CONV service client | `pat.patient.read`, `pat.command.read`, `pat.gesture-type.read` |
| patient-session | `conv.*` / `gest.*` only — **no `pat.*`** (ACS INV-3); rejected `403` on every `/pat` endpoint (INV-PAT-7) |

> `register`/`activate`/`deactivate`/`calibrate`/`retire` are conventional English verbs so the
> downstream scaffold derives the permission code from the application-service operation name
> cleanly; the authority strings above are the canonical constants the scaffold MUST reuse (no
> re-derivation that could drift — INV-PAT-8).

## Casos de borda

- Patient-session token on any PAT endpoint → `403` (INV-PAT-7, ADR-004 keeps INV-3 intact).
- Blacklisted `jti` on a state-changing op → `401` (introspection).
- Cross-tenant resource access → `404` (tenant from JWT claim; `X-Tenant-Id` ignored — INV-PAT-1/2).
- A caregiver (not coordinator) attempting `pat.patient.deactivate` or `pat.gesture-type.create` → `403`.

## Critérios de aceite (EARS)

- THE SYSTEM SHALL source every controller `@PreAuthorize` string from a `RoleAuthorityPolicy` constant, with no divergent strings (INV-PAT-8, D-535).
- THE SYSTEM SHALL verify every inbound JWT against the ACS JWKS before any authority check, using cached keys if JWKS is briefly unreachable and never accepting unsigned tokens.
- WHERE a state-changing operation is invoked, THE SYSTEM SHALL honor revocation via ACS introspection and respond `401` for a blacklisted `jti`.
- IF a request bears a `patient-session` token, THEN THE SYSTEM SHALL respond `403` on every `/pat` endpoint (INV-PAT-7).
- IF a caller lacks the endpoint's authority, THEN THE SYSTEM SHALL respond `403` and SHALL NOT disclose whether the target resource exists.
- THE SYSTEM SHALL derive tenant context from the JWT `tenantId` claim only and SHALL return `404` on cross-tenant access (INV-PAT-1, INV-PAT-2).
