# FE-DASH-020 -- Empty states — PAT empty (no patient → degraded, never all_clear); no-device; no-commands catalog; toast on refresh failure (SPEC-07 §4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`OverviewPageComponent` handles all empty-state scenarios gracefully: PAT `empty` (no patient configured) renders a degraded state — never `all_clear`; no-device (EDGE `empty`) renders an empty-device hint; no-commands catalog renders an "Add commands in Calibration" hint. A toast appears only when a full caregiver-initiated refresh fails outright.

## Approach (execution path)
1. `PAT empty (no patient)`: `sources().pat === 'empty'` → `CompositeStatus = 'degraded'` (guaranteed by FE-DASH-006); `OverviewPageComponent` renders "No patient configured" state with a link to PAT calibration. Never shows `all_clear`.
2. `EDGE empty (no device)`: `sources().edge === 'empty'` → `EdgeDeviceCardComponent` area renders "No device paired yet" message with a "Pair a device" link to EDGE device registration (EDGE-owned route).
3. `PAT empty catalog` (no commands): `CatalogSummaryComponent` empty state from FE-DASH-012 — renders "No commands configured. Add commands in Calibration." with the `/calibration` outbound link.
4. Toast on refresh failure: when `DashboardFacade.refresh()` throws or all sources remain in error after refresh → show a transient toast via `@neuroassist/shared/ui-feedback` ("Could not refresh — please try again"); the standing panels are not disturbed (SPEC-07 §4 toast rule).
5. All empty states use `@neuroassist/shared/ui-feedback` for consistent messaging.

## Implementation checklist (by layer/file)
- [ ] `OverviewPageComponent`: `sources().pat === 'empty'` → degraded state render, NOT `all_clear`
- [ ] `EdgeDeviceCardComponent` area: empty-device hint when `sources().edge === 'empty'`
- [ ] `CatalogSummaryComponent`: empty-commands hint from FE-DASH-012
- [ ] Toast on full refresh failure (single transient toast, non-blocking)
- [ ] No modal from any empty state (SPEC-07 §4)
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] `sources().pat === 'empty'` renders degraded (not `all_clear`) with patient-not-configured message
- [ ] Toast appears on refresh failure without disturbing standing panels
- [ ] No modal from any empty state
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-006 (DashboardFacade empty-state derivation)
- FE-DASH-008 (OverviewPageComponent template)
- FE-DASH-012 (CatalogSummaryComponent empty state)
- FE-DASH-019 (panel-error-banner)

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-07-error-handling.md` (§4)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md` (§2 — PAT empty → degraded)

## Architecture alignment
- INV-1: `empty` is not `ok`; PAT empty → never `all_clear`
- Toast-only for refresh failures (no modal, no blocking UI)
- Tags Nx: `scope:dash`, `type:feature`

## Milestone
Wave 7 / UX polish

## Labels
type:feature
layer:frontend
scope:dash
priority:P7

## Prioridade
P7
