# FE-ACS-018 -- feature-tenant-admin routes + TenantAdminPageComponent + TenantWizardFormComponent (ops-host gated)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`TenantAdminPageComponent` (smart, OnPush) is promoted from the design-reference prototype and connected to `TenantAdminFacade.onboard()`; it is accessible only when `opsHostGuard` resolves `onAdminHost = true`; `TenantWizardFormComponent` (presentational) handles the `name`/`type` form with field errors — `type` is a closed set of `family` or `clinic` (no `PLATFORM_ADMIN`) (SPEC-02 §3, ADR-011).

## Approach (execution path)
1. Create `libs/acs/feature-tenant-admin/src/lib/tenant-admin.routes.ts` with `/ops/tenants` guarded by `[authGuard, opsHostGuard]`.
2. `TenantAdminPageComponent`: inject `TenantAdminFacade`; listen to `submit` output from the wizard form; call `facade.onboard(form)`.
3. Map `AppError` field errors to `fieldErrors` input of the wizard form.
4. On 201 success: navigate to a confirmation view or show a success toast.
5. `TenantWizardFormComponent` (presentational): `submitting: input<boolean>()`, `fieldErrors: input<FieldErrors>()`, `submit: output<{ name, type }>()`.
6. `type` control: closed `<select>` with options `family` and `clinic` only — no `PLATFORM_ADMIN` option (ADR-011, SPEC-02 §3).
7. The route is unreachable off the admin host; the Ops breadcrumb and sidebar entry are hidden by `AcsShellIntegrationService` when `onAdminHost = false` (SPEC-06 §2).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-tenant-admin/src/lib/tenant-admin.routes.ts`
- [ ] implementar `frontend/libs/acs/feature-tenant-admin/src/lib/tenant-admin.page.ts`
- [ ] implementar `frontend/libs/acs/feature-tenant-admin/src/lib/tenant-wizard-form.component.ts`
- [ ] `type` select has only `family` and `clinic` options (no PLATFORM_ADMIN)
- [ ] Route guarded by `[authGuard, opsHostGuard]`
- [ ] Field errors from facade mapped to form component inputs
- [ ] `npx nx test acs-feature-tenant-admin` PASS
- [ ] `npx nx lint acs-feature-tenant-admin` PASS

## Acceptance criteria
- [ ] WHILE `onAdminHost = false`, THE SYSTEM SHALL block navigation to `/ops/tenants` and SHALL omit the Ops menu entry
- [ ] `type` input accepts only `'family'` or `'clinic'` (TypeScript union + select options)
- [ ] ON 201 success, THE SYSTEM SHALL surface a success state; on 400/422 field errors appear on the relevant inputs
- [ ] `npx nx build acs-feature-tenant-admin` PASS

## Dependencies
FE-ACS-010 (TenantAdminFacade), FE-ACS-020 (opsHostGuard).

## Tenant-context impact
`POST /acs/ops/tenants` creates a NEW tenant (platform-ops only, INV-5); it does not operate within an existing tenant's context.

## Prioridade
P3
