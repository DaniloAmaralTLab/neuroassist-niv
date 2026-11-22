# FE-DASH-018 -- Loading skeletons — OverviewPageComponent loading state while headline='loading' (any source loading); per-panel skeleton while source loading (SPEC-07 §4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`OverviewPageComponent` renders a loading skeleton (not a spinner-only) while the composite headline is `'loading'` (any source still in first-load); each embedded panel also renders a per-panel skeleton while its source is loading — so the page never shows a blank viewport on first load.

## Approach (execution path)
1. Create `libs/dash/feature-overview/src/lib/overview-skeleton/overview-skeleton.component.ts` (standalone, OnPush): a CSS skeleton layout matching the overview page structure (headline area, 3 KPI tiles, device card area, recent-events area, catalog summary area).
2. In `OverviewPageComponent` template:
   - `@if (overview().headline === 'loading')` → render `<dash-overview-skeleton />`
   - `@else` → render the full layout with real data (guards each panel individually for per-panel skeletons)
3. Per-panel loading state: when a specific source is `loading` (e.g. `sources().hist === 'loading'`), render a skeleton tile in place of `KpiRowComponent` and `HistoryWidgetComponent`. When `sources().edge === 'loading'`, render a skeleton card in place of `EdgeDeviceCardComponent`.
4. Use CSS animation `@keyframes` with `--color-surface-skeleton` design token; no external library.
5. The loading state MUST NOT show `all_clear` (INV-1) — this is guaranteed by the `DashboardFacade` `loading` branch, but the template must not short-circuit it.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-skeleton/overview-skeleton.component.ts` created
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-skeleton/overview-skeleton.component.html` skeleton layout
- [ ] `OverviewPageComponent` template: `@if (loading)` → skeleton; `@else` → real layout
- [ ] Per-panel skeletons for KPI row, device card, recent-events area
- [ ] Skeleton uses `--color-surface-skeleton` token (no hardcoded grey hex)
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] First load with all sources in `loading` state renders skeleton, not blank page
- [ ] `headline === 'loading'` does NOT render the `all_clear` headline (INV-1)
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-006 (DashboardFacade `composite heading` and per-source `sources()`)
- FE-DASH-008 (OverviewPageComponent template)

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-07-error-handling.md` (§4 toast/banner/modal rule)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md` (§4 `loading` rule)

## Architecture alignment
- INV-1: loading holds headline, NEVER `all_clear`
- Standalone + OnPush
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
