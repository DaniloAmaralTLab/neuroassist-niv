# FE-PAT-015 -- DurationWindowControlComponent + GestureSlotComponent (sub-editor controls, min < max invariant)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`DurationWindowControlComponent` enforces `min < max` before enabling save (resolves gap G5/R2); `GestureSlotComponent` renders primary/optional secondary primitive selects with an "+ register new type" link.

## Approach (execution path)
1. Create `duration-window-control.component.ts` (standalone, OnPush, presentational): `input()` minMs: number, maxMs: number; `output()` change = `{minMs, maxMs}`; two numeric/range inputs; enforces `min < max` before emitting change and surfaces inline error when invalid (INV-PAT-3 carry-forward from R2/G5).
2. Create `gesture-slot.component.ts` (standalone, OnPush, presentational): `input()` slot: `'primary'|'secondary'`, types: `GestureTypeVM[]`, selected: string|null; `output()` selected = id, openRegisterType = slot; renders dropdown of available types; "+ register new type" link (gated by `pat.gesture-type.create`); secondary slot is optional and shows secondary=primary validation error.
3. Apply `fe-component:a11y-select-name` carry-forward: each select has an associated `<label>` or `aria-label`.
4. Duration values in the control use `Intl.NumberFormat` for display, never `toFixed` (`fe-component:kpi-decimal-format`).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-editor/duration-window-control.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-editor/gesture-slot.component.ts`
- [ ] unit tests (min≥max error, slot dropdown, openRegisterType emission)
- [ ] `npx nx test pat-feature-command-catalog` PASS
- [ ] `npx nx lint pat-feature-command-catalog` PASS

## Acceptance criteria
- [ ] `DurationWindowControlComponent` does not emit `change` when `minMs >= maxMs`; shows inline validation error (SPEC-03 §2 invariant, INV-PAT-3).
- [ ] `GestureSlotComponent` emits `openRegisterType` when "+ register new type" is activated, with the slot identifier.
- [ ] Both components carry accessible names on all select/input controls (`fe-component:a11y-select-name`).
- [ ] `npx nx build pat-feature-command-catalog` PASS.

## Dependencies
FE-PAT-011 (GestureTypeVM type for slot dropdown).
FE-PAT-010 (CommandEditorVM for duration values).

## Tenant-context impact
Nenhum (purely presentational sub-controls).

## Prioridade
P3
