# FE-ACS-022 -- Loading skeletons, empty states and page-error/retry for caregiver list and patient sessions

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`CaregiverListPageComponent` and `PatientSessionsPageComponent` render complete three-state UX for their data: a loading skeleton while `listState/opState = 'loading'`, an empty state when the response is empty, and a page-error banner with a single manual Retry affordance when the fetch fails — no auto-retry (SPEC-03, SPEC-07 §4).

## Approach (execution path)
1. Add loading skeleton template block to `CaregiverListPageComponent` (driven by `listState() === 'loading'`): reuse the shared skeleton component from `@neuroassist/shared/ui-feedback`.
2. Add empty state block (driven by `listState() === 'success'` and `caregivers().length === 0`): use shared `EmptyStateComponent` with contextual message.
3. Add page-error block (driven by `listState() === 'error'`): use `PageErrorComponent` with a "Retry" button that calls `facade.load()`.
4. Repeat the same three-state pattern for `PatientSessionsPageComponent` (driven by `opState()`).
5. Retry: single manual affordance — clicking "Retry" calls `facade.load()` or `facade.loadForPatient(patientId)` again; no silent auto-retry (pilot volume, SPEC-07 §4).
6. Each template branch is mutually exclusive — exactly one of loading/empty/error/data renders at a time.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/caregiver-list.page.ts`
- [ ] implementar `frontend/libs/acs/feature-patient-sessions/src/lib/patient-sessions.page.ts`
- [ ] Loading skeleton shown when `listState = 'loading'`; hidden otherwise
- [ ] Empty state shown when `listState = 'success'` and rows empty
- [ ] Page-error shown when `listState = 'error'`; Retry button calls `facade.load()`
- [ ] No auto-retry on error
- [ ] Templates are mutually exclusive (at most one state visible at a time)
- [ ] `npx nx test acs-feature-caregivers` PASS
- [ ] `npx nx test acs-feature-patient-sessions` PASS

## Acceptance criteria
- [ ] WHILE `listState = 'loading'`, THE SYSTEM SHALL render the skeleton and SHALL NOT render the empty state
- [ ] WHILE `listState = 'success'` and rows empty, THE SYSTEM SHALL render the empty state
- [ ] WHEN list request fails, THE SYSTEM SHALL render a page-error with a Retry affordance and SHALL NOT auto-retry
- [ ] `npx nx lint acs-feature-caregivers` PASS

## Dependencies
FE-ACS-011 (CaregiverListPageComponent), FE-ACS-014 (PatientSessionsPageComponent).

## Tenant-context impact
None — these are UI state branches; data is tenant-scoped by interceptor.

## Prioridade
P7
