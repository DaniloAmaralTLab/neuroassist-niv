# ADR-003 — Multi-tenancy via schema-per-tenant from the MVP

> **Date:** 2026-07-27
> **Status:** draft (BA)
> **Decider:** Danilo Amaral (technical lead)

---

## Context

The framework standardizes schema-per-tenant for multi-tenant isolation. The MVP has a single active tenant (the Amaral family), with no institutional customer.

---

## Options considered

### Option 1 — Schema-per-tenant (framework default)

- **Advantages:**
  - Allows future expansion to clinics without structural rework
  - Strong isolation of sensitive health data per tenant
- **Disadvantages:**
  - Infrastructure overhead for a single active tenant
- **Cost:** low (default already supported by the framework)

TODO[architect]: investigate alternatives (single schema with tenant_id) before closing the ADR — not evaluated because it is already a platform decision.

---

## Decision

Chosen: **Schema-per-tenant, even with 1 active tenant.**.

---

## Rationale

Framing §10; LBC (lean business case) §5.3/§6.2 anticipate future institutional expansion — building multi-tenant from the start avoids rework if the pilot is validated.

---

## How to reverse if the decision proves wrong

Migrating from schema-per-tenant to single-schema would require data migration and a change to the access layer — medium cost, feasible with few tenants.

---

## Signals that it is wrong

- If the number of tenants never grows beyond 1 in ~1 year, the schema-per-tenant overhead may be unnecessary — reassess in that case
