# FE-PAT-012 -- CommandCatalogPageComponent (smart, OnPush) + feature-command-catalog routes

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
`CommandCatalogPageComponent` (smart, OnPush) renders the command catalog for a given `:patientId`; it reads `CommandFacade` and `GestureTypeFacade` signals, gates actions via `AccessDecisionService`, and delegates to presentational children.

## Approach (execution path)
1. Create `command-catalog.routes.ts` with a lazy route for `CommandCatalogPageComponent` at `/patients/:patientId/commands`.
2. Create `command-catalog-page.component.ts` (standalone, OnPush): inject `CommandFacade`, `GestureTypeFacade`, `PatientFacade`, `AccessDecisionService`; on `ngOnInit` call `commandFacade.listByPatient(patientId)` and `gestureTypeFacade.list()`.
3. Template reads `commandFacade.vm()` for catalog rows, `commandFacade.listState()` for skeleton/empty/error states, `patientFacade.active()` for breadcrumb name, `accessDecision.can('pat.command.create'|'calibrate'|'retire')` for action gating.
4. Wire `CommandListComponent` inputs (commands, canCalibrate, canRetire) and outputs (edit, remove).
5. Toggle `CommandEditorPanelComponent` from the page on edit/new actions (in-page panel, no route change).
6. No `HttpClient` in this component.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-catalog.routes.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-catalog-page/command-catalog-page.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-catalog-page/command-catalog-page.component.html`
- [ ] `npx nx test pat-feature-command-catalog` PASS
- [ ] `npx nx lint pat-feature-command-catalog` PASS

## Acceptance criteria
- [ ] `CommandCatalogPageComponent` renders the skeleton while `listState = 'loading'`, empty state while `success` and no commands, page error while `error` (SPEC-03).
- [ ] "New command" action is hidden when session lacks `pat.command.create` (SPEC-05 §4).
- [ ] No `HttpClient` import in the component.
- [ ] `npx nx build pat-feature-command-catalog` PASS.

## Dependencies
FE-PAT-010 (CommandFacade), FE-PAT-011 (GestureTypeFacade), FE-PAT-008 (PatientFacade).
FE-PAT-013 (CommandListComponent), FE-PAT-014 (CommandEditorPanelComponent).
FE-PAT-021 (Loading/Empty/Error components).

## Tenant-context impact
`patientId` from route param; server enforces cross-tenant isolation (INV-PAT-2, 404 if not same tenant).

## Prioridade
P3
