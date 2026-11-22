# FE-PAT-017 -- PatientRegistrationPageComponent (smart) + PatientRegistrationFormComponent (feature-patient-registry)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`PatientRegistrationPageComponent` (smart) calls `PatientFacade.register()` and advances the shell wizard on success; `PatientRegistrationFormComponent` (presentational) renders the name field with submit-disabled invariants.

## Approach (execution path)
1. Create `patient-registry.routes.ts` with lazy route for `PatientRegistrationPageComponent` at `/patients/register`.
2. Create `patient-registration-page.component.ts` (standalone, OnPush): inject `PatientFacade`, `AccessDecisionService`; on submit call `patientFacade.register({ name })` (tenant from JWT, never entered — SPEC-03 §3); on success emit completion signal for shell wizard to advance to first-command step (SPEC-06 §2).
3. Create `patient-registration-form.component.ts` (standalone, OnPush, presentational): `input()` submitting: boolean, fieldErrors: `Record<'name', string|null>`; `output()` submit = `{name}`; submit disabled while name is blank.
4. `canRegister` from `accessDecision.can('pat.patient.create')` gates page access (SPEC-05 §4).
5. On `name-conflict` or `validation-error` from BE map to `fieldErrors.name` via error pipeline.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-patient-registry/src/lib/patient-registry.routes.ts`
- [ ] implementar `libs/pat/feature-patient-registry/src/lib/patient-registration-page/patient-registration-page.component.ts`
- [ ] implementar `libs/pat/feature-patient-registry/src/lib/patient-registration-page/patient-registration-page.component.html`
- [ ] implementar `libs/pat/feature-patient-registry/src/lib/patient-registration-form/patient-registration-form.component.ts`
- [ ] implementar `libs/pat/feature-patient-registry/src/lib/patient-registration-form/patient-registration-form.component.html`
- [ ] unit tests (submit disabled, fieldErrors, wizard advance signal)
- [ ] `npx nx test pat-feature-patient-registry` PASS
- [ ] `npx nx lint pat-feature-patient-registry` PASS

## Acceptance criteria
- [ ] Submit is disabled while name is blank (SPEC-03 §3).
- [ ] On success, page emits completion signal so the shell wizard advances to the first-command step (SPEC-06 §2).
- [ ] Tenant is derived from JWT, never entered in the form (SPEC-03 §3, INV-PAT-1).
- [ ] `npx nx build pat-feature-patient-registry` PASS.

## Dependencies
FE-PAT-008 (PatientFacade, PatientRegistrationVM).
FE-PAT-022 (error pipeline for field error mapping).
FE-PAT-019 (canManageCatalogGuard gates this route — SPEC-01 §1).

## Tenant-context impact
Patient is created in the active tenant derived from the JWT claim; `X-Tenant-Id` is never sent by the FE (INV-PAT-1).

## Prioridade
P3
