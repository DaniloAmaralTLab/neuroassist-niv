# ACS — Architecture Decision Records (service-local)

Service: `acs-service` · Module: ACS — Caregivers and Access · Project: NeuroAssist NIV

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| ADR-001 | ACS service boundary: single service | aceita | local |
| ADR-002 | Identity and authority model | aceita | local |
| ADR-003 | Patient session revocation via reused JWT blacklist | aceita | local |

Shared (project-level) ADRs that govern this service live in
`docs/architecture/backend/adr/` and are **not** re-emitted here:

- `ADR-001-hexagonal-architecture.md` — hexagonal (ports & adapters), all Java services.
- `ADR-002-modular-monolith.md` — service-decomposition direction (placeholder stub).
- `ADR-003-multi-tenancy.md` — schema-per-tenant isolation.

Handoff ADRs that originate these decisions (history, `_inbox/adr/`): ADR-012
(patient identity / persistent session, Option C), ADR-011 (tenant-onboarding
authority, keep `platform-ops`).

## Relationship map

- ADR-002 (identity/authority) realises handoff ADR-012 (Option C) and ADR-011
  (`platform-ops`, no `PLATFORM_ADMIN`); it depends on shared `ADR-003-multi-tenancy`
  (tenant scope) and shared `ADR-001-hexagonal-architecture` (layering).
- ADR-003 (revocation) depends on ADR-002 (defines the patient-session actor) and on
  constraint SEC-001 (revocation mandatory).
- ADR-001 (single service) is the boundary within which ADR-002 and ADR-003 apply.

## Process

Status values: `proposta` (proposed) · `aceita` (accepted) · `substituída por ADR-NNN`
(superseded). A decision with a visible trade-off becomes an ADR here rather than
prose in docs 01–06. Numbers are stable and never reused; a superseded ADR keeps its
number with a strike-through note.
