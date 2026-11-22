# MIG — Architecture Decision Records (service-local)

Service: `neuroassist-niv-migrations` · Module: MIG — Migrations (Centralized Flyway, all schemas) · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | MIG service boundary: single standalone migrator job | aceita | local |
| ADR-002 | Execution model: Spring Boot one-shot runner job, no HTTP port, not a Eureka client | aceita | local |
| ADR-003 | Central migration source of truth & local `V1` reconciliation | aceita | local |
| ADR-004 | Flyway version-range registry (authoritative) + MIG baseline block `V0001–V0009` | aceita | local |
| ADR-005 | Failure / rollback policy: forward-only, immutable applied scripts, checksum validation | aceita | local |

> All five ADRs are the **orchestrator default (recommendation) — revisable by the owner**
> (recorded without a clarifying question in automated mode).

Shared (project-level) ADRs live in `../../../adr/` and are **not** re-emitted here. They
govern the business services; a pure migrator holds no domain, no PHI and no tenant business
data, so they apply to MIG only nominally — except ADR-003-multi-tenancy, which is the
*reason* MIG exists:

- `../../../adr/ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters) for the
  Java business services; MIG has no domain to layer.
- `../../../adr/ADR-002-modular-monolith.md` — service-decomposition direction; MIG is the
  migrator those services depend on for schema.
- `../../../adr/ADR-003-multi-tenancy.md` — **schema-per-tenant isolation**; MIG materialises
  `neuroassist_global` + every `t_<tenantId>` and keeps them on one version.

## Relationship map

- **ADR-001** (single-service boundary) is the container: MIG is one standalone job.
- **ADR-002** (execution model) refines ADR-001 — *how* that job runs: a non-web Spring Boot
  `CommandLineRunner` that iterates schemas and exits; no port, no Eureka. It carries the
  non-transactional-DDL rule that ADR-005's failure policy depends on.
- **ADR-003** (source of truth + local `V1` reconciliation) and **ADR-004** (range registry +
  baseline block) are the two content decisions, both resting on shared
  `../../../adr/ADR-003-multi-tenancy.md`. ADR-004's `migration_range_registry` is what
  operationalises ADR-003's "central source of truth".
- **ADR-005** (forward-only / checksum / per-schema isolation) is the safety policy applied by
  the ADR-002 runner over the surface ADR-003/004 define.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than prose in
docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its number with a
strike-through note.
