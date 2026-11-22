# FE-PAT-014 -- CommandEditorPanelComponent (presentational, new|edit modes, inline panel not a route)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`CommandEditorPanelComponent` (presentational) handles the new|edit command form in-page; it validates save invariants client-side and emits `save`, `cancel`, `registerType`, `liveTestToggle` outputs without touching any facade or HttpClient.

## Approach (execution path)
1. Create `command-editor-panel.component.ts` (standalone, OnPush, presentational): `input()` vm: `CommandEditorVM`, gestureTypes: `GestureTypeVM[]`; `output()` save = CommandEditorForm, cancel = void, registerType = `{slot, name, code}`, liveTestToggle = `'start'|'stop'`.
2. Template: label input, urgency and sensitivity selects (with accessible names), primary/secondary gesture slots (via `GestureSlotComponent`), duration window (via `DurationWindowControlComponent`), live-test toggle button.
3. Save button disabled invariants: `label` blank, `primaryPrimitive` unset, or `minGestureTimeMs >= maxGestureTimeMs` — blocked client-side, never reaches server (SPEC-03 §2).
4. `secondaryPrimitive == primaryPrimitive` → gesture field error displayed inline.
5. Live-test advisory (SPEC-02): a compound command surfaces non-blocking recommendation to run live test; `liveTestToggle` output starts/stops `LiveWebcamTestComponent`.
6. Mode `new` vs `edit` controls the panel title and save button label; draft state is feature-local signal in the page, nothing persists until save.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-editor/command-editor-panel.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-editor/command-editor-panel.component.html`
- [ ] unit tests (save disabled invariants, secondary=primary error, compound recommendation)
- [ ] `npx nx test pat-feature-command-catalog` PASS
- [ ] `npx nx lint pat-feature-command-catalog` PASS

## Acceptance criteria
- [ ] Save is disabled while label is blank, primaryPrimitive unset, or min ≥ max (SPEC-03 §2).
- [ ] Equal primary/secondary gesture types show inline gesture field error and block save.
- [ ] No `HttpClient` or facade injection in the component.
- [ ] `npx nx build pat-feature-command-catalog` PASS.

## Dependencies
FE-PAT-010 (CommandEditorVM, CommandEditorForm types).
FE-PAT-015 (DurationWindowControlComponent, GestureSlotComponent sub-controls).
FE-PAT-016 (LiveWebcamTestComponent).

## Tenant-context impact
Nenhum (editor is a presentational panel with no server calls; tenant isolation is enforced by the page's facade calls).

## Prioridade
P3
