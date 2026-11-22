# REG — Architecture Decision Records (service-local)

Service: `neuroassist-niv-service-registry` · Module: REG — Service Registry (Eureka) · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | Eureka service registry retained: single-node, port 8761, security and self-preservation | aceita | local |
| ADR-002 | REG service boundary: registry-only single service | aceita | local |

> Both ADRs are the **orchestrator default (recommendation) — revisable by the owner**
> (recorded without a clarifying question in automated mode).

Shared (project-level) ADRs live in `../../adr/` and are **not** re-emitted here. They
govern the business services; a pure Eureka registry holds no domain, no PHI and no tenant
data, so they apply to REG only nominally:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters) for the Java business
  services; REG has no domain to layer.
- `ADR-002-modular-monolith.md` — service-decomposition direction; REG is the registry that
  lets those services find each other.
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation for data-owning services; REG
  owns no schema and is tenant-agnostic.

## Relationship map

- **ADR-001** (registry retained + topology) is the core decision for this phase — it pins
  that Eureka is kept, bound to `:8761` to match the clients' existing `EUREKA_URI`,
  single-node, self-preservation off in dev, internal-network-only with no PHI. It sits
  against shared `../../adr/ADR-002-modular-monolith.md` (the services it serves).
- **ADR-002** (registry-only single service) is the boundary within which ADR-001 applies —
  REG is one standalone process and nothing else.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than prose in
docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its number with a
strike-through note.
