<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

## Ubiquitous Language

- **Tenant / Care unit** — the isolation unit: a family (MVP) or a clinic
  (expansion). Technical field stays `tenant`; product term is "care unit".
- **Caregiver** — the only human actor with a login; belongs to exactly one tenant;
  holds a role (`CAREGIVER` or `CLINIC_COORDINATOR`).
- **Patient (reference)** — the monitored person; the aggregate is owned by PAT.
  ACS references it by id and provisions its session.
- **Patient session** — a non-expiring, revocable credential provisioned by a
  caregiver for a patient device; the actor that acts in CONV/GEST (ADR-012).
- **Caregiver–patient link** — the authorization edge binding a caregiver to the
  patient(s) they may act upon, within the tenant.
- **Authority** — a fine-grained permission string, convention `acs.<resource>.<action>`
  (e.g. `acs.caregiver.create`, `acs.patient-session.revoke`).
- **Role** — a named set of authorities (`RoleAuthorityPolicy`).
- **platform-ops** — tenantless service client; the sole tenant-onboarding authority.
- **Blacklist** — the stateless-JWT revocation store (reused, `rbac/session-policy.md`).

> **Authority-naming convention (enforced here to prevent 403 drift).** Controllers'
> `@PreAuthorize` strings MUST be the exact `RoleAuthorityPolicy` constants. Canonical
> verbs: `create`, `deactivate`, `authenticate`, `link`, `unlink`, `provision`,
> `revoke`, `onboard`. All state-changing verbs map to HTTP `POST`/`DELETE`. This is a
> deliberate carry-over of a known generator pitfall (authority strings diverging
> between controller and policy) resolved at the vision layer.

## Aggregates and Entities

- **Tenant** (aggregate root; global schema `neuroassist_global`) — `id`, `type`
  (`family` | `clinic`), name. Onboarded by `platform-ops`.
- **Caregiver** (aggregate root; tenant-scoped) — `id`, `tenantId` (NOT NULL),
  credentials, `role` (`caregiver` | `clinic_coordinator`), status
  (`active` | `deactivated`).
- **CaregiverPatientLink** (entity) — `caregiverId`, `patientId`, within the tenant;
  the authorization edge.
- **PatientSession** (aggregate root; tenant-scoped, isolated from Caregiver) —
  `id`, `patientId`, `provisionedBy` (caregiver), `deviceId`, `status`
  (`active` | `revoked`), `revokedBy`. No expiry.
- **RoleAuthorityPolicy** (domain policy) — maps roles → authority sets; single source
  of authority strings.

## Domain Events

Recorded in the audit trail (HIST). Messaging is disabled, so these are **domain
events realised as audited actions** (sync), not broker messages.

- `TenantOnboarded`
- `CaregiverRegistered`
- `CaregiverDeactivated`
- `CaregiverAuthenticated` (audited sign-in)
- `PatientLinked` / `PatientUnlinked`
- `PatientSessionProvisioned` — **anchor event** of the module
- `PatientSessionRevoked`

> **Anchor domain event:** *PatientSessionProvisioned* — the distinctive act of ACS
> (a caregiver granting a patient the ability to communicate), complemented by its
> terminal counterpart *PatientSessionRevoked*.

## State Transitions

- **Caregiver:** `active` → `deactivated` (terminal for login; record retained).
- **PatientSession:** `active` → `revoked` (terminal; no reactivation — a new session
  must be provisioned). No automatic expiry transition.
- **Tenant:** `onboarded (active)` (MVP keeps a single active state; suspension
  deferred).

## Invariants

1. Every `Caregiver` belongs to exactly one tenant — `tenant_id` is `NOT NULL`; no
   application path yields a null-tenant context.
2. A `PatientSession` is bound to exactly one patient and was `provisionedBy` a
   caregiver of the **same** tenant.
3. A patient session carries only `conv.*` / `gest.*` authorities and never inherits
   any caregiver/management authority.
4. A `revoked` session cannot be reactivated; revocation is immediate (blacklisted).
5. Tenants are created only via `platform-ops`; no human role onboards a tenant.
6. Caregiver login is unique within its tenant (identity-lookup resolves login →
   tenant deterministically).
7. Controller `@PreAuthorize` authorities are exactly the `RoleAuthorityPolicy`
   constants (no divergent strings).
