# ADR Index — hist (HIST)

> Index of references, not a duplication. Project-level FE ADRs live in
> `docs/architecture/frontend/adr/` and are governed by that folder's README (render-time
> numbering, D-563). This module adds only its own module-local records below.

## ADRs Shared (project-level)

This project does **not** use the generic tax-map shared-ADR set. Its shared FE ADRs follow the scheme
in `../../../../adr/README.md`: numbers **001–005 are reserved/pending**, **006 is the first
materialized** record. HIST depends on them as follows.

| ADR | Subject | Status |
|---|---|---|
| [ADR-001](../../../../adr/) | Angular standalone + Signals + OnPush | reserved/pending |
| [ADR-002](../../../../adr/) | Nx boundaries (module slicing) | reserved/pending |
| [ADR-003](../../../../adr/) | Access layer (RBAC via `AccessDecisionService`) | reserved/pending |
| [ADR-004](../../../../adr/) | Lazy loading | reserved/pending |
| [ADR-005](../../../../adr/) | Design tokens | reserved/pending |
| [ADR-006](../../../../adr/ADR-006-module-entry-as-library.md) | Module entry as a library (`@neuroassist/<module>`) | accepted |

> The reserved shared ADRs were **not re-emitted** by `/fe-architect-vision`: they are governed by the
> project's own shared-ADR README and numbering, and the materialized ADR-006 already captures the
> module-as-library decision HIST relies on. Materializing 001–005 is a project-level decision, not a
> per-module one.

## ADRs Local (module-specific)

> Numbering caveat: the shared folder reserves the number **005** for "design tokens". The record below
> is a **module-local** HIST record in this module namespace; it does not alter or occupy the shared
> ADR-005 slot. Keep the two separate when cross-referencing. ACS, PAT, EDGE and EVNT follow the same
> convention (each has its own module-local ADR-005).

| ADR | Title | Status |
|---|---|---|
| [ADR-005](ADR-005-read-only-history-reader-ownership.md) | Read-only history/audit reader — ownership boundary and no-write stance | proposed |
