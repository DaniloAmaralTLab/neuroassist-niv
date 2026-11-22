<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

## Schema Strategy

Schema-per-tenant (`../../adr/ADR-003-multi-tenancy.md`), split across two tiers:

- **Global schema `neuroassist_global`** — cross-tenant and identity-resolution data
  that must be readable *before* a tenant context exists:
  - `tenant` (the care-unit registry; onboarded by `platform-ops`);
  - the identity-lookup needed to resolve a login → tenant at authentication time;
  - the stateless-JWT **blacklist** (revocation store, reused per SEC-001).
- **Per-tenant schema `t_<tenantId>`** — tenant-scoped business identity data:
  `caregiver`, `caregiver_patient_link`, `patient_session`.

> **TODO[architect]:** reconcile the exact placement of the caregiver **credential**
> row against the already-implemented `acs-service` (the production schema keeps
> `caregiver.tenant_id` `NOT NULL` and resource servers filter on it). Confirm whether
> the credential/identity-lookup lives in the global schema (keyed by `tenant_id`) or
> fully in the per-tenant schema with a global routing index. The invariant
> (`tenant_id` NOT NULL, no null-tenant path) holds either way; only the physical
> placement is to be confirmed, not re-decided.

## Initial Entities

Draft (names/fields to be refined in `/be-architect-specs`):

- **tenant** (global) — `id` (PK), `type` (`family` | `clinic`), `name`.
- **caregiver** (tenant) — `id` (PK), `tenant_id` (NOT NULL), `username`/credential,
  `role` (`caregiver` | `clinic_coordinator`), `status` (`active` | `deactivated`),
  timestamps.
- **caregiver_patient_link** (tenant) — `id` (PK), `caregiver_id` (FK),
  `patient_id` (reference to PAT), unique (`caregiver_id`, `patient_id`).
- **patient_session** (tenant, isolated from caregiver) — `id` (PK), `patient_id`
  (reference to PAT), `provisioned_by` (FK caregiver), `device_id` (reference to
  EDGE), `status` (`active` | `revoked`), `revoked_by` (FK caregiver, nullable),
  `created_at`, `revoked_at`. **No** `expires_at` (non-expiring by design).
- **jwt_blacklist** (global) — token identifier (jti), reason, `blacklisted_at`,
  original-token expiry (for pruning).

## Migration Strategy

Flyway, **centralized**: ACS authors its migration scripts, but
`neuroassist-niv-migrations` (MIG) applies them across `neuroassist_global` and every
`t_<tenantId>` schema. ACS does not run Flyway locally at service start — it relies on
the central migrator (project standard: "Centralized Flyway (all schemas)"). New
tenant onboarding (via `platform-ops`) provisions the `t_<tenantId>` schema through the
same centralized path.

## Data Lifecycle

- **Caregiver deactivation** retains the record (never hard-deleted) for audit
  continuity; `status = deactivated` blocks login.
- **Patient session revocation** retains the `patient_session` row (`revoked`) and the
  `revoked_by`/`revoked_at` metadata for the HIST audit trail; rows are never deleted.
- **JWT blacklist** entries are retained until the original token's natural expiry,
  after which they may be pruned (the token can no longer be presented).
- **Retention / LGPD** — caregiver PII and links are sensitive health-adjacent data;
  dedicated retention/anonymization/portability mechanisms are deferred while the
  system runs on an internal network (OPS-002), not waived. **TODO[architect]:** define
  retention windows when the product leaves the internal network or gains a second
  institutional tenant.
