# SPEC-06 — Security (identity, authorities, tenancy, PII)

> ADR-002 (identity/INV-3), ADR-004 (PII), ADR-005 (voice data). D-639/D-640/D-641/D-642.
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Specify how TRN authenticates the caregiver, enforces fine-grained authorities, resolves the tenant, and
protects sensitive data — so scaffold produces a correct `SecurityConfig`, `RoleAuthorityPolicy`,
`generator-config.yml` and the `V0089` authority seed.

## Scope

**In:** resource-server config, authority catalogue + derivation, method security, tenant filter order,
service-client outbound identity, PII minimisation, public paths. **Out:** ACS token minting (ACS),
HIST ledger (HIST).

## Technical decisions

- TRN is an **ACS resource server**: validates the caregiver JWT via ACS JWKS; maps the `authorities`
  claim with a `JwtAuthenticationConverter`. It mints no token; it holds a **service-client** token for
  CONV/PAT/HIST.
- `@EnableMethodSecurity(prePostEnabled = true)` is **mandatory** (D-642) — without it `@PreAuthorize`
  is silently inert. Controller `@PreAuthorize` strings MUST equal the `RoleAuthorityPolicy` constants.
- Tenant from JWT `tenantId` claim only; `TenantContextFilter` is registered **inside** the
  `SecurityFilterChain` **after** `BearerTokenAuthenticationFilter` (Learning Layer
  `security:tenant-filter:order-before-spring-security`); `X-Tenant-Id` never trusted (INV-TRN-8).

## Authority derivation (D-639, English verb table — computed, not invented)

Per-service `path`/`resource`/`operations` (D-640/D-641) go into `generator-config.yml` at scaffold;
the 12 codes are `trn.<resource>.<action>`, each verb mapped by the generator (`arch_decisions.py
resolve_permission`, vocabulary `en`):

| Service (application) | path | resource | op verb → action | Authority |
|---|---|---|---|---|
| SessionService | `/sessions` | `session` | create → create | `trn.session.create` |
| SessionService | `/sessions` | `session` | get → read | `trn.session.read` |
| ProposalService | `/proposals` | `proposal` | get → read | `trn.proposal.read` |
| ProposalService | `/proposals` | `proposal` | update → update | `trn.proposal.update` |
| ProposalService | `/proposals` | `proposal` | approve → approve | `trn.proposal.approve` |
| ProposalService | `/proposals` | `proposal` | reject → reject | `trn.proposal.reject` |
| PublicationService | `/publications` | `publication` | create → create | `trn.publication.create` |
| PublicationService | `/publications` | `publication` | get → read | `trn.publication.read` |
| ConsentService | `/consents` | `consent` | create → create | `trn.consent.create` |
| ConsentService | `/consents` | `consent` | get → read | `trn.consent.read` |
| ConsentService | `/consents` | `consent` | revoke → revoke | `trn.consent.revoke` |
| ErasureService | `/content` | `content` | delete → delete | `trn.content.delete` |

> `withdraw` has no own verb → it is a **state transition**, gated by `trn.proposal.update` (the `update`
> verb table includes `transition`). The patient assent is **not** an authority (ADR-002). These 12 codes
> are added to `permission-catalogue.arch.json` (module `trn`) and seeded by `V0089`.

### public_paths / public_operations (D-642)

```yaml
public_paths:
  - GET /trn/health      # the only anonymous surface (SPEC-07)
# public_operations: (none — no anonymous business operation; patient-session is rejected 403, not public)
```

## Implementation

- `SecurityConfig`: `oauth2ResourceServer().jwt()` with ACS JWKS; `JwtAuthenticationConverter` mapping
  `authorities`; `permitAll` for `GET /trn/health`; `authenticated()` elsewhere;
  `@EnableMethodSecurity(prePostEnabled=true)`.
- `TenantContextFilter` after `BearerTokenAuthenticationFilter`; `TenantContextHolder.require()` is the
  first line of each application service (RULE-04). Controllers must not import `infrastructure.security`.
- Outbound: a `ServiceClientTokenProvider` obtains the TRN service-client token (authorities
  `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`, `hist.audit.record`,
  `pat.patient.read`) for Feign calls.

## PII / sensitive-data protection

- LLM path: `patientId` only; no name/PHI/free text (INV-TRN-7). Voice data under a per-subject crypto
  key; erasure = crypto-shred (ADR-005). No raw transcript retained (ADR-004).

## Acceptance criteria (EARS)

- THE SYSTEM SHALL validate the caregiver JWT via ACS JWKS and map the `authorities` claim to Spring authorities; `@EnableMethodSecurity(prePostEnabled=true)` SHALL be present (D-642).
- THE SYSTEM SHALL gate each endpoint with the exact `trn.<resource>.<action>` constant from the table above (D-639/D-535).
- IF a request presents a patient-session token on any `/trn` endpoint, THEN THE SYSTEM SHALL respond `403` (ACS INV-3).
- THE SYSTEM SHALL derive tenant context from the JWT `tenantId` claim only and SHALL ignore `X-Tenant-Id` (INV-TRN-8).
- THE SYSTEM SHALL register `TenantContextFilter` after `BearerTokenAuthenticationFilter` and SHALL call `TenantContextHolder.require()` first in every adapter method (RULE-04).
- THE SYSTEM SHALL call CONV/PAT/HIST only with the service-client token, never a caregiver/patient token.
- WHEN calling Anthropic, THE SYSTEM SHALL send no patient name, PHI or free-text identifier — `patientId` only (INV-TRN-7).
- THE SYSTEM SHALL expose only `GET /trn/health` anonymously (`public_paths`, D-642).
