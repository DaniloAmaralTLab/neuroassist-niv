# FE-DASH-012 -- CatalogSummaryComponent + SuggestionCardComponent — presentational; dash.suggestion.enabled gate; (confirm)/(ignore) emit; '/calibration' outbound link

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`CatalogSummaryComponent` renders the patient's command catalog summary (command label + urgency badge, with a `/calibration` outbound link to PAT); `SuggestionCardComponent` renders the inline advisory card when `dash.suggestion.enabled` is on and a suggestion is available. Both are standalone `OnPush` presentational components.

## Approach (execution path)
1. Create `catalog-summary.component.ts` with `@Input({ required: true }) catalog: CatalogSummaryVM`:
   - Renders a list of `{ label, urgency }` command rows.
   - Urgency badge: `emergency` → red badge; `routine` → grey badge (use design token).
   - "Manage catalog" link: `routerLink="/calibration"` (PAT-owned route, outbound per SPEC-01 §2).
   - Renders nothing when `catalog.commands.length === 0` (empty-state handled in FE-DASH-020).
2. Create `suggestion-card.component.ts` with `@Input() suggestion: SuggestionVM | null = null`:
   - Renders nothing when `suggestion === null` OR when `dash.suggestion.enabled` is off.
   - Shows advisory text (`suggestion.message`), `kind: 'advisory'` label.
   - Two buttons: `@Output() confirm = new EventEmitter<void>()` and `@Output() ignore = new EventEmitter<void>()`.
   - On confirm/ignore: emit → `OverviewPageComponent` logs to `@neuroassist/shared/observability` (audit log only, never self-executing — INV-5).
3. `SuggestionCardComponent` MUST NOT trigger any PAT or HIST write; it is display + audit only (INV-5).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/feature-overview/src/lib/catalog-summary/catalog-summary.component.ts` standalone + OnPush
- [ ] `frontend/libs/dash/feature-overview/src/lib/catalog-summary/catalog-summary.component.html` with `/calibration` routerLink
- [ ] `frontend/libs/dash/feature-overview/src/lib/suggestion-card/suggestion-card.component.ts` standalone + OnPush
- [ ] `frontend/libs/dash/feature-overview/src/lib/suggestion-card/suggestion-card.component.html`
- [ ] `SuggestionCardComponent` renders nothing when `suggestion === null`
- [ ] `(confirm)` and `(ignore)` outputs only log to observability — no data writes
- [ ] "Manage catalog" link is a `routerLink` to `/calibration` (PAT-owned, never a DASH route)
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] `SuggestionCardComponent` with `suggestion = null` renders nothing
- [ ] `(confirm)` / `(ignore)` on `SuggestionCardComponent` does NOT call any service write
- [ ] "Manage catalog" link navigates to `/calibration` (PAT-owned)
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-006 (DashboardFacade provides `CatalogSummaryVM` and `SuggestionVM`)
- FE-DASH-008 (OverviewPageComponent renders both components)
- FE-DASH-021 (observability — confirm/ignore events forwarded via telemetry)

## Tenant-context impact
None — command catalog is scoped to the active patient by PAT.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1 CatalogSummaryComponent, SuggestionCardComponent)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md` (§2 CatalogSummaryVM, SuggestionVM)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-05-tool-contract.md` (§3 feature flags)

## Architecture alignment
- INV-5: SuggestionCardComponent is inert; never self-executing
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
