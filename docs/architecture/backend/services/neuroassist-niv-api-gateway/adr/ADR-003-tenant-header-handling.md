<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Tenant header handling: strip client-supplied, derive from JWT claim

## Status
aceita

> Orchestrator default (recommendation) — revisable by the owner (recorded without a
> clarifying question in automated mode).

## Contexto
NeuroAssist NIV is multi-tenant with schema-per-tenant isolation (shared
`../../adr/ADR-003-multi-tenancy.md`; `multi-tenancy.arch.json`). Tenant context must never be
spoofable. The issued tokens carry the tenant as the `tenantId` claim (ACS api-contract §0.2),
and the ACS contract already states `X-Tenant-Id` is "**never trusted from the request**"
(§0.1). A client could, however, still send an `X-Tenant-Id` header hoping some downstream
trusts it. The gateway is the single ingress and the right place to neutralize that at the edge.

## Decisão
GWY **strips any inbound `X-Tenant-Id` header** (and any other client-supplied tenant-context
header) on every route before forwarding. It does **not** inject a tenant header of its own —
tenant context is derived **downstream** by each resource server exclusively from the JWT
`tenantId` claim (RULE-07 holder.require, `rbac.arch.json`). The gateway stays tenant-agnostic:
it neither reads nor sets tenant context, it only removes the spoofable input.

## Consequências
- Positive: closes the tenant-spoofing vector at the edge (INV-G3); downstreams receive no
  attacker-controlled tenant header to accidentally trust.
- Positive: the gateway carries no tenant state and no `tenantId`-claim parsing responsibility
  — it stays thin; tenant derivation remains single-sourced from the signed claim.
- Note: the authoritative claim name on the token is **`tenantId`** (camelCase, ACS contract),
  which differs from the generic `tenant_id` template in `multi-tenancy.arch.json`; the ACS
  issuer contract governs. The gateway only strips the header and need not parse the claim.
- Negative / trade-off: none material — removing a header is cheap; the only cost is remembering
  to strip every tenant-ish header variant, which the specs enumerate.
