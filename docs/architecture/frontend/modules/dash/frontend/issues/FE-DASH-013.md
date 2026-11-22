# FE-DASH-013 -- feature-overview assembly — OverviewPageComponent wires all embedded module components (HIST HistoryWidgetComponent, EDGE EdgeDeviceCard/DeviceStatusBadge, EVNT RoutineNotice*)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`libs/dash/feature-overview/src/lib/overview-page.component.ts` and its `index.ts` are finalized: all embedded module components (`HistoryWidgetComponent`, `EdgeDeviceCardComponent`, `DeviceStatusBadgeComponent`, `RoutineNoticeListComponent`, `RoutineNoticeIndicatorComponent`) are imported from their owning modules' public `index.ts` and rendered verbatim — DASH never re-implements them. The `feature-overview` Nx library is fully registered.

## Approach (execution path)
1. Add imports to `OverviewPageComponent`:
   - From `@neuroassist/hist`: `HistoryWidgetComponent`
   - From `@neuroassist/edge`: `EdgeDeviceCardComponent`, `DeviceStatusBadgeComponent`
   - From `@neuroassist/evnt`: `RoutineNoticeListComponent`, `RoutineNoticeIndicatorComponent`
2. Wire in template:
   - `<hist-history-widget [patientId]="..."/>` or pass the read-only HIST entries slice from `DashboardFacade`
   - `<edge-device-card [deviceVm]="deviceHealth()"/>` and `<edge-device-status-badge ... />` in the header
   - `<evnt-routine-notice-list [notices]="notices()"/>` or `<evnt-routine-notice-indicator />`
3. Verify that DASH does NOT call any HTTP from within `OverviewPageComponent` — all data flows through `DashboardFacade`.
4. Create `libs/dash/feature-overview/src/index.ts` exporting `OverviewPageComponent`.
5. Register the `feature-overview` Nx library in `libs/dash/project.json` with tags `scope:dash`, `type:feature`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-page.component.ts` imports all 5 embedded components
- [ ] `frontend/libs/dash/feature-overview/src/index.ts` exports `OverviewPageComponent`
- [ ] All embedded components imported from owning module public `index.ts` only
- [ ] No HTTP calls in `OverviewPageComponent` template or component logic
- [ ] `frontend/libs/dash/feature-overview/project.json` with `scope:dash`, `type:feature` tags
- [ ] `npx nx lint dash` PASS (boundary rules pass: `feature` tags allowed in this lib)
- [ ] `npx nx build dash` PASS
- [ ] `npx nx build neuroassist-niv-web` PASS (shell resolves DASH lazy load)

## Acceptance criteria
- [ ] `OverviewPageComponent` registers no `HttpClient` in its imports
- [ ] All 5 embedded components imported from their owning module's `index.ts` exactly (never `internal/`)
- [ ] `npx nx build neuroassist-niv-web` PASS

## Dependencies
- FE-DASH-008 through FE-DASH-012 (all DASH-owned components)
- Corresponding HIST/EDGE/EVNT FE issues that export the embedded components (must be in `index.ts` of those libs)

## Tenant-context impact
None — embedded components are scoped to the active patient by their owning module.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§2 Embedded-surface rule)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-04-data-access.md` (§1 composition table)

## Architecture alignment
- ADR-005 §1: "composition over re-query" — DASH renders embedded components verbatim, never re-implements them
- Standalone + OnPush
- Tags Nx: `scope:dash`, `type:feature`

## Milestone
Wave 3 / Feature lib

## Labels
type:feature
layer:frontend
scope:dash
priority:P3

## Prioridade
P3
