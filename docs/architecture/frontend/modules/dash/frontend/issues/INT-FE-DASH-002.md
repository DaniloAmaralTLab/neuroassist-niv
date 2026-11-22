# INT-FE-DASH-002 -- INT-DASH-2 (optional): Consume PeriodSummaryVM.loadedAt from @neuroassist/hist — wire histReadAt freshness in DashboardFacade to upstream read-time; depends on HIST INT-DASH-2 export

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`DashboardFacade` reads HIST's upstream `loadedAt` timestamp from `PeriodSummaryVM.loadedAt` (exported by `@neuroassist/hist` as a result of INT-DASH-2 on the HIST side) instead of tracking its own `histReadAt` local tick, eliminating the slight clock drift between DASH's local timestamp and HIST's actual read time. This is an **optional** improvement — `DashboardFacade` works correctly without it (using its own local tick).

## Context / Problem statement
- HIST exposes `PeriodSummaryVM` but no `loadedAt` timestamp (SPEC-03 §3; SPEC-04 §4 INT-DASH-2).
- `DashboardFacade` currently derives HIST freshness by tracking `histReadAt` locally (the moment DASH received the HIST response, not the moment HIST actually read from the DB).
- If HIST exports `loadedAt`, the freshness computation becomes more accurate (HIST's own read-time).
- Blocking: false — the stopgap (local tick) is functionally correct; this is a precision improvement.

## Approach (execution path)
1. Verify `PeriodSummaryVM.loadedAt: string` (ISO timestamp) is exported from `@neuroassist/hist` `index.ts` (HIST INT-DASH-2 must be completed first).
2. In `DashboardFacade`:
   - Replace the local `histReadAt = Date.now()` tracking with `periodSummary.loadedAt` from the HIST signal.
   - Freshness check: `now - new Date(periodSummary.loadedAt).getTime() <= DASH_HIST_SUMMARY_TTL_MS`.
3. Remove the local `histReadAt` tracking variable.
4. Update unit tests in `composite-status.util.spec.ts` to pass `loadedAt` directly.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/data-access/dashboard.facade.ts` — replace local `histReadAt` with `periodSummary.loadedAt`
- [ ] Local `histReadAt` tracking variable removed
- [ ] Freshness check uses `periodSummary.loadedAt` (ISO string → ms conversion)
- [ ] `composite-status.util.spec.ts` updated to use `loadedAt` parameter
- [ ] `npx nx test dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] No `histReadAt = Date.now()` local variable in `DashboardFacade` after this INT lands
- [ ] HIST freshness check uses `PeriodSummaryVM.loadedAt`
- [ ] `npx nx test dash` PASS

## Dependencies
- **INT-DASH-2 on the HIST side** (HIST must export `PeriodSummaryVM.loadedAt` from `@neuroassist/hist` `index.ts`) — if HIST never implements this, skip this INT issue
- FE-DASH-006 (DashboardFacade — the stopgap to replace)

## Tenant-context impact
None — timestamps are scoped to the active patient's HIST summary.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-04-data-access.md` (§4 INT-DASH-2)
- `docs/architecture/frontend/modules/dash/frontend/contracts/backend-api-cross-link.md` (§3 INT-DASH-2)

## Architecture alignment
- Optional / nice-to-have; skip if HIST INT-DASH-2 is never implemented
- Authority unchanged: `hist.history.read`
- Tags Nx: `scope:dash`, `type:data-access`

## Milestone
Wave 4 / Hub integrations

## Labels
type:integration
layer:frontend
scope:dash
priority:P4

## Prioridade
P4
