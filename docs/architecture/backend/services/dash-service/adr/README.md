# DASH — Architecture Decision Records

> Module **DASH — Dashboard and Notifications** · NeuroAssist NIV. Local (service-level) ADRs.
> **DASH has no backend service** (ADR-001); these records govern the module as a frontend
> composition/host. Shared project-level ADRs that apply by reference (hexagonal, modular-monolith,
> multi-tenancy) live in `../../../adr/` and are **not** re-emitted here.

## Index

| ADR | Title | Status | Scope |
|---|---|---|---|
| [ADR-001](ADR-001-dash-has-no-backend-service.md) | DASH has no backend service | accepted · revisable | local (DASH) |
| [ADR-002](ADR-002-fail-safe-home-overview.md) | Fail-safe home overview (never a false "all clear") | accepted · revisable | local (DASH) |

## Relationship map

- **ADR-001** is foundational: it decides there is no `dash-service` and that composition lives in the
  `dash-ui` frontend. It subsumes the usual "single-service vs decomposition" local decision (the
  answer is "no service").
- **ADR-002** depends on ADR-001: because composition happens in the client, the fail-safe "okay
  status" rule is a frontend invariant (INV-DASH-2 / SAFETY-DASH-1). If ADR-001 is ever revised toward
  a BFF (option B), ADR-002's aggregation rule moves with it unchanged.

Shared ADRs referenced by this module (in `../../../adr/`):
`ADR-001-hexagonal-architecture.md` (n/a — DASH has no backend layers), `ADR-002-modular-monolith.md`,
`ADR-003-multi-tenancy.md` (tenant isolation delegated to the owning modules).

## Process

Status values: `proposed` | `accepted` | `superseded`. Both local ADRs are owner-adopted orchestrator
defaults recorded as **revisable**: a later measured need (server-side aggregation at clinic scale) or
a new requirement (caregiver-owned preference data) is the trigger to revisit ADR-001, and ADR-002
follows it. Existing numbers are stable; a superseded ADR keeps its number and gains a pointer to its
replacement.
