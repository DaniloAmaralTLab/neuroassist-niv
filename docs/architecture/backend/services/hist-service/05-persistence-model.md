<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Service: `hist-service` · Module **HIST — History and Audit Trail** · Project: NeuroAssist NIV

## Schema Strategy

Schema-per-tenant (`../../adr/ADR-003-multi-tenancy.md`), with a deliberate split because
the audit stream mixes tenant-scoped and global-schema facts (`adr/ADR-004-tenant-isolation-of-audit.md`):

- **Per-tenant schema `t_<tenantId>`** — tenant-scoped audit records (ACS, PAT, EDGE, EVNT
  facts carry `tenantId`). This keeps audit data under the same isolation boundary as the
  business data it describes (SAFETY: no cross-tenant audit leakage).
- **Global schema `neuroassist_global`** — global-schema facts that carry **no** `tenantId`
  (GEST: `EngineVersionRegistered/Deprecated`, `EngineCapabilityDeclared/Retired`), plus
  the producer/source registry and the idempotency index needed before a tenant context
  exists.

> **DECISION (d) — tenant isolation of audit** is surfaced, not silently decided, in
> `adr/ADR-004-tenant-isolation-of-audit.md` (options: per-tenant append-only tables with a
> global table only for GEST facts — recommended — vs a single global audit store filtered
> by `tenantId`). Marked **SAFETY**.

## Initial Entities

Draft (names/fields refined in `/be-architect-specs`):

- **audit_record** (per-tenant `t_<tenantId>`) — `id` (PK), `source` (producer service),
  `action` (canonical discriminator), `actor_type` (`caregiver`|`edge-device`|`system`|
  `service-client`), `actor_id`, `tenant_id` (NOT NULL here), `subject_type`, `subject_id`,
  `occurred_at`, `received_at`, `correlation_id`, `payload_version` (default 1), `payload`
  (JSONB), `idempotency_key` (unique), `flagged` (bool, unknown action / higher version).
  **Append-only**: no `updated_at`, no soft-delete column on the ingest path.
- **audit_record_global** (global `neuroassist_global`) — same shape with `tenant_id`
  nullable/null; home for GEST global-schema facts.
- **audit_source** (global) — producer registry (service name, allowed actions) for
  attribution and validation; optional at MVP.

Indexes: unique on `idempotency_key`; read indexes on `(tenant_id, subject_id, occurred_at)`
and `correlation_id` (incident reconstruction). The history read model is a query over
`audit_record` filtered to patient-relevant facts — no separate write-side projection at MVP.

## Migration Strategy

Flyway, **centralized**: HIST authors its migration scripts, but
`neuroassist-niv-migrations` (MIG) applies them across `neuroassist_global` and every
`t_<tenantId>` schema (project standard: "Centralized Flyway (all schemas)"). HIST does not
run Flyway at service start. New tenant onboarding provisions the `t_<tenantId>` audit
table through the same centralized path.

## Data Lifecycle

- **Append-only, immutable.** Records are never updated or deleted on the ingest path
  (`adr/ADR-002-audit-immutability-guarantee.md`). A correction is a new record.
- **Immutability enforcement** — at minimum DB grants deny `UPDATE`/`DELETE` to the HIST
  app role on audit tables; optional tamper-evidence via a hash chain is the subject of
  ADR-002 (DECISION a, **SAFETY/COMPLIANCE**).
- **Retention vs erasure** — health-adjacent audit data under LGPD/GDPR-style duties must
  balance a defined retention period against data-subject erasure, **while the audit trail
  stays immutable**. Surfaced in `adr/ADR-006-retention-vs-erasure.md` (DECISION b,
  **COMPLIANCE**): recommended approach is crypto-shredding / pseudonymization of
  personal fields in `payload` (not row deletion), preserving the immutable action record.
- **Archival** — long-term cold archival is out of MVP scope; the schema does not preclude
  it.
