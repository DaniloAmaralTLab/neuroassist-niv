# ADR Index — conv (CONV)

> Index of references, not a duplication. Project-level FE ADRs live in
> `docs/architecture/frontend/adr/` and are governed by that folder's README (render-time
> numbering, D-563). This module adds only its own module-local records below.

## ADRs Shared (project-level)

This project does **not** use the generic tax-map shared-ADR set. Its shared FE ADRs follow the
scheme in `../../../../adr/README.md`: numbers **001–005 are reserved/pending**, **006 is the first
materialized** record. CONV depends on them as follows and does **not** re-emit them.

| ADR | Subject | Status |
|---|---|---|
| [ADR-001](../../../../adr/) | Angular standalone + Signals + OnPush | reserved/pending |
| [ADR-002](../../../../adr/) | Nx boundaries (module slicing) | reserved/pending |
| [ADR-003](../../../../adr/) | Access layer (RBAC via `AccessDecisionService`) | reserved/pending |
| [ADR-004](../../../../adr/) | Lazy loading | reserved/pending |
| [ADR-005](../../../../adr/) | Design tokens | reserved/pending |
| [ADR-006](../../../../adr/ADR-006-module-entry-as-library.md) | Module entry as a library (`@neuroassist/<module>`) | accepted |

> The reserved shared ADRs were **not re-emitted** by `/fe-architect-vision`: they are governed by
> the project's own shared-ADR README and numbering. The materialized ADR-006 (module-as-library) is
> the decision CONV's app/lib boundary relies on.

## ADRs Local (module-specific)

> Numbering caveat: the shared folder reserves **005** ("design tokens") and materializes **006**
> ("module entry as library"). The records below live in the **CONV module namespace** and do not
> alter or occupy those shared slots. ADR-006 is **skipped locally** to avoid confusion with the
> shared ADR-006; CONV's second local record is numbered **007**.

| ADR | Title | Status |
|---|---|---|
| [ADR-005](ADR-005-offline-first-cached-speech-tree.md) | Offline-first cached speech-tree runtime (tree + pre-synthesized audio, version-aware, fail-safe playback) | proposed |
| [ADR-007](ADR-007-input-channel-agnostic-navigation-seam.md) | Input-channel-agnostic navigation via in-process `NavigationIntentPort` (GEST→CONV, never HTTP) + switch-scan accessibility | proposed |
