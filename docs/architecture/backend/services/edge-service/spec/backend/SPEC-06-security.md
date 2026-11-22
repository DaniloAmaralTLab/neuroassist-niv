# SPEC-06 — Security (authority, token issuance & validation, tenant isolation)

> Service `edge-service` · Module **EDGE** · EARS guide: `../../../../standards/ears-notation.md`
> Shared hexagonal ADR key `hexagonal_java` (`../../../../adr/ADR-001-hexagonal-architecture.md`).
> Decisions: `../../adr/ADR-002-device-token-issuance-validation.md`, `../../adr/ADR-003-code-based-pairing-claim.md`.

## Objetivo

Specify EDGE's dual security role — **ACS resource server** on human endpoints and **device
authorization endpoint** on device endpoints — the single `RoleAuthorityPolicy` source of authority
strings (designing out D-535 drift), the role→authority mapping, the `edge.device` token contract,
the immediate-revocation mechanism (G1), the service-client-to-PAT identity (G2), and tenant
isolation. **This is the canonical authority source** — the doc-03 preview is finalized here.

## Escopo

- **In:** human-token validation (ACS JWKS + introspection), `edge.device` token minting + EDGE
  JWKS + introspection/short-TTL revoke (G1), the PAT service-client identity (G2), the dual-credential
  boundary with ACS (G4), `RoleAuthorityPolicy`, role→authority mapping, tenant isolation
  (INV-EDGE-1).
- **Out:** token issuance by ACS (ACS owns human tokens — EDGE issues none), the EVNT report
  authority (G5, EVNT-owned).

## Decisões técnicas

- EDGE holds `TokenValidationPort` (ACS JWKS), `AcsIntrospectionPort`, `DeviceTokenIssuer` and
  `RevocationStore` as domain ports; Spring Security resource server (ACS JWKS) + an EDGE
  device-token verifier are the infrastructure adapters.
- **G1** — EDGE mints the `edge.device` JWT (short TTL, default 900 s) and publishes
  `/edge/.well-known/jwks.json`; GWY/PAT/EVNT trust it alongside ACS. Immediate revoke = short TTL
  **refreshed on heartbeat** (a revoked credential is never refreshed → dies within one TTL) **plus**
  `POST /edge/device-tokens/introspect` consulted on revoke-sensitive device calls (returns
  `active:false` for a listed `credentialId`). Default = heartbeat-coupled short-TTL refresh +
  introspection fallback (ADR-002).
- **G2** — the catalog pull uses an **ACS-issued service-client token** for the `edge-service`
  principal (`actorType = service-client`, authorities `pat.command.read` + `pat.gesture-type.read`),
  never the device/patient-session token (PAT INV-PAT-7).
- **G4** — EDGE owns only the `edge.device` token; ACS owns the patient-session; the two coexist on
  one device (`integration-contracts.md` §5.1). EDGE never mints/validates/revokes the session.
- **G6 (ADR-005)** — the detection-lapse raise/resolve to EVNT uses an **ACS-issued service-client**
  token for the `edge-service` principal carrying an **EVNT-namespace** authority (string EVNT-owned,
  e.g. `evnt.detection-lapse.raise`/`.resolve`), **never** the `edge.device` token. Posting
  `detectionState` on the heartbeat needs **no new device authority** — it rides the existing
  `edge.heartbeat.record` right (INV-EDGE-2 unchanged). `integration-contracts.md` §6.2.
- `TenantContextFilter` is registered **inside** the `SecurityFilterChain`
  (`addFilterAfter(BearerTokenAuthenticationFilter.class)`, `FilterRegistrationBean(enabled=false)`,
  no `@Component`/`@Order`) so `SecurityContextHolder` is populated when tenant is extracted
  (Risk R5, Learning Layer). Controllers must not import `infrastructure.security` (ArchUnit RULE-04).

## Implementação — RoleAuthorityPolicy (single source)

| Authority |
|---|
| `edge.device.enroll` |
| `edge.device.read` |
| `edge.device.pair` |
| `edge.device.activate` |
| `edge.device.deactivate` |
| `edge.device.revoke` |
| `edge.device.unpair` |
| `edge.heartbeat.record` |
| `edge.catalog.read` |

**Role → authority mapping (canonical):**

| Role / actor | Authorities |
|---|---|
| `CLINIC_COORDINATOR` | `edge.device.enroll`, `edge.device.read`, `edge.device.pair`, `edge.device.activate`, `edge.device.deactivate`, `edge.device.unpair`, `edge.device.revoke` |
| `CAREGIVER` | `edge.device.read`, `edge.device.revoke` |
| `edge-device` (token minted by EDGE) | `edge.heartbeat.record`, `edge.catalog.read` (+ the EVNT gesture-report right, G5 — authority string owned by EVNT) |
| service client (EDGE→PAT) | `pat.command.read`, `pat.gesture-type.read` (ACS-issued, G2 — a PAT authority, held by the EDGE backend) |
| service client (EDGE→EVNT, G6/ADR-005) | EVNT detection-lapse raise/resolve authority (ACS-issued, **EVNT-namespace string, EVNT-owned** — held by the EDGE backend; never the `edge.device` token) |
| service client (introspection consumers) | may call `POST /edge/device-tokens/introspect` |
| patient-session (ACS) | `conv.*` / `gest.*` only — **no `edge.*`**; never accepted on any EDGE device/human endpoint (INV-EDGE-2) |

> `enroll`/`pair`/`activate`/`deactivate`/`unpair`/`revoke`/`record`/`read` are the canonical verbs
> (D-639) so the scaffold derives each permission code from the application-service operation name
> cleanly (e.g. op `pair` → `edge.device.pair`, op `get`/`list` → `edge.device.read`); the authority
> strings above are the canonical constants the scaffold MUST reuse — no re-derivation that could
> drift (INV-EDGE-7, D-535). `edge.device.activate` is the specs-introduced reactivation authority
> (G3), symmetric with `deactivate` and mirroring PAT's `activate`/`deactivate`. The pairing claim
> endpoint is code-authenticated (ADR-003); its `edge.device.pair` constant exists for op-name parity
> and is held by the enrolling coordinator.

## `edge.device` token (minted by EDGE)

| Claim | Value |
|---|---|
| `sub` | `deviceId` |
| `actorType` | `edge-device` |
| `deviceId` / `patientId` / `tenantId` | device binding |
| `authorities` | `["edge.heartbeat.record","edge.catalog.read"]` (+ EVNT report right, G5) |
| `jti` / `kid` | `credentialId` — the revocation/introspection key |
| `exp` | short TTL (default 900 s), refreshed on heartbeat |

## Casos de borda

- A human token on a device endpoint (or an `edge.device` token on a human endpoint) → `403`
  (INV-EDGE-2; no cross-fabric accept).
- A revoked `credentialId`: next heartbeat `401` (no refresh), next introspected call `active:false`
  (INV-EDGE-6).
- Cross-tenant device access → `404` (tenant from JWT claim; `X-Tenant-Id` ignored — INV-EDGE-1).
- A `CAREGIVER` attempting `edge.device.enroll` / `edge.device.deactivate` / `edge.device.unpair`
  → `403` (coordinator-only).
- A patient-session token anywhere on EDGE → `403` (INV-EDGE-2, preserves ACS INV-3).

## Critérios de aceite (EARS)

- THE SYSTEM SHALL source every controller `@PreAuthorize` string from a `RoleAuthorityPolicy` constant, with no divergent strings (INV-EDGE-7, D-535).
- THE SYSTEM SHALL verify every inbound human JWT against the ACS JWKS before any authority check, using cached keys if JWKS is briefly unreachable and never accepting unsigned tokens.
- WHEN EDGE mints an `edge.device` token, THE SYSTEM SHALL restrict `authorities` to `edge.heartbeat.record` / `edge.catalog.read` (+ EVNT report right) and set a short `exp` (INV-EDGE-2, G1).
- WHEN a device credential is revoked, THE SYSTEM SHALL cause the next request bearing it to be rejected `401` — via no further refresh and `active:false` on introspection (INV-EDGE-6, G1).
- THE SYSTEM SHALL call PAT only with an ACS-issued service-client token holding `pat.command.read` (G2) and SHALL NOT use the device or patient-session token (INV-EDGE-2, PAT INV-PAT-7).
- IF a request bears a `patient-session` token, THEN THE SYSTEM SHALL respond `403` on every EDGE endpoint (INV-EDGE-2).
- THE SYSTEM SHALL derive tenant context from the JWT `tenantId` claim only and SHALL return `404` on cross-tenant access (INV-EDGE-1).
