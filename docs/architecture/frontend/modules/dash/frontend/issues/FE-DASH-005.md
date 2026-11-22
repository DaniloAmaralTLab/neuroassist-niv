# FE-DASH-005 -- DASH freshness constants — DASH_EDGE_HEARTBEAT_STALE_MS, DASH_HIST_SUMMARY_TTL_MS, DASH_PAT_TTL_MS, DASH_EVNT_FRESH_FACTOR, EDGE_LAPSE_WINDOW_MS (pinned per SPEC-03 §3)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`libs/dash/src/lib/dash.constants.ts` pins the five freshness thresholds defined in SPEC-03 §3 as named, exported constants — the building blocks of the fail-safe `CompositeStatus` derivation in `DashboardFacade` (FE-DASH-006). These constants are the ONLY place these values appear; `DashboardFacade` imports and uses them, never inlines them.

## Approach (execution path)
1. Create `libs/dash/src/lib/dash.constants.ts`.
2. Define and export:
   - `DASH_EDGE_HEARTBEAT_STALE_MS = 60_000` — 2 × 30 s heartbeat cadence (EDGE SPEC-06)
   - `DASH_HIST_SUMMARY_TTL_MS = 60_000` — HIST summary freshness window
   - `DASH_PAT_TTL_MS = 300_000` — PAT identity freshness (5 min; low-volatility)
   - `DASH_EVNT_FRESH_FACTOR = 2` — multiplied by server-advertised `pollIntervalSeconds` (not stored here; adopted at runtime from EVNT's `MonitoringVM.pollIntervalSeconds`)
   - `EDGE_LAPSE_WINDOW_MS = 120_000` — server-owned lapse threshold (referenced for copy, never a DASH timer; EDGE ADR-005)
3. Add TSDoc comments citing SPEC-03 §3 and the owning module for each constant.
4. Export from `libs/dash/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/dash.constants.ts` created
- [ ] `DASH_EDGE_HEARTBEAT_STALE_MS = 60_000` with TSDoc citing EDGE heartbeat cadence
- [ ] `DASH_HIST_SUMMARY_TTL_MS = 60_000` with TSDoc citing HIST read-on-navigation pattern
- [ ] `DASH_PAT_TTL_MS = 300_000` with TSDoc citing PAT low-volatility identity
- [ ] `DASH_EVNT_FRESH_FACTOR = 2` with TSDoc noting it multiplies EVNT's server-advertised interval at runtime
- [ ] `EDGE_LAPSE_WINDOW_MS = 120_000` with TSDoc: server-owned; DASH reads for copy only, never starts a timer
- [ ] All constants re-exported from `libs/dash/src/index.ts`

## Acceptance criteria
- [ ] All 5 constants exported and match SPEC-03 §3 exactly
- [ ] `DashboardFacade` (FE-DASH-006) imports these constants — no inline magic numbers
- [ ] `npx nx build dash` PASS

## Dependencies
Nenhuma (pure constants, no imports from other DASH files).

## Tenant-context impact
None — global constants, tenant-agnostic.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md` (§3 — Freshness thresholds)

## Architecture alignment
- SAFETY anchor: `all_clear` derivation in `DashboardFacade` depends on these thresholds — a wrong value silently changes the safety invariant (INV-1)
- Tags Nx: `scope:dash`, `type:domain`

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:dash
priority:P1
safety:INV-1

## Prioridade
P1
