# FE-ACS-024 -- Degraded-roster banner for caregiver list (G3: no GET /acs/caregivers list-all endpoint yet)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`CaregiverListPageComponent` renders a degraded-roster banner when `CaregiverFacade.degradedRoster = true`, informing the user that the full caregiver list is not yet available and that the page shows only the authenticated caregiver and their linked patients — without crashing or hiding the partial data (SPEC-03 §1, contracts gap G3).

## Approach (execution path)
1. Add a `degradedRoster` readonly signal to `CaregiverFacade` (set to `true` in `load()` since `GET /acs/caregivers` list-all does not exist — G3).
2. Create `DegradedRosterBannerComponent` (presentational): `visible: input<boolean>()`.
3. Banner message: "Full caregiver list unavailable — showing your profile and linked patients only. The complete roster will appear once the list endpoint is available."
4. The `acs.caregiver-list` feature flag defaults to `false` (MODULE_FEATURE_FLAGS); when it becomes `true` (after the BE endpoint lands), the banner can be suppressed and the full roster displayed.
5. Banner is an informational non-blocking element (not a page-error; not preventing the visible partial data).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/feature-caregivers/src/lib/degraded-roster-banner.component.ts`
- [ ] `CaregiverFacade.degradedRoster` signal added (always `true` until G3 endpoint lands)
- [ ] Banner shown when `facade.degradedRoster() === true`
- [ ] Banner message explains the limitation without technical jargon
- [ ] `acs.caregiver-list` feature flag wired to suppress banner when flag is `true`
- [ ] `npx nx test acs-feature-caregivers` PASS

## Acceptance criteria
- [ ] WHILE `degradedRoster = true`, THE SYSTEM SHALL render the degraded-roster banner
- [ ] The banner does NOT block display of the partial roster (me + links data)
- [ ] `npx nx lint acs-feature-caregivers` PASS

## Dependencies
FE-ACS-007 (CaregiverFacade.degradedRoster signal), FE-ACS-011 (CaregiverListPageComponent consumes this component).

## Tenant-context impact
None — this is a UI informational banner about a missing BE endpoint.

## Prioridade
P7
