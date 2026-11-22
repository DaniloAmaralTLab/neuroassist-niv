# FE-DASH-010 -- KpiRowComponent — presentational; @Input kpis: KpiVM; renders '—' (never 0) for any null KPI (INV-4 / SAFETY-DASH)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`libs/dash/feature-overview/src/lib/kpi-row/kpi-row.component.ts` is a standalone `OnPush` presentational component that takes `@Input kpis: KpiVM` and renders the three day KPIs (`eventsToday`, `confirmedToday`, `pendingToday`), displaying the em dash character `"—"` (not `"0"`) for any null value — SAFETY invariant INV-4.

## Approach (execution path)
1. Create `kpi-row.component.ts` with `@Input({ required: true }) kpis: KpiVM`.
2. Template: render three tiles — "Events today", "Confirmed", "Pending".
3. For each value: `{{ kpis.eventsToday !== null ? kpis.eventsToday : '—' }}` — using `'—'` (U+2014 em dash), never `'0'`.
4. Add a `formatKpi(val: number | null): string` pure function (or pipe) used consistently for all three values to avoid per-field duplication.
5. Visual: tiles are hidden (not shown as 0) when their source (`hist`) is not `ok` per SPEC-05 §4; `KpiVM` nulls signal this. No separate loading skeleton here (handled by `OverviewPageComponent`'s loading state).
6. Unit test: `kpis.eventsToday = null` renders `'—'`; `kpis.eventsToday = 0` renders `'0'` (a real zero is valid — a known-zero event count is `0`, not `null`).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/kpi-row/kpi-row.component.ts` standalone + OnPush
- [ ] `frontend/libs/dash/feature-overview/src/lib/kpi-row/kpi-row.component.html`
- [ ] `@Input({ required: true }) kpis: KpiVM` declared
- [ ] `null` renders as `'—'` (em dash U+2014) for all three KPI values
- [ ] `0` renders as `'0'` (zero IS a valid event count — INV-4 is about unknown, not zero)
- [ ] `formatKpi` function/pipe used consistently (no inline ternary duplication)
- [ ] Unit test: null → `'—'`, 0 → `'0'`, 5 → `'5'`
- [ ] `npx nx test dash` PASS

## Acceptance criteria
- [ ] `kpis.eventsToday === null` renders `'—'` (em dash), never `'0'`
- [ ] `kpis.eventsToday === 0` renders `'0'` (a zero is legitimate — do not hide it)
- [ ] `npx nx test dash` PASS (unit test for null/zero/positive)

## Dependencies
- FE-DASH-006 (DashboardFacade defines KpiVM type and derives KPIs)
- FE-DASH-008 (OverviewPageComponent passes `[kpis]` to this component)

## Tenant-context impact
None — KPI counts are scoped to the active patient by the HIST seam.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md` (§2 KpiVM)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1 KpiRowComponent)

## Architecture alignment
- INV-4 (honest KPIs): `"—"` not `0` for a KPI whose source is not `ok`
- Standalone + OnPush
- Tags Nx: `scope:dash`, `type:feature`

## Milestone
Wave 3 / Feature lib

## Labels
type:feature
layer:frontend
scope:dash
priority:P3
safety:INV-4

## Prioridade
P3
