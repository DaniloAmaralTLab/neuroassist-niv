# FE-CONV-012 -- SpeechTreeFacade — computed signals, cache-only reads (zero HTTP), dual-auth filter, select/descend/back, .asReadonly()

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-03 §3, SPEC-04 §1 §4, SPEC-02 §1

## Outcome
`SpeechTreeFacade` exposes: `items()` (all nodes from cache), `loading()`, `selectedNode()`, `pendingConfirmation()`, `offline()`, `snapshotVersion()`, `treeState()` — all as readonly computed signals. Mutations: `select(nodeId)`, `descend(categoryId)`, `back()`. Facade reads **only** from `TreeCacheStore` and `AudioCacheStore` — **zero HTTP per facade call** (INV-CONV-5). The dual-auth filter (`isNodeActive`) is applied by `nodes()` computed at the current level. Facade uses `.asReadonly()` on all signals.

## Approach (execution path)
1. Create `frontend/libs/conv/data-access/src/lib/speech-tree.facade.ts`.
2. Inject `TreeCacheStore`, `AudioCacheStore`, `NavigationService`.
3. Private `_allNodes = signal<SpeechTreeNodeVM[]>([])` — loaded from `TreeCacheStore` on init.
4. Computed signals (.asReadonly()):
   - `nodes()` — `_allNodes()` filtered to current level (by NavigationService.currentParentId), filtered by `isNodeActive()` (dual-auth), sorted by `order`.
   - `selectedNode()` — node matching current selectedId or null.
   - `pendingConfirmation()` — count of caregiver-confirmed but not patient-confirmed phrase nodes.
   - `offline()` — from `TreeCacheStore.offline`.
   - `snapshotVersion()` — from `TreeCacheStore.snapshotVersion`.
   - `treeState()` — derived from loading + cache state.
5. Mutations (all channel-agnostic — ADR-007):
   - `select(nodeId)` — sets selectedId; triggers `AudioPlaybackService.play()`.
   - `descend(categoryId)` — pushes categoryId onto NavigationService level stack.
   - `back()` — pops NavigationService level stack.
6. All mutations route through the same facade regardless of input channel (touch, gesture, switch-scan).
7. Unit tests: dual-auth filter tested; `select()` via touch = via gesture; `pendingConfirmation()` count.

**Pitfall (test:page-spec:partial-facade-stub-drift):** spec stubs typed as `Pick<SpeechTreeFacade, 'signals-read-by-component'>` — not `Partial<SpeechTreeFacade>`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/speech-tree.facade.ts` — SpeechTreeFacade injectable
- [ ] All signals exposed as `.asReadonly()` computed
- [ ] `nodes()` applies dual-auth filter (isNodeActive) at current level
- [ ] `select()`, `descend()`, `back()` are channel-agnostic (all channels use same path)
- [ ] Zero HTTP inside facade — reads only from TreeCacheStore / AudioCacheStore
- [ ] `pendingConfirmation()` counts correctly (caregiverConfirmed && !patientConfirmed in en locale)
- [ ] `frontend/libs/conv/data-access/src/lib/speech-tree.facade.spec.ts` — stub typed as Pick<SpeechTreeFacade, ...>
- [ ] `npx nx test conv-data-access` PASS — dual-auth, pendingConfirmation, all channels resolve same node
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] `nodes()` never includes a phrase node that is not dual-authorized in `en` locale
- [ ] `select()` from touch and from gesture intent set the same `selectedNode()` signal value
- [ ] All signals are `.asReadonly()` — no direct mutation from outside the facade
- [ ] No `HttpClient` call in facade methods
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-011 (SpeechTreeNodeVM, isNodeActive).
FE-CONV-007 (TreeCacheStore — offline, snapshotVersion).
FE-CONV-013 (NavigationService — currentParentId, level stack).
FE-CONV-009 (AudioPlaybackService — triggered on select).

## Tenant-context impact
None — facade reads from the station's local cache; patient-session token governs the upstream sync, not the facade.
