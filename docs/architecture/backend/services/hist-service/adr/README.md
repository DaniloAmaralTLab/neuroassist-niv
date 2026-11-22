# HIST — Architecture Decision Records (service-local)

Service: `hist-service` · Module: HIST — History and Audit Trail · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope | Tag |
|---|---|---|---|---|
| ADR-001 | HIST service boundary: single service | aceita | local | — |
| ADR-002 | Audit immutability guarantee (DECISION a) | aceita | local | SAFETY/COMPLIANCE |
| ADR-003 | Audit ingest idempotency (DECISION c) | aceita | local | reliability |
| ADR-004 | Tenant isolation of the audit store (DECISION d) | aceita | local | SAFETY |
| ADR-005 | Audit-write failure policy (DECISION e) | aceita | local | SAFETY |
| ADR-006 | Retention vs data-subject erasure (DECISION b) | aceita | local | COMPLIANCE |

ADR-002..006 were **accepted on 2026-11-20** (user decisions a, b, d, e; ADR-003 orchestrator default) —
they were proposed as: they surface the five safety/compliance decisions the
upstream producers deferred, each with options + a recommendation, for the owner to
confirm. They are not unilaterally decided by this vision.

Shared (project-level) ADRs that govern this service live in
`docs/architecture/backend/adr/` and are **not** re-emitted here:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters), all Java services.
- `ADR-002-modular-monolith.md` — service-decomposition direction.
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation.

No shared messaging ADR exists or is needed — messaging is disabled project-wide
(`stack.messaging.enabled = false`); all coupling is synchronous REST.

## Relationship map

- ADR-001 (single service) is the boundary within which ADR-002..006 apply.
- ADR-002 (immutability) is the foundation; ADR-005 (failure policy) and ADR-006
  (retention/erasure) both depend on it — the trail must stay immutable whatever the
  failure or erasure path.
- ADR-003 (idempotency) enables ADR-005's enqueue-and-retry path to be duplicate-free.
- ADR-004 (tenant isolation) depends on shared `ADR-003-multi-tenancy`; it places the
  tenant-less GEST global facts and preserves isolation for tenant-scoped audit.
- ADR-005 closes the five upstream `TODO[architect]` failure-policy items in
  ACS/PAT/EDGE/EVNT/GEST `event-contracts.md`.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than prose in
docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its number with a
strike-through note.
