# ADR Index — trn (TRN)

> Index of references, not a duplication. Project-level FE ADRs live in
> `docs/architecture/frontend/adr/` and are governed by that folder's README (render-time numbering,
> D-563). This module adds only its own module-local records below.

## ADRs Shared (project-level)

This project does **not** use the generic tax-map shared-ADR set. Its shared FE ADRs follow the scheme
in `../../../../adr/README.md`: numbers **001–005 are reserved/pending**, **006 is the first
materialized** record. TRN depends on them as follows and does **not** re-emit them.

| ADR | Subject | Status |
|---|---|---|
| [ADR-001](../../../../adr/) | Angular standalone + Signals + OnPush | reserved/pending |
| [ADR-002](../../../../adr/) | Nx boundaries (module slicing) | reserved/pending |
| [ADR-003](../../../../adr/) | Access layer (RBAC via `AccessDecisionService`) | reserved/pending |
| [ADR-004](../../../../adr/) | Lazy loading | reserved/pending |
| [ADR-005](../../../../adr/) | Design tokens | reserved/pending |
| [ADR-006](../../../../adr/ADR-006-module-entry-as-library.md) | Module entry as a library (`@neuroassist/<module>`) | accepted |

> The reserved shared ADRs were **not re-emitted** by `/fe-architect-vision`: they are governed by the
> project's own shared-ADR README and numbering. The materialized ADR-006 (module-as-library) is the
> decision TRN's app/lib boundary and its two shell mounts rely on.

## ADRs Local (module-specific)

> Numbering caveat: the shared folder reserves **005** ("design tokens") and materializes **006**
> ("module entry as library"). The records below live in the **TRN module namespace** and do not alter
> or occupy those shared slots. ADR-006 is **skipped locally** to avoid confusion with the shared
> ADR-006; TRN's second local record is numbered **007** (mirrors the CONV module convention).

| ADR | Title | Status |
|---|---|---|
| [ADR-005](ADR-005-dual-shell-dual-authorization-authoring.md) | Dual-shell, dual-authorization authoring under one lib (caregiver web Shell + patient confirmation host; publish only on both confirmations) | aceita (revisable at Specs/M1.5) |
| [ADR-007](ADR-007-be-mediated-llm-and-tts-with-fail-safe-authoring.md) | BE-mediated LLM proposal + ElevenLabs synthesis (FE never calls vendors) with fail-safe degradation | aceita (revisable at Specs/M1.5) |
