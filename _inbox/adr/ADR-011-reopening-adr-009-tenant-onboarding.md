# ADR-011 — Reopening ADR-009 (tenant-onboarding-authority): keep `platform-ops` or create `PLATFORM_ADMIN`

> **Date:** 2026-08-30 (updated 2026-08-30 after verification against the real repository)
> **Status:** draft (BA) — **already independently confirmed by the architect on 2026-08-24, before this briefing existed**
> **Decider:** Danilo Amaral (technical lead) — this record formalizes an already-made decision, it does not ask for a new one
> **Reopens:** `neuroassist-ai/docs/architecture/backend/adr/ADR-009-tenant-onboarding-authority.md` — **Status: Accepted, 2026-08-23, already implemented in real code** (`acs-service`, service client `platform-ops`). This is not a reopening of a role decision — it is a reassessment of a decision already in production.
>
> **✅ RESOLVED — verified in `neuroassist-ai/docs/operacao/fluxo-e-perfis.md` §7 (table "Decisions made on 2026-08-24"):** "Does creating a clinic need a screen? **Yes**, for the platform admin" — decided by keeping `platform-ops` as the sole authority (service client, `tenantless: true`), **without creating a human `PLATFORM_ADMIN` role**. The 4 canonical roles confirmed in the same document (`platform-ops` as a service client, `CLINIC_COORDINATOR`, `CAREGIVER`, `PATIENT_SUPPORT`) do not include `PLATFORM_ADMIN`. This is exactly Option 1 recommended below. The pending item is no longer "which option to choose" — it is only building the screen (marked `🔲 to be built` in the same document, §7/§8).

---

## Context

The original ADR-009 (architecture repository, accepted on 2026-08-23) decided that creating a tenant is a platform operation via the `platform-ops` service client (machine credential, no screen, no human `PLATFORM_ADMIN` role). The decision was made deliberately to avoid making `caregiver.tenant_id` nullable and to avoid introducing a "null tenant" exception spread across all tenant filters of the resource servers — today `NOT NULL` in production.

The post-handoff briefing of 2026-08-30 (`docs/architecture/shared/briefing-conv-modulo-perfil-paciente.md`, §3.5) brings two new requirements that strain this decision:

1. The server's Docker needs to run somewhere fixed — the briefing's proposal is that **"the server will also be the admin"**.
2. Need for a **tenant creation screen** and for **separating the ADMIN profile from the coordinator profile** — today only `CLINIC_COORDINATOR` exists as the top role within a tenant, with no role above the tenant.

This is exactly what the original ADR-009 deliberately discarded (see the "Discarded alternatives" table of the original ADR-009). Reopening this decision against a system that is **already implemented** has a different cost than deciding it greenfield: `caregiver.tenant_id` is already `NOT NULL` in the production schema, the resource servers already filter by tenant assuming this invariant, and the `platform-ops` client is already in use.

## Options considered

### Option 1 — Keep `platform-ops` as is; solve "I need a screen" with an ops-only page restricted by network

A tenant creation screen that is only reachable from the internal admin host/network (the same machine or network that runs the server's Docker), calling the same `platform-ops` underneath — without introducing a new application role.

- **Advantages:**
  - Zero schema migration — `caregiver.tenant_id` remains `NOT NULL`, no tenant filter of the resource servers changes
  - Solves the briefing's concrete need ("I need a screen") without touching RBAC/data-scope
  - Coherent with the briefing's own premise: "the admin will be the server" already argues that whoever has access to the Docker host is trusted by definition
- **Disadvantages:**
  - Does not solve the case of multiple human operators administering tenants from different machines, should that become necessary in the future
  - "Restricted by network" is a weaker access control than application RBAC — it depends on the network topology being correct (see briefing question 9)
- **Cost:** low — no data migration, no change to any existing resource server; just a new screen consuming the already-implemented `platform-ops`

### Option 2 — Create a real `PLATFORM_ADMIN` (human role above tenant)

Introduce an application role with a null tenant claim, make `caregiver.tenant_id` nullable, and review every tenant filter of the resource servers to handle this case.

- **Advantages:**
  - Supports multiple human operators administering tenants from different machines
  - Application RBAC is a stronger and more auditable control than "restricted by network"
- **Disadvantages:**
  - Production schema migration (`caregiver.tenant_id` from `NOT NULL` to nullable)
  - Review of **all** tenant filters of the already-implemented resource servers — regression risk in code that today assumes the invariant that `tenant_id` is always present
  - It is exactly what the original ADR-009 rejected, with a recorded rationale — reopening requires a stronger business reason than "we have a single server"
- **Cost:** high — real data migration, review of resource servers in production, regression risk

## Recommended decision (draft — architect decides)

**Keeping Option 1 is recommended** (do not reopen RBAC; ops-only page restricted by network on top of `platform-ops`). The briefing's own wording — "the admin will be the server" — is already the argument in favor: if whoever has access to the Docker host is trusted by definition, there is no need for an application role + screen + session to protect the platform from itself, at the cost of migrating a schema already in production. This postpones (does not eliminate) the need for a real `PLATFORM_ADMIN`, which would only be justified if there are multiple human operators administering tenants from different machines in the future (see briefing question 9 — deployment topology).

## Rationale

Briefing §3.5 (conflict explicitly recorded with ADR-009); the proposed deployment topology (single server = admin) reduces the urgency of platform RBAC.

## How to reverse if the decision proves wrong

Low cost starting from Option 1: if real platform RBAC becomes necessary in the future, the migration (nullable `tenant_id` + filter review) still has to happen, but nothing from Option 1 (ops-only page) needs to be discarded — it keeps serving as the UI, it just starts requiring role authentication too, not only network.

## Signals that it is wrong

- A second human platform operator appearing on a machine/network different from the Docker host — the network restriction stops being sufficient.
- The real deployment topology (briefing question 9) not allowing an "admin network" to be isolated reliably — in that case Option 1 loses the security guarantee that supports it.

## TODO[architect]

~~Final decision on whether or not to reopen the real ADR-009 is the architect's~~ — **already decided on 2026-08-24** (see the ✅ RESOLVED note above), before this briefing. Nothing to decide here. Only this remains:

- TODO[architect]: build the ops-only tenant creation screen on top of `platform-ops` (`🔲 to be built` item in `fluxo-e-perfis.md` §7/§8) — this is implementation, not a pending architecture decision.
