## [FE-EDGE-003] EdgeModule — entry lib public API and @neuroassist/edge importPath barrel

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`libs/edge` is a fully declared Nx library with `importPath: '@neuroassist/edge'`, exporting only the public API (EDGE_ROUTES, EdgeModule, edge.contract exports) so the shell can lazy-load it via `loadChildren`.

**Context / Problem statement:**
- Shared ADR-006 (module-entry-as-library) mandates that each FE module exposes an Nx lib at its `importPath`.
- The shell's `loadChildren` references `'@neuroassist/edge'` (SPEC-06 §1).
- The barrel (`libs/edge/src/index.ts`) must not export internal implementation details.
- Bloqueia: FE-EDGE-004

**Approach (execution path):**
1. Confirm `libs/edge/project.json` has `"name": "edge"` and `"importPath": "@neuroassist/edge"`.
2. Author `libs/edge/src/lib/edge.module.ts` (or confirm the scaffold generated it) exporting `EdgeModule` that re-exports `EDGE_ROUTES` and declares no non-public symbols.
3. Update `libs/edge/src/index.ts` to export: `EDGE_ROUTES`, the four contract constants (FE-EDGE-001), and `EdgeModule`.
4. Confirm `tsconfig.base.json` path alias `@neuroassist/edge` resolves to `libs/edge/src/index.ts`.
5. Run `npx nx build edge` to validate the library compiles cleanly.

**Non-goals:**
- Do not export internal service or adapter classes from the barrel.
- Do not add an Nx secondary entry point (`@neuroassist/edge/feature-device-pairing`) — the lazy `loadComponent` paths import directly.

**Layer(s):**
frontend / Tool entry — `libs/edge/src/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/generator-config.yml` (entry_lib)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§1)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:feature`

**Implementation checklist (by file)**

**Lib path: libs/edge/src/**
- 🔲 `libs/edge/src/index.ts` (public barrel)
- 🔲 `libs/edge/src/lib/edge.module.ts` (EdgeModule)
- 🔲 `libs/edge/project.json` (importPath = @neuroassist/edge)

**Tests**
- 🔲 `npx nx test edge` PASS
- 🔲 `npx nx lint edge` PASS

**Milestone:**
Wave 1 / P1 Foundation

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P1

**Acceptance criteria:**
- `import('@neuroassist/edge')` resolves at build time.
- Barrel exports `EDGE_ROUTES`, `MODULE_KEY`, `MODULE_PERMISSION_MAP`, `MODULE_MENU_METADATA`, `MODULE_FEATURE_FLAGS`.
- Internal classes (`DeviceFacade`, adapters, wire types) are NOT in the barrel.
- `npx nx build edge` PASS with no warnings.

**Dependencies:**
- FE-EDGE-001 (contract exports)
- FE-EDGE-002 (EDGE_ROUTES)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum direto

**Testing / Evidence required:**
- `npx nx build edge` output shows tree-shaken bundle with no internal adapter classes exposed.

**Risks / Notes:**
- If `tsconfig.base.json` path alias is missing, the shell's `loadChildren` will fail at runtime with a module-not-found error.
