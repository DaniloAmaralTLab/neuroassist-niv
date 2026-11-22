<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-004 — Tenant isolation of the audit store (DECISION d — SAFETY)

## Status
aceita

> User decision 2026-11-20: **Option A** — per-tenant append-only audit tables in t_<tenantId>, plus one global table for global-schema (GEST) facts.

## Contexto
The platform is multi-tenant, schema-per-tenant
(`../../../adr/ADR-003-multi-tenancy.md`). Most audit facts carry a `tenantId` (ACS, PAT,
EDGE, EVNT) and describe tenant-scoped subjects (patients, caregivers, devices, events).
But **GEST facts are global-schema**: the gesture-engine registry has no tenant and GEST's
envelope omits `tenantId` entirely. HIST must store both without leaking audit across
tenants. The question — **surfaced for the user** — is where audit lives:

- **Option A — per-tenant audit tables in `t_<tenantId>`, plus one global table for the
  tenant-less GEST facts.** Audit inherits the same isolation boundary as the business data
  it describes; a tenant's audit cannot be read without its tenant context. GEST's handful
  of global registry facts go to `neuroassist_global`.
- **Option B — a single global audit store filtered by `tenantId`.** Simpler to query
  cross-tenant (operator/compliance), but isolation becomes an application-level `WHERE`
  rather than a schema boundary — a weaker guarantee for sensitive health audit.

## Decisão
**Recommendation: Option A.** Keep tenant-scoped audit in `t_<tenantId>` (isolation is a
schema boundary, matching every other module and the project's isolation strategy) and put
the tenant-less GEST facts in a dedicated global table in `neuroassist_global`. This
preserves the strongest isolation for health-adjacent audit (SAFETY) and gives GEST's
global facts a correct, non-forced home. Operator/compliance cross-tenant queries run
against the global schema's view or a controlled, audited admin path — not by relaxing
tenant isolation. **User decision required** given the operator's need for cross-tenant
incident review.

## Consequências
- Positive: no cross-tenant audit leakage by construction; consistent with schema-per-tenant.
- Positive: GEST global facts stored correctly without a synthetic tenant.
- Negative: cross-tenant operator queries require fan-out or a dedicated admin surface
  (more work than a single-table `WHERE`).
- Negative: centralized Flyway (MIG) must provision the audit table in every new
  `t_<tenantId>` — already the project pattern, so marginal.
- Open: shape of the operator cross-tenant review path (specs).
