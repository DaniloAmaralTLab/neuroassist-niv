# FE-PAT-008 -- PatientFacade — signals register, list, get with .asReadonly() (no fabricated nulls)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`PatientFacade` exposes readonly signals `active()`, `registerState()`, `listState()` and operations `register(form)`, `list()`, `get(id)`; `PatientRegistrationVM` models the registration form state.

## Approach (execution path)
1. Create `patient-registration.vm.ts` with `PatientRegistrationVM: { form: { name: string }, submitState: 'editing'|'submitting'|'error', fieldErrors: Record<'name', string|null> }` per SPEC-03 §3.
2. Create `patient.facade.ts` (injectable service): private `signal<T>` for each state; expose `.asReadonly()` signals: `active()`, `registerState()`, `listState()`.
3. Implement `register(form)`: set `submitState = 'submitting'`; call `PATIENT_PORT.register()`; on 201 set `active` patient and emit success; on error map `AppError.code` to fieldErrors via `pat-error.mapper.ts`.
4. Implement `list()`: fetch all patients for active-patient resolution (PatRootComponent).
5. Implement `get(id)`: fetch single patient for breadcrumb resolution.
6. No `HttpClient` in facade — all server calls via `PATIENT_PORT`.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient-registration.vm.ts`
- [ ] implementar `libs/pat/data-access/src/lib/patient/patient.facade.ts`
- [ ] unit tests para facade (register, list, get, error mapping)
- [ ] `npx nx test pat-data-access` PASS
- [ ] `npx nx lint pat-data-access` PASS

## Acceptance criteria
- [ ] `PatientFacade` exposes signals via `.asReadonly()` — no mutable signal escapes.
- [ ] No `HttpClient` import in `patient.facade.ts`.
- [ ] `register()` maps `validation-error` ProblemDetail to `fieldErrors.name` (SPEC-07).
- [ ] `npx nx build pat-data-access` PASS.

## Dependencies
FE-PAT-007 (PATIENT_PORT and PatientWire).
FE-PAT-022 (error pipeline — PAT error mapper used for field error mapping).

## Tenant-context impact
`list()` and `get()` calls carry the tenant from the JWT bearer token; a `tenant-context.switchTo(...)` triggers `patBootstrap.destroy()` which clears the active patient signal (FE-PAT-006).

## Prioridade
P2
