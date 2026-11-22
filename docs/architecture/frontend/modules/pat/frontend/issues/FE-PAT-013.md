# FE-PAT-013 -- CommandListComponent + CommandRowComponent (presentational, urgency badge, retire/edit outputs)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`CommandListComponent` renders the list of active command rows; `CommandRowComponent` shows label, urgency badge, gesture description, sensitivity, duration; both emit `edit` and `remove` outputs for the page to handle.

## Approach (execution path)
1. Create `CommandListComponent` (standalone, OnPush, presentational): `input()` commands: `CommandRowVM[]`, canCalibrate: boolean, canRetire: boolean; `output()` edit = commandId, remove = commandId; delegates rendering to `CommandRowComponent`.
2. Create `CommandRowComponent` (standalone, OnPush, presentational): `input()` command: `CommandRowVM`, canCalibrate: boolean, canRetire: boolean; `output()` edit, remove; renders label, urgency badge (red for emergency, blue for routine), gestureDescription, sensitivity chip, duration window.
3. Apply a11y carry-forwards: urgency/sensitivity `<select>` controls carry an accessible name (`fe-component:a11y-select-name`); editor returns focus to the triggering row after save completes (`fe-component:modal-focus-return`); duration values use `Intl.NumberFormat`, never `toFixed` (`fe-component:kpi-decimal-format`).
4. Styling via Tailwind v4 utilities + oklch tokens from `@neuroassist/shared/ui-tokens`; no hardcoded colour/spacing (SPEC-02 §3).
5. Remove/retire action gated by `canRetire`; hidden when false (SPEC-05 §4).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-list/command-list.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-list/command-list.component.html`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-row/command-row.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-row/command-row.component.html`
- [ ] unit tests (a11y, focus return, urgency badge, canRetire gating)
- [ ] `npx nx test pat-feature-command-catalog` PASS
- [ ] `npx nx lint pat-feature-command-catalog` PASS

## Acceptance criteria
- [ ] Retire action is absent from the DOM when `canRetire = false` (SPEC-05 §4).
- [ ] Urgency badge shows 🔴 for `emergency` and 🔵 for `routine` (or equivalent semantic tokens — no hardcoded colour).
- [ ] `CommandListComponent` and `CommandRowComponent` import no `HttpClient` and no facade.
- [ ] `npx nx build pat-feature-command-catalog` PASS.

## Dependencies
FE-PAT-010 (CommandCatalogVM, CommandRowVM type definitions).

## Tenant-context impact
Nenhum (presentational components receive only pre-fetched data via inputs).

## Prioridade
P3
