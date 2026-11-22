# FE-PAT-023 -- Retire confirmation modal + compound gesture live-test recommendation banner

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`RetireConfirmModalComponent` gates the destructive retire action with a confirmation step; `CompoundTestRecommendationComponent` surfaces the non-blocking advisory when two primitives are configured.

## Approach (execution path)
1. Create `retire-confirm-modal.component.ts` (standalone, OnPush, presentational): `input()` commandLabel: string; `output()` confirm = void, cancel = void; shown before `CommandFacade.retire(id)` is called; uses `@neuroassist/shared/ui-feedback` modal (SPEC-07 §3: modal only for confirm-before-destructive, never for error display).
2. Create `compound-test-recommendation.component.ts` (standalone, OnPush, presentational): shown when `secondaryPrimitive` is non-null; non-blocking advisory (SPEC-02 §1); `output()` startTest = void; a user may dismiss it and save without testing; never disables save.
3. Wire `RetireConfirmModalComponent` into `CommandCatalogPageComponent`: on row `remove` output → show modal → on confirm call `commandFacade.retire(id)` → 204 → drop from list.
4. Wire `CompoundTestRecommendationComponent` into `CommandEditorPanelComponent`: shown when `secondaryPrimitive` is set.
5. Accessiblity: modal sets focus trap and returns focus to the triggering row on close (`fe-component:modal-focus-return`).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-editor/compound-test-recommendation.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-catalog-page/retire-confirm-modal.component.ts`
- [ ] unit tests (retire confirm gate, compound recommendation non-blocking, focus return)
- [ ] `npx nx test pat-feature-command-catalog` PASS
- [ ] `npx nx lint pat-feature-command-catalog` PASS

## Acceptance criteria
- [ ] `retire(id)` is called only after the caregiver confirms in the modal — no silent retire on first click.
- [ ] `CompoundTestRecommendationComponent` does not disable save (advisory only — SPEC-02 §1).
- [ ] Modal returns focus to the triggering row on close (`fe-component:modal-focus-return`).
- [ ] `npx nx build pat-feature-command-catalog` PASS.

## Dependencies
FE-PAT-010 (CommandFacade.retire()).
FE-PAT-012 (CommandCatalogPageComponent wires retire modal).
FE-PAT-014 (CommandEditorPanelComponent wires compound recommendation).

## Tenant-context impact
Nenhum (modal and advisory are UI-only components).

## Prioridade
P7
