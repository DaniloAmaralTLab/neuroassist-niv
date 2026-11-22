# FE-DASH-009 -- OverviewHeadlineComponent — presentational; @Input overview: OverviewVM; renders all_clear | degraded | notice (NEVER emergency); (refresh) output

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`libs/dash/feature-overview/src/lib/overview-headline/overview-headline.component.ts` is a standalone `OnPush` presentational component that takes `@Input overview: OverviewVM` and renders the patient-status headline for `all_clear`, `degraded`, and `notice` states — never `emergency` (DASH applies no emergency styling; INV-3). It emits `(refresh)` when the caregiver taps the refresh trigger.

## Approach (execution path)
1. Create the component file with `@Input({ required: true }) overview: OverviewVM`.
2. Template branches:
   - `@if (overview.headline === 'loading')` → skeleton / spinner
   - `@if (overview.headline === 'all_clear')` → green "Patient is OK" headline with `patientName` and `lastCheckAt`
   - `@if (overview.headline === 'notice')` → amber headline with `degradedReason` (detection-lapse notice)
   - `@if (overview.headline === 'degraded')` → warning headline with `degradedReason` and last-check time
   - `@if (overview.headline === 'emergency')` → DO NOT render emergency styling; render nothing (or a neutral placeholder); EVNT's takeover owns the emergency surface (INV-3)
3. Add `@Output() refresh = new EventEmitter<void>()` for a "Refresh" button.
4. Use `@neuroassist/shared/ui-tokens` oklch design tokens for colors — `--color-status-ok`, `--color-status-degraded`, `--color-status-notice` (amber); never use `--color-alarm` for the DASH notice (SPEC-07, ui-tokens contract).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-headline/overview-headline.component.ts` standalone + OnPush
- [ ] `frontend/libs/dash/feature-overview/src/lib/overview-headline/overview-headline.component.html`
- [ ] `@Input({ required: true }) overview: OverviewVM` declared
- [ ] Template handles all 5 `CompositeStatus` values; `emergency` renders NO alarm styling
- [ ] `@Output() refresh = new EventEmitter<void>()`
- [ ] Colors use `@neuroassist/shared/ui-tokens` design tokens (no hardcoded hex)
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] `overview.headline === 'emergency'` does NOT render `--color-alarm` or any emergency-class element
- [ ] `overview.headline === 'notice'` uses amber token (never `--color-alarm`)
- [ ] `(refresh)` emits on user action
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-006 (DashboardFacade provides the OverviewVM type)
- FE-DASH-008 (OverviewPageComponent uses this component)

## Tenant-context impact
None — the patient name from `overview.patientName` is display-only.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md` (§2 OverviewVM, §4 CompositeStatus)

## Architecture alignment
- INV-3: emergency never faked, never hidden — DASH renders nothing over EVNT's takeover
- Standalone + OnPush
- Tags Nx: `scope:dash`, `type:feature`

## Milestone
Wave 3 / Feature lib

## Labels
type:feature
layer:frontend
scope:dash
priority:P3
safety:INV-3

## Prioridade
P3
