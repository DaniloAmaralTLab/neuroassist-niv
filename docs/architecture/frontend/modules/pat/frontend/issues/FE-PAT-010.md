# FE-PAT-010 -- CommandFacade — listByPatient, get, create, calibrate, retire (pessimistic, signals)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
`CommandFacade` exposes readonly signals `vm()`, `listState()`, `editorVm()` and all 5 operations (listByPatient, get, create, calibrate, retire); `CommandCatalogVM` and `CommandEditorVM` model the catalog and editor states.

## Approach (execution path)
1. Create `command-catalog.vm.ts` with `CommandCatalogVM` and `CommandRowVM` per SPEC-03 §1 (totals computed() from commands, canCreate/canCalibrate/canRetire from AccessDecisionService).
2. Create `command-editor.vm.ts` with `CommandEditorVM` and `CommandEditorForm` per SPEC-03 §2 (mode new|edit, test state, submitState, fieldErrors, newType slot).
3. Create `command.facade.ts` (injectable): private signals; expose via `.asReadonly()`; `listByPatient(patientId)` sets listState loading → success/error; `create(patientId, form)` pessimistic (await 201, prepend row); `calibrate(id, partial)` pessimistic (await 200, replace row); `retire(id)` pessimistic (await 204, drop from list); `get(id)` for single-command reload in edit.
4. Default filter = `active` (retired commands excluded from list — INV-PAT-5); retired remain resolvable by id.
5. `save` invariants: label blank / primaryPrimitive unset / min≥max → never send (SPEC-03 §2); secondaryPrimitive == primaryPrimitive → gesture field error.
6. No `HttpClient` in facade.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/data-access/src/lib/command/command-catalog.vm.ts`
- [ ] implementar `libs/pat/data-access/src/lib/command/command-editor.vm.ts`
- [ ] implementar `libs/pat/data-access/src/lib/command/command.facade.ts`
- [ ] unit tests facade (create, calibrate, retire, error mapping, retired-command filter)
- [ ] `npx nx test pat-data-access` PASS
- [ ] `npx nx lint pat-data-access` PASS

## Acceptance criteria
- [ ] Retired commands are excluded from the default active catalog list (INV-PAT-5); `get(id)` on a retired command still resolves.
- [ ] `create()` is pessimistic: row appears only after server 201 (SPEC-04 §4).
- [ ] `calibrate()` returns `command-retired` (409) → inline banner error, no row mutation (SPEC-07).
- [ ] `npx nx build pat-data-access` PASS.

## Dependencies
FE-PAT-009 (COMMAND_PORT, CommandWire, mapper).
FE-PAT-022 (error pipeline for ProblemDetail mapping).

## Tenant-context impact
`listByPatient()` relies on the JWT bearer; a tenant switch clears the facade via `patBootstrap.destroy()` (FE-PAT-006).

## Prioridade
P2
