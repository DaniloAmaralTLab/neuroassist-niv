<!-- OUTPUT-SCHEMA
- Schema Strategy
- Initial Entities
- Migration Strategy
- Data Lifecycle
-->

# 05 — Persistence Model

> Module **DASH** · NeuroAssist NIV · **No backend, no persistence** (ADR-001). This document records
> that DASH owns no schema, no table and no migration, so MIG provisions nothing for it.

## Schema Strategy

**None.** DASH persists nothing. It has neither a `t_<tenantId>` schema nor a row in the
`neuroassist_global` schema. Tenant isolation is wholly delegated to the owning modules (PAT, EDGE,
EVNT, HIST), which run schema-per-tenant and derive the tenant from the caregiver JWT (shared
`adr/ADR-003-multi-tenancy.md`). The only "state" DASH holds is transient, per-session client view
state in the browser (loading/loaded/partial/error per source), which is not persistence.

## Initial Entities

**None.** No DASH-owned entity exists (doc 03). Every entity shown on the home screen —
`Patient` (PAT), `EdgeDevice` (EDGE), `Event` / detection-lapse (EVNT), history entry (HIST) — is
owned elsewhere and read by id. The BA draft data model (9 entities) contains no DASH entity, and the
prototype `home.plan.md` declares `writes: (none)`.

## Migration Strategy

**No migrations.** The centralized Flyway service (**MIG**,
`neuroassist-niv-migrations`) SHALL NOT be given any DASH migration set, because DASH owns no table.
No `db/migration` folder is created for DASH. This is a standing consequence of ADR-001 and must be
honored at scaffold time (no DASH schema is added to MIG's managed schema list).

## Data Lifecycle

Not applicable — DASH stores no data, so there is no retention, archival or erasure concern for DASH.
The lifecycle/retention of the facts DASH displays is owned by their modules: EVNT (events,
subscriptions), EDGE (device read model), and HIST (the immutable audit trail + crypto-shred erasure,
HIST ADR-006). A subject-erasure request is satisfied entirely by HIST/ACS; DASH holds nothing to
erase.
