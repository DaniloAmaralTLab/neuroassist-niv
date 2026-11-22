# FE-ACS-013 -- RegisterCaregiverPageComponent + RegisterCaregiverFormComponent connected to CaregiverFacade.register

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

## Outcome
`RegisterCaregiverPageComponent` (smart, OnPush) is promoted from the design-reference prototype and connected to `CaregiverFacade.register()`; it drives `RegisterCaregiverFormComponent` with `submitting` and `fieldErrors` inputs, and on `username-taken` (409) surfaces the field error on the `username` input — not a global toast (SPEC-02 §1, SPEC-03 §2, SPEC-07 §2).

## Approach (execution path)
1. Create `RegisterCaregiverPageComponent` as a smart component injecting `CaregiverFacade`.
2. Route `/access/caregivers/new` with `canManageAccessGuard` (acs.caregiver.create authority).
3. Listen to the `submit` output from `RegisterCaregiverFormComponent`; call `facade.register(form)`.
4. Map `AppError.code === 'username-taken'` to `fieldErrors.username = 'This username is already taken.'` (SPEC-07 §2 — field error, not a global toast).
5. Map `AppError.code === 'validation-error'` to per-field errors from BE `detail`.
6. Submit button disabled while `form.username` is blank, `form.password` is blank, or `form.role` is unset (invariant from SPEC-03 §2).
7. Promote the prototype's register form into `RegisterCaregiverFormComponent` (presentational): `submitting: input<boolean>()`, `fieldErrors: input<FieldErrors>()`, `submit: output<RegisterForm>()`.
8. No role evaluation inline — all gating happens in route guard.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/register-caregiver.page.ts`
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/register-caregiver-form.component.ts`
- [ ] `username-taken` → field error on `username` input (not a global toast)
- [ ] `validation-error` → per-field errors from BE detail
- [ ] Submit disabled while username / password blank or role unset
- [ ] `submitting = facade.submitState() === 'submitting'` passed as input
- [ ] No `HttpClient` import in page or form component
- [ ] `npx nx test acs-feature-caregivers` PASS
- [ ] `npx nx lint acs-feature-caregivers` PASS

## Acceptance criteria
- [ ] IF backend responds `username-taken`, THE SYSTEM SHALL show a field error on `username` and SHALL NOT show a global toast
- [ ] Submit button is disabled while username, password, or role field is blank
- [ ] WHILE `submitState = 'submitting'`, THE SYSTEM SHALL show the form in a disabled/loading state
- [ ] `npx nx build acs-feature-caregivers` PASS

## Dependencies
FE-ACS-007 (CaregiverFacade.register), FE-ACS-019 (canManageAccessGuard), FE-ACS-023 (error mapper for username-taken).

## Tenant-context impact
Registered caregiver is created in the active tenant (enforced by `X-Tenant-Id` interceptor).

## Prioridade
P3
