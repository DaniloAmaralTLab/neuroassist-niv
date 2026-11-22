# FE-ACS-017 -- ProvisionButtonComponent — pessimistic provision flow with PersistentSessionWarning confirm

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`ProvisionButtonComponent` (presentational) triggers the two-step pessimistic provision flow: clicking "Provision" opens `PersistentSessionWarningComponent`; confirming the warning emits the `provision` output; the page delegates to `PatientSessionFacade.provision()`; a new active session row appears only after the server returns `201` (SPEC-02 §2, SPEC-04 §4, SEC-001).

## Approach (execution path)
1. `ProvisionButtonComponent`: `canProvision: input<boolean>()`, `disabled: input<boolean>()` (in-flight), output `provision: output<void>()`.
2. Clicking the button when `canProvision = true` and `disabled = false` emits `provision`.
3. The page component listens to `provision` output, opens the persistent-session warning (via a local boolean signal), and only calls `facade.provision()` after the warning's `confirm` output.
4. After `facade.provision()` resolves (201), the new row is prepended in `vm().sessions` — the ProvisionButton returns to enabled state.
5. When `canProvision = false`: button is rendered but hidden (not in the DOM — SPEC-05 §1).
6. When `disabled = true` (in-flight): button is disabled with aria state.
7. Focus returns to provision button after the warning closes (whether confirmed or cancelled) — carry-forward `fe-component:modal-focus-return`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/provision-button.component.ts`
- [ ] `canProvision = false` → button hidden from DOM
- [ ] `disabled = true` → button disabled (aria-disabled + visual state)
- [ ] `provision` output emitted on click (page handles the warning dialog separately)
- [ ] Focus returns to this button after the warning dialog closes
- [ ] `standalone: true`, `changeDetection: OnPush`
- [ ] `npx nx test acs-feature-patient-sessions` PASS

## Acceptance criteria
- [ ] WHILE `canProvision = false`, THE SYSTEM SHALL hide the provision action
- [ ] WHILE `disabled = true`, THE SYSTEM SHALL disable the provision button
- [ ] After provision warning closes (confirm or cancel), focus returns to the provision button
- [ ] `npx nx lint acs-feature-patient-sessions` PASS

## Dependencies
FE-ACS-014 (PatientSessionsPageComponent — orchestrates the warning dialog), FE-ACS-015 (PersistentSessionWarningComponent).

## Tenant-context impact
None — presentational; session creation is tenant-scoped by interceptor.

## Prioridade
P3
