# GWY — Architecture Decision Records (service-local)

Service: `neuroassist-niv-api-gateway` · Module: GWY — API Gateway (Spring Cloud Gateway) · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | GWY service boundary: single gateway-only service | aceita | local |
| ADR-002 | Coarse edge JWT validation (two issuers) with defense in depth | aceita | local |
| ADR-003 | Tenant header handling: strip client-supplied, derive from JWT claim | aceita | local |
| ADR-004 | CORS policy for the caregiver web shell | aceita | local |
| ADR-005 | Rate limiting for login and pairing (in-memory, per-instance, MVP) | aceita | local |
| ADR-006 | Routing via Eureka `lb://` with timeouts, circuit breaker and idempotent-only retry | aceita | local |
| ADR-007 | Correlation-id propagation and PHI-free gateway logs | aceita | local |

> All seven ADRs are the **orchestrator default (recommendation) — revisable by the owner**
> (recorded without a clarifying question in automated mode).

Shared (project-level) ADRs live in `../../adr/` and are **not** re-emitted here. They govern
the business services; a pure edge gateway holds no domain, no PHI and no tenant schema, so
they apply to GWY only nominally:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters) for the Java business
  services; GWY is a declarative proxy with no domain to layer.
- `ADR-002-modular-monolith.md` — service-decomposition direction; GWY is the single ingress
  that fronts those services.
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation for data-owning services; GWY owns
  no schema and strips the client tenant header (local ADR-003), deriving nothing itself.

## Relationship map

- **ADR-001** (gateway-only boundary) is the frame: it fixes that GWY is a thin proxy, inside
  which every other decision applies. It sits against shared `../../adr/ADR-002-modular-monolith.md`.
- **ADR-002** (coarse edge JWT, two issuers, defense in depth) is the core security decision —
  it relies on ACS and EDGE each publishing a JWKS (`../acs-service/contracts/api-contract.md`
  §1.2; `../edge-service/adr/ADR-002`). It is explicitly **not terminal**: downstream
  `@PreAuthorize`/RBAC (`rbac.arch.json`) and the `jti`-blacklist remain authoritative.
- **ADR-003** (tenant-header strip) complements ADR-002: ADR-002 trusts the signed claim,
  ADR-003 removes the spoofable header; together they single-source tenant from `tenantId`.
- **ADR-004** (CORS) and **ADR-005** (rate limiting) govern the anonymous / browser surface
  that ADR-002's allow-list exposes (login, JWKS, pairing, health).
- **ADR-006** (routing + resilience) depends on REG/Eureka (`../neuroassist-niv-service-registry/`)
  and forwards the full path with no prefix strip.
- **ADR-007** (correlation id + PHI-free logs) is the LGPD/observability spine, realizing the
  `X-Correlation-Id` contract the ACS api-contract (§0.1) already expects GWY to honor.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than prose in
docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its number with a
strike-through note.

A non-ADR decision recorded as prose (no visible trade-off): **GWY owns no schema** — stated in
`05-persistence-model.md`; migration is owned centrally by MIG.
