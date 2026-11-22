# ADR-006 — Module entry as a library (`@neuroassist/<module>`)

- **Status:** accepted (YYYY-MM-DD)
- **Scope:** global FE (all modules)
- **Supersedes:** adjusts `module-pattern.md` (the entry no longer lives in `apps/<module>`)

> Global FE ADRs 001–005 (angular-standalone-signals, nx-boundaries, access-layer,
> lazy-loading, design-tokens) are **reserved/pending**; this is the first global ADR
> materialized.

## Context

In the module pattern, the *entry* (contract, module, routes, permission-map, feature-flags,
bootstrap, nav.config, descriptor) would live in `apps/<module>/src/app/<module>-module/`. When building
the **module registry in the Shell** (`neuroassist-niv-web`), a structural blocker appears:

- The Shell needs to **import** `<module>.descriptor.ts` to register the module (menu, lazy route).
- But **Nx apps do not import other apps** (`@nx/enforce-module-boundaries` boundary) and an app
  **has no `importPath`** — so `@neuroassist/<module>` would not exist and the Shell could not
  import the entry.

## Decision

The **module entry is a library**: `libs/<module>/shell-entry`, with `importPath`
**`@neuroassist/<module>`** and tags `scope:<module>` `type:app`. It exports (barrel
`index.ts`) contract + module + routes + permission-map + feature-flags + bootstrap + nav.config +
**`<MODULE>_MODULE_DESCRIPTOR`**.

- The **Shell** (`neuroassist-niv-web`) imports `@neuroassist/<module>` in
  `config/module-descriptors.ts` and populates `MODULE_DESCRIPTORS` (the `scope:web → scope:<module>`
  boundary is allowed).
- `apps/<module>` remains a **thin host**: its `app.routes.ts` only does
  `loadChildren: () => import('@neuroassist/<module>').then(m => m.<Module>Module)`.
  It serves as the buildable/serveable target (`nx serve/build <module>`) and the e2e web-server base.

## Alternatives considered

1. **Keep the entry in `apps/<module>` + a bridge lib only for the descriptor** — rejected: keeps one
   app loading another, adds indirection, and does not resolve the `importPath` cleanly.
2. **Shell loads the entry via a relative path to `apps/<module>`** — rejected: violates the boundary and
   couples the Shell to another app's layout.

## Consequences

- **Positive:** Shell imports `@neuroassist/<module>` cleanly; module registration is
  automatable by the generator; boundaries are respected; the module is reusable/testable as a lib.
- **Negative:** one thin app host per module (small cost); modules scaffolded before this ADR
  require a light migration of the entry `apps/<module>/.../<module>-module` → `libs/<module>/shell-entry`.

## Implementation

- The `@neuroassist/internal:module` generator creates `libs/<module>/shell-entry` (importPath
  `@neuroassist/<module>`), writes the entry + barrel, and (re)writes `app.routes.ts` of the
  `apps/<module>` host.
- The Shell registers each module by importing `@neuroassist/<module>` in
  `config/module-descriptors.ts`.
- Post-scaffold gates: `nx lint <module>` → `nx build <module>` → `nx build/lint neuroassist-niv-web`.

## References

- `docs/architecture/frontend/standards/module-pattern.md`
- `docs/architecture/frontend/standards/nx-boundaries.md`
- `frontend/libs/internal-nx-plugin/internal` — generator `@neuroassist/internal:module`
