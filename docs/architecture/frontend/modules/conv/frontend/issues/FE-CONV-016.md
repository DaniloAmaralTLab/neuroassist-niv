# FE-CONV-016 -- NodeGridComponent — dual-auth display, large-target tiles (ALS/MND), gesture-reachable hint, a11y, (select)/(descend) emits

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-02 §1–2, SPEC-03 §1–3 (dual-auth filter, nodes), generator-config.yml §features

## Outcome
`NodeGridComponent` renders the active-level node grid. It receives `nodes: SpeechTreeNodeVM[]` (already dual-auth filtered by `SpeechTreeFacade`) and `selectedId: string | null`. It renders a large-target tile per node, shows the "reachable by gesture" hint when `node.reachableByGesture`, emits `(select)` for phrases and `(descend)` for categories. It is standalone, OnPush, holds no injected service.

## Approach (execution path)
1. Create `frontend/libs/conv/feature-converse/src/lib/node-grid.component.ts`.
2. `@Input nodes: SpeechTreeNodeVM[]` — rendered as the grid; already filtered by facade.
3. `@Input selectedId: string | null` — applies a visual "selected" state to the matching tile.
4. `@Output select = new EventEmitter<string>()` — emitted when a **phrase** node tile is tapped/clicked/gesture-activated (nodeId).
5. `@Output descend = new EventEmitter<string>()` — emitted when a **category** node tile is activated (categoryId).
6. Each tile: large touch-target (minimum 56px height per @neuroassist/shared/ui-tokens for ALS/MND); shows `node.text`; shows "gesture-reachable" indicator (icon/badge) when `node.reachableByGesture === true`.
7. a11y: `role="grid"`, `role="gridcell"` per tile; `aria-pressed` on selected tile; each tile `aria-label=node.text`.
8. `NodeGridComponent` NEVER renders a phrase node that was not in the `nodes` input (the facade already filtered unauthorized nodes; the component does not re-filter — single source of truth, SPEC-03 §3).
9. Unit tests: category tile → `(descend)` emitted; phrase tile → `(select)` emitted; `selectedId` → tile shows selected state; `reachableByGesture=true` → gesture hint shown.

**a11y note (fe-component:a11y-select-name):** each tile must have an accessible name matching `node.text`; aria-label must be on the interactive element.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/feature-converse/src/lib/node-grid.component.ts` — standalone, OnPush
- [ ] `@Input nodes: SpeechTreeNodeVM[]` — grid tiles
- [ ] `@Input selectedId: string | null` — selected tile visual state
- [ ] `@Output select: EventEmitter<string>` for phrase tiles
- [ ] `@Output descend: EventEmitter<string>` for category tiles
- [ ] Large-target tiles (min 56px) — @neuroassist/shared/ui-tokens
- [ ] "Reachable by gesture" indicator when `node.reachableByGesture === true`
- [ ] a11y: role=grid, role=gridcell, aria-label=node.text on each tile (no select without accessible name — pitfall `fe-component:a11y-select-name`)
- [ ] `npx nx test conv-feature-converse` PASS — category→descend, phrase→select, selectedId, reachableByGesture

## Acceptance criteria
- [ ] Category tile tap → `(descend)` emitted with categoryId; phrase tile tap → `(select)` emitted with phraseId
- [ ] Component never re-filters `nodes` — it renders every node in the input (facade is the single filter authority)
- [ ] All tiles have accessible names (`aria-label=node.text`) — axe `select-name` passes
- [ ] `npx nx test conv-feature-converse` PASS; `npx nx lint conv-feature-converse` PASS

## Dependencies
FE-CONV-011 (SpeechTreeNodeVM).
FE-CONV-014 (SpeechTreeNavigatorComponent — this is its child).

## Tenant-context impact
None — grid is purely presentational per-session.
