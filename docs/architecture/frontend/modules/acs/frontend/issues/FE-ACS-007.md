# FE-ACS-007 -- CaregiverFacade — caregivers() / listState() / submitState() signals; pending-BE G3 degraded mode

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`CaregiverFacade` exposes `caregivers()`, `listState()`, and `submitState()` as readonly signals; `load()` seeds the roster from `me()` + `links()` (since `GET /acs/caregivers` list-all does not yet exist — G3) and sets a `degradedRoster` flag; `register()` and `deactivate()` are pessimistic mutations that update signals only after the server confirms (SPEC-03 §1, SPEC-04 §4).

## Approach (execution path)
1. Create `CaregiverFacade` as a providable Angular service (no NgRx).
2. Private `WritableSignal<CaregiverRowVM[]>` for the list; expose `.asReadonly()` as `caregivers()`.
3. Private `WritableSignal<ListState>` for load/submit states; expose as `listState()` and `submitState()`.
4. `load()`: set `listState = 'loading'` → call `api.me()` → `api.links(meId)` → build partial roster → set `degradedRoster = true` → set `listState = 'success'`.
5. `register(form)`: set `submitState = 'submitting'` → call `api.register(form)` → on success append to `caregivers()` signal + set `submitState = 'editing'`; on error set `submitState = 'error'`.
6. `deactivate(id)`: pessimistic — await server then update row status in `caregivers()`.
7. Do NOT fabricate missing fields as `null` fillers (carry-forward `fe-facade:fabricated-null-fields`).
8. Write a spec `caregiver.facade.spec.ts` with stub as `Pick<CaregiverFacade, ...>` (carry-forward `test:page-spec:partial-facade-stub-drift`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/data-access/src/lib/caregiver.facade.ts`
- [ ] implementar `frontend/libs/acs/data-access/src/lib/caregiver.facade.spec.ts`
- [ ] `caregivers()`, `listState()`, `submitState()` are readonly signals
- [ ] `load()` seeds from `me()` + `links()` (G3: no list-all); sets `degradedRoster = true`
- [ ] `register()` pessimistic; appends row only after 201 response
- [ ] No fabricated null/placeholder fields in signal values (carry-forward)
- [ ] Spec stubs typed as `Pick<CaregiverFacade, ...>` not `Partial<>`
- [ ] `npx nx test acs-data-access` PASS

## Acceptance criteria
- [ ] WHILE `listState = 'loading'`, THE SYSTEM SHALL NOT render the empty state (spec verifies signal)
- [ ] WHILE `listState = 'success'` and roster is empty, THE SYSTEM SHALL surface empty state
- [ ] `register()` does NOT update `caregivers()` before receiving `201` from the server
- [ ] `npx nx lint acs-data-access` PASS

## Dependencies
FE-ACS-006 (CaregiverApiService).

## Tenant-context impact
Facade signals are cleared in `acsBootstrap.destroy()` — a tenant switch flushes all cached roster data.

## Prioridade
P2
