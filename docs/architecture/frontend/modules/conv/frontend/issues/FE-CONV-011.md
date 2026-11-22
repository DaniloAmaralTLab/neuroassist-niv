# FE-CONV-011 -- View model types — SpeechTreeNodeVM, ConverseScreenVM, TreeState, Wire records (TreeBundleWire, AudioManifestEntryWire, UsageSignalAckWire)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

**SPEC refs:** SPEC-03 §1–3, generator-config.yml §state_management

## Outcome
All view-model types and wire types for the CONV module are defined in `frontend/libs/conv/src/lib/models/`. `SpeechTreeNodeVM` and `ConverseScreenVM` are the primary FE view contracts; `TreeState` is the five-state type for the fail-safe surface; wire records mirror the BE JSON exactly. Derived-state rules (dual-auth filter, active computation) are documented as pure functions alongside the types.

## Approach (execution path)
1. Create `frontend/libs/conv/src/lib/models/speech-tree-node.vm.ts` — `SpeechTreeNodeVM` interface (SPEC-03 §1): id, type, parentId, order, text, audioRef, engineFeatureRef, reachableByGesture (derived), active (derived).
2. Create `frontend/libs/conv/src/lib/models/converse-screen.vm.ts` — `ConverseScreenVM` interface (SPEC-03 §1): currentLevelLabel, nodes, selectedNode, activeChannel, pendingConfirmation, audioSource, offline, snapshotVersion, treeState.
3. Define `TreeState = 'cold' | 'syncing' | 'ready' | 'empty' | 'offline-stale'` (SPEC-03 §2) — document each state meaning inline.
4. Create `frontend/libs/conv/src/lib/models/wire.types.ts` — wire record interfaces: `TreeBundleWire`, `SpeechTreeNodeWire`, `AudioManifestEntryWire`, `UsageSignalAckWire`. Mirror BE JSON field names exactly (no invented fields).
5. Add pure-function helpers for derived-state rules (SPEC-03 §3):
   - `isNodeActive(node: SpeechTreeNodeWire, locale: 'en'): boolean` — dual-authorization check.
   - `isReachableByGesture(node: SpeechTreeNodeWire): boolean`.
6. Export all from `frontend/libs/conv/src/lib/models/index.ts` and from `frontend/libs/conv/src/index.ts`.
7. Unit test: `isNodeActive` for category (always true), phrase dual-authorized (true), phrase not (false).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/src/lib/models/speech-tree-node.vm.ts` — `SpeechTreeNodeVM` interface
- [ ] `frontend/libs/conv/src/lib/models/converse-screen.vm.ts` — `ConverseScreenVM` and `TreeState` type
- [ ] `TreeState` has exactly 5 values: 'cold', 'syncing', 'ready', 'empty', 'offline-stale'
- [ ] `frontend/libs/conv/src/lib/models/wire.types.ts` — wire records mirroring BE JSON (no invented fields)
- [ ] Derived-state helpers: `isNodeActive()`, `isReachableByGesture()` as pure functions
- [ ] `npx nx test conv` PASS — dual-auth filter, TreeState values
- [ ] `npx nx lint conv` PASS

## Acceptance criteria
- [ ] `TreeState` union has exactly 5 members
- [ ] `SpeechTreeNodeVM.active` for a category node is always `true`
- [ ] `SpeechTreeNodeVM.reachableByGesture` is `engineFeatureRef !== null`
- [ ] Wire record fields match BE api-contract §2 JSON field names exactly
- [ ] `npx nx test conv` PASS; `npx nx lint conv` PASS

## Dependencies
FE-CONV-001 (conv.contract.ts for model alignment).

## Tenant-context impact
None — view models are pure data types with no tenant-specific behavior.
