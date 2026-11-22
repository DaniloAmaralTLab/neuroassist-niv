# FE-CONV-013 -- NavigationService — level stack, currentLevelLabel, activeChannel signal, switch-scan timing (host/profile-configurable)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-02 §1, SPEC-03 §1 §3, SPEC-05 §3 (conv.switch-scan.enabled), ADR-007

## Outcome
`NavigationService` manages the level stack (`push(categoryId)`, `pop()`), exposes `currentParentId()`, `currentLevelLabel()` (parent node text or "Choose a category"), `activeChannel()` ('touch'|'gesture'|'scan'), and `setActiveChannel()`. Switch-scan timing (dwell interval, scan speed) is profile-configurable via a `SCAN_TIMING_TOKEN`; `conv.switch-scan.enabled` flag gates the scan channel.

## Approach (execution path)
1. Create `frontend/libs/conv/data-access/src/lib/navigation.service.ts`.
2. Private `_levelStack = signal<string[]>([])` — stack of category node IDs; empty = at root.
3. `currentParentId = computed(() => _levelStack().at(-1) ?? null)` — null at root.
4. `currentLevelLabel(allNodes: SpeechTreeNodeVM[]): computed` — find node with id=currentParentId, return `node.text`, or "Choose a category" if at root.
5. `push(categoryId: string): void`, `pop(): void` — mutate `_levelStack`.
6. `_activeChannel = signal<'touch' | 'gesture' | 'scan'>('touch')` — default 'touch'.
7. `setActiveChannel(ch: 'touch' | 'gesture' | 'scan'): void` — guards: if ch='scan' and `conv.switch-scan.enabled` flag is false → no-op.
8. Inject `SCAN_TIMING_TOKEN` for dwell interval + scan speed (host/profile-configurable, see SPEC-05 §3 conv.switch-scan.enabled).
9. Unit tests: push/pop stack; `currentLevelLabel` at root; switch-scan disabled → channel stays 'touch'.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/navigation.service.ts` — NavigationService injectable
- [ ] `_levelStack` as private signal; push()/pop() mutations
- [ ] `currentParentId = computed()` derived from stack
- [ ] `currentLevelLabel(allNodes)` — parent node text or "Choose a category" at root
- [ ] `activeChannel = signal<'touch' | 'gesture' | 'scan'>('touch')`
- [ ] `setActiveChannel()` guards on `conv.switch-scan.enabled` flag
- [ ] `SCAN_TIMING_TOKEN` InjectionToken for dwell/scan speed (host-configurable)
- [ ] `npx nx test conv-data-access` PASS — level stack, label at root, switch-scan gate
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] `currentLevelLabel` returns "Choose a category" when level stack is empty (at root)
- [ ] `pop()` on empty stack does not throw and stack remains empty
- [ ] `setActiveChannel('scan')` with `conv.switch-scan.enabled=false` leaves `activeChannel()` unchanged
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-011 (SpeechTreeNodeVM for `currentLevelLabel` computation).
FE-CONV-001 (conv.contract.ts for `conv.switch-scan.enabled` flag).

## Tenant-context impact
None — NavigationService holds UI-local level stack; no tenant-specific state.
