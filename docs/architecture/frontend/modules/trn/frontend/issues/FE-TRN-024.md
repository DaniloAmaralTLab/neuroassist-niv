# FE-TRN-024 -- Breadcrumb state + nav config ([Home, Training] and [Home, Training, Patient assent])

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`trn.nav.config.ts` exports the breadcrumb configuration for both TRN routes, delivering `[Home, Training]` for `/training` and `[Home, Training, Patient assent]` for `/training/assent`, wired via the route `data.breadcrumb` field.

## Context / Problem statement
- SPEC-01 §1: breadcrumb for `/training` is `[Home, Training]`; for `/training/assent` is `[Home, Training, Patient assent]`.
- Breadcrumb data flows from route `data.breadcrumb` to the Shell's breadcrumb service.
- No separate breadcrumb state management needed if the route data approach is used (route data is sufficient).

## Approach (execution path)
1. Confirm that `TRN_ROUTES` already carries `data: { breadcrumb: 'Training' }` and `data: { breadcrumb: 'Patient assent' }` per FE-TRN-002.
2. Create `libs/trn/src/lib/trn.nav.config.ts` exporting breadcrumb path constants if the Shell's breadcrumb service requires a static config (depends on Shell's pattern — align with how other modules (PAT, ACS) handle breadcrumbs).
3. Ensure the Shell breadcrumb service picks up `[Home, Training]` for the `/training` route and `[Home, Training, Patient assent]` for the assent sub-route.

## Non-goals
- No custom breadcrumb state management beyond the route data convention.

## Layer(s)
frontend / Tool entry (`libs/trn/src/lib/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-01-route-map.md` (§1 — Breadcrumb column)

## Architecture alignment
- Route data breadcrumb pattern (convention shared with PAT, ACS, EDGE)
- Standalone + OnPush (applied to parent, not this config file)

## Implementation checklist (by layer/file)

- 🔲 `libs/trn/src/lib/trn.nav.config.ts` — breadcrumb path constants
- 🔲 Verify TRN_ROUTES data.breadcrumb is set in FE-TRN-002
- 🔲 Unit test: breadcrumb path for `/training/assent` resolves to `[Home, Training, Patient assent]`

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 6 / Navigation

## Labels
type:feature
layer:frontend
scope:trn
priority:P6

## Acceptance criteria
- Navigating to `/training` renders breadcrumb `[Home, Training]`.
- Navigating to `/training/assent` renders breadcrumb `[Home, Training, Patient assent]`.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-002 (TRN_ROUTES with breadcrumb data)

## Data impact
- None — static nav configuration.

## API / Contract impact
- None.

## Testing / Evidence required
- Unit test: breadcrumb path resolution for the assent sub-route.

## Risks / Notes
- If the Shell breadcrumb service has a different registration pattern, align with that before authoring `trn.nav.config.ts`.
