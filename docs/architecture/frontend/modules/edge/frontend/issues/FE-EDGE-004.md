## [FE-EDGE-004] EDGE_MODULE_DESCRIPTOR — shell registration in config/module-descriptors.ts

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EDGE_MODULE_DESCRIPTOR` is defined in `libs/edge/src/lib/edge.descriptor.ts` and registered in the shell's `config/module-descriptors.ts`, enabling shell-level fallback for menu/permission metadata and topbar `DeviceStatusBadge` slot reservation before the EDGE lazy chunk loads.

**Context / Problem statement:**
- SPEC-06 §1 defines the descriptor shape: `topbarContribution: 'DeviceStatusBadge'`, `permissions: Object.keys(MODULE_PERMISSION_MAP)`, `featureFlags: MODULE_FEATURE_FLAGS`.
- The shell uses the descriptor as a static fallback; the lazy chunk provides the full implementation once loaded.
- Because `DeviceStatusBadge` is always visible, the descriptor's `topbarContribution` must be set so the shell can reserve the slot without eager-loading the feature libs (SPEC-01 §2, doc 02 §3.2.B).
- Bloqueia: FE-EDGE-006, FE-EDGE-019

**Approach (execution path):**
1. Create `libs/edge/src/lib/edge.descriptor.ts` exporting `EDGE_MODULE_DESCRIPTOR` per SPEC-06 §1 (key, menu, loadChildren, routeBase, permissions, featureFlags, topbarContribution).
2. Open `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts`, import `EDGE_MODULE_DESCRIPTOR` and push it into `MODULE_DESCRIPTORS`.
3. Verify `topbarContribution: 'DeviceStatusBadge'` is set (not null).
4. Verify `loadChildren` references `import('@neuroassist/edge').then(m => m.EdgeModule)`.

**Non-goals:**
- Do not add a standalone top-level sidebar route entry (EDGE is contextual only — SPEC-05 §1).
- Do not eagerly import any feature lib component in the descriptor file.

**Layer(s):**
frontend / Tool entry — `libs/edge/src/lib/` + Shell integration — `apps/neuroassist-niv-web/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§1, §4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Lib path: libs/edge/src/lib/**
- 🔲 `libs/edge/src/lib/edge.descriptor.ts` (EDGE_MODULE_DESCRIPTOR)

**Shell app**
- 🔲 `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts` (register EDGE_MODULE_DESCRIPTOR)

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
- `EDGE_MODULE_DESCRIPTOR.topbarContribution === 'DeviceStatusBadge'`.
- `MODULE_DESCRIPTORS` in the shell includes the EDGE entry.
- `EDGE_MODULE_DESCRIPTOR.permissions` equals `Object.keys(MODULE_PERMISSION_MAP)`.
- `npx nx build neuroassist-niv-web` PASS (shell compiles with EDGE descriptor registered).

**Dependencies:**
- FE-EDGE-001 (MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS, MODULE_MENU_METADATA)
- FE-EDGE-003 (EdgeModule importPath)

**Data impact:**
Nenhum

**API / Contract impact:**
Nenhum

**Testing / Evidence required:**
- Shell build: `npx nx build neuroassist-niv-web` succeeds with the EDGE descriptor; badge slot reserved in topbar.

**Risks / Notes:**
- The shell must NOT eager-import any EDGE feature lib component through this descriptor; only the string key `'DeviceStatusBadge'` is declared, not the class.
