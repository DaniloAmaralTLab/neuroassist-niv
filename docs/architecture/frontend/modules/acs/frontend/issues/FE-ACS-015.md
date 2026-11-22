# FE-ACS-015 -- PatientHeaderComponent + PersistentSessionWarningComponent — SEC-001 persistent-session banner

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`PatientHeaderComponent` (presentational) displays the patient name and an online/offline device badge; `PersistentSessionWarningComponent` (presentational) renders the SEC-001 persistent-session warning that a session never expires and is revocable at any time — it must be confirmed before provision proceeds (SPEC-02 §2, SPEC-03 §3, SEC-001).

## Approach (execution path)
1. Promote the prototype's patient header screen into `PatientHeaderComponent`: `patient: input<{ id, name, deviceOnline }>()`.
2. Render device status badge — green dot for `deviceOnline = true`, grey for false (no colour/spacing hardcoded, tokens only).
3. `PersistentSessionWarningComponent`: `visible: input<boolean>()`, outputs `confirm: output<void>()` and `cancel: output<void>()`.
4. The warning text must state "this session never expires and is revocable at any time" (SEC-001 requirement).
5. The RevokeButton is **always visible** in the session list — never hidden or placed behind advanced settings (SEC-001).
6. After an in-flight action completes, focus returns to the trigger button (carry-forward `fe-component:modal-focus-return`).
7. `visible` controls whether the warning modal is open; the page component decides when to show it (before provision).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/patient-header.component.ts`
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/persistent-session-warning.component.ts`
- [ ] Warning text states "this session never expires and is revocable at any time" (SEC-001)
- [ ] `confirm` and `cancel` outputs on the warning component
- [ ] Device online/offline badge uses only oklch token classes (no hardcoded colour)
- [ ] After action completes, focus returns to the trigger (carry-forward)
- [ ] Both components: `standalone: true`, `changeDetection: OnPush`
- [ ] `npx nx test acs-feature-patient-sessions` PASS

## Acceptance criteria
- [ ] `PersistentSessionWarningComponent` emits `confirm` and `cancel` outputs
- [ ] Warning component does NOT render any expiry countdown (SEC-001: sessions have no expiry)
- [ ] Device status badge shows green for online, grey for offline
- [ ] `npx nx lint acs-feature-patient-sessions` PASS

## Dependencies
FE-ACS-014 (PatientSessionsPageComponent consumes these components).

## Tenant-context impact
None — presentational; all data passed via inputs.

## Prioridade
P3
