<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

## System Boundary

`acs-service` is the identity/access bounded context. **Inside** the boundary:
caregiver identity and credentials, roles/authorities, caregiver↔patient links, the
patient-session actor and its lifecycle, the JWT issuer and the revocation blacklist,
and the tenant registry (care units) in the global schema. **Outside** the boundary
(owned elsewhere, referenced by id): the `Patient` aggregate (PAT / `pat-service`),
the edge device identity (EDGE / `edge-service`), the audit trail store (HIST /
`hist-service`), and the API gateway that terminates requests (GWY).

ACS is a resource server **and** the authorization server of the platform: it mints
the JWT that all other resource servers validate.

## External Actors and Systems

- **Caregiver (human)** — authenticates, manages links, provisions/revokes patient
  sessions, via DASH → GWY → ACS.
- **Patient-with-session (human, no login)** — does not call ACS directly at
  runtime; ACS issues and revokes the session; the patient uses it against CONV/GEST.
- **platform-ops (service client, tenantless)** — onboards tenants (ADR-011).
- **GWY (API Gateway)** — fronts ACS; validates JWT on behalf of all services.
- **HIST (`hist-service`)** — receives audit records for every access-granting or
  access-ending action (sync REST; messaging disabled).
- **All resource servers (PAT, EVNT, DASH, EDGE, CONV, TRN)** — consume ACS-issued
  JWTs and trust the tenant scope and authorities they carry.
- **MIG (`neuroassist-niv-migrations`)** — centralized Flyway applies ACS schema
  migrations across the global and per-tenant schemas.

## End-to-End Flows

**Golden path — caregiver authentication.**
1. Caregiver submits credentials (DASH → GWY → ACS `POST /auth/token`).
2. ACS resolves the login to a tenant and caregiver, verifies the credential.
3. ACS mints a tenant-scoped JWT carrying role authorities; returns it.
4. Caregiver calls any resource server; GWY/service validates the JWT; tenant schema
   is resolved from the token claim.

**Patient session — provisioning.**
1. Authenticated caregiver calls ACS `POST /patients/{id}/session` (authority
   `acs.patient-session.provision`).
2. ACS creates a `PatientSession` (status `active`, no expiry, `provisionedBy` =
   caregiver, bound to the patient and device), mints the restricted patient token.
3. HIST records `PatientSessionProvisioned`. The token travels to the patient device.

**Patient session — revocation (SEC-001).**
1. Caregiver calls ACS `POST /patient-sessions/{id}/revoke` (authority
   `acs.patient-session.revoke`).
2. ACS marks the session `revoked` (terminal) and adds the token to the JWT
   blacklist; invalidation is immediate.
3. HIST records `PatientSessionRevoked`. The next request from the device is rejected.

**Alternative / edge cases.**
- Invalid or blacklisted token → `401`; no tenant context is ever assumed.
- Cross-tenant access attempt (token tenant ≠ target tenant) → `403`.
- Re-provisioning after revocation creates a **new** session (revoked is terminal).
- Tenant onboarding is reachable only via `platform-ops` from the internal admin
  host (ADR-011); no human role performs it.

## Internal Boundaries

Hexagonal layers (see `../../adr/ADR-001-hexagonal-architecture.md`):

- **api/** — REST controllers and DTOs for auth, caregivers, links, patient sessions,
  tenants (ops); `@PreAuthorize` strings sourced from `RoleAuthorityPolicy`.
- **application/** — use-case services (`@Transactional`): Authenticate,
  RegisterCaregiver, Deactivate, Link/Unlink, ProvisionSession, RevokeSession,
  OnboardTenant; orchestrate ports.
- **domain/** — identity/authority aggregates, value objects (TenantId, Authority),
  invariants, and ports (interfaces) for persistence, token issuance, blacklist and
  audit.
- **infrastructure/** — JPA adapters (global + per-tenant), Spring Security / JWT
  issuer, blacklist adapter, HIST audit client (Feign/REST), config.

Dependency rule: `domain` imports nothing framework-specific; `application` depends
on `domain`; `api` and `infrastructure` depend inward.

## Cross-cutting Concerns

- **Security** — ACS is the authorization server; patient sessions are least-
  authority; `platform-ops` is a tenantless service client (ADR-011). Framework-native
  authentication for the pilot (no external IdP).
- **Multi-tenancy** — schema-per-tenant (`../../adr/ADR-003-multi-tenancy.md`); tenant
  resolved from the JWT claim; `caregiver.tenant_id` `NOT NULL`; global schema
  `neuroassist_global` holds the tenant registry and the identity-lookup/blacklist.
- **Observability / audit** — every grant/revoke/link/deactivate is audited in HIST;
  activity is traceable per tenant and patient.
- **Transport** — all synchronous REST/HTTPS (messaging disabled). TLS mandatory in
  any non-localhost environment (TECH-006).
- **Compliance (LGPD)** — caregiver PII and access links are sensitive; internal
  network only for now (OPS-002); dedicated LGPD mechanisms deferred (not waived).
