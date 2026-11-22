# FE-DASH-008 -- OverviewPageComponent — smart; injects DashboardFacade; wires all embedded panels (HIST/EDGE/EVNT components); refresh on (refresh) emit

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/dash/feature-overview/src/lib/overview-page.component.ts` is a standalone `OnPush` smart component that injects `DashboardFacade`, reads its signals, passes them to presentational panels, renders embedded module components (HIST `HistoryWidgetComponent`, EDGE `EdgeDeviceCardComponent`/`DeviceStatusBadgeComponent`, EVNT `RoutineNoticeListComponent`), and calls `DashboardFacade.refresh()` on the `(refresh)` output.

## Approach (execution path)
1. Create `libs/dash/feature-overview/src/lib/overview-page.component.ts` as `@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })`.
2. Inject `DashboardFacade` (and `DashShellIntegrationService` for refresh wiring).
3. Read signals from `DashboardFacade`: `overview()`, `kpis()`, `sources()`, `headline()`, `degradedReason()`, `deviceHealth()`, `notices()`, `detectionLapse()`, `catalog()`, `suggestion()`.
4. Template:
   - Renders `OverviewHeadlineComponent` with `[overview]` input; binds `(refresh)` to `DashboardFacade.refresh()`.
   - Renders `KpiRowComponent` with `[kpis]` input.
   - Renders `DetectionLapseNoticeComponent` with `[lapse]="detectionLapse()"` input.
   - Renders EVNT's `RoutineNoticeListComponent` / `RoutineNoticeIndicatorComponent` (imported from `@neuroassist/evnt`).
   - Renders EDGE's `EdgeDeviceCardComponent` and `DeviceStatusBadgeComponent` (imported from `@neuroassist/edge`).
   - Renders HIST's `HistoryWidgetComponent` (imported from `@neuroassist/hist`) — read-only.
   - Renders `CatalogSummaryComponent` and `SuggestionCardComponent` (gated by `dash.suggestion.enabled`).
5. No patient-picker rendered (INV-6 — patient comes from shell context).
6. Create `libs/dash/feature-overview/src/lib/feature-overview.routes.ts` with the lazy-load route for `OverviewPageComponent`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-page.component.ts` standalone + OnPush
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-page.component.html` template
- [ ] `frontend/libs/dash/feature-overview/src/lib/feature-overview.routes.ts`
- [ ] All 6 signal reads from `DashboardFacade` wired to template inputs
- [ ] HIST `HistoryWidgetComponent`, EDGE `EdgeDeviceCardComponent`/`DeviceStatusBadgeComponent`, EVNT `RoutineNoticeListComponent` imported and rendered
- [ ] No patient-picker in template
- [ ] `(refresh)` output calls `DashboardFacade.refresh()`
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] Template has no `<ng-container *ngIf="patient">` patient-picker (INV-6)
- [ ] `OverviewPageComponent` calls only `DashboardFacade.refresh()` — no direct facade calls for data reads
- [ ] Embedded module components are imported from their public `index.ts` (never re-implemented)
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-006 (DashboardFacade)
- FE-DASH-009 (OverviewHeadlineComponent)
- FE-DASH-010 (KpiRowComponent)
- FE-DASH-011 (DetectionLapseNoticeComponent)
- FE-DASH-012 (CatalogSummaryComponent, SuggestionCardComponent)

## Tenant-context impact
None — patient context is shell-provided (INV-6).

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1, §3)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-04-data-access.md` (§1)

## Architecture alignment
- Standalone + OnPush + Signals
- No HTTP in this component
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
