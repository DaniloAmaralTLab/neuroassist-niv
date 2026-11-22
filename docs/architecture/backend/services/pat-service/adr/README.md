# PAT — Architecture Decision Records (service-local)

Service: `pat-service` · Module: PAT — Patients and Command Catalog · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | PAT service boundary: single service | aceita | local |
| ADR-002 | Gesture-type catalog placement: PAT-owned global primitive vocabulary | aceita | local |
| ADR-003 | Command calibration and gesture composition model | aceita | local |
| ADR-004 | Command catalog distribution to detection actors | proposta | local |

Shared (project-level) ADRs that govern this service live in
`../../adr/` and are **not** re-emitted here:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters), all Java services.
- `ADR-002-modular-monolith.md` — service-decomposition direction.
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation.

## Relationship map

- **ADR-001** (single service) is the boundary within which ADR-002/003/004 apply; it
  depends on shared `ADR-002-modular-monolith` and shared `ADR-001-hexagonal-architecture`.
- **ADR-002** (gesture-type placement) sits against shared `ADR-003-multi-tenancy` — it is
  the deliberate exception that puts a PAT-owned catalog in the global schema; it defines
  INV-PAT-6 (vocabulary ≠ engine support).
- **ADR-003** (calibration/composition) realises the BA `Command` model and defines the
  anchor action `CommandCalibrated`; it depends on ADR-002 (primitives it composes).
- **ADR-004** (catalog distribution) depends on ADR-003 (what is read) and on the ACS
  constraint INV-3 (patient-session authorities `conv.*`/`gest.*` only); `proposta` until
  Specs pins the contract.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than prose
in docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its number
with a strike-through note.
