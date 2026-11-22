# FE-DASH-006 -- DashboardFacade — aggregator of HIST/EVNT/EDGE/PAT signals; fail-safe CompositeStatus derivation; no HttpClient; em-dash KPIs; emergency defer

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/14 itens

## Outcome
`libs/dash/src/lib/data-access/dashboard.facade.ts` is authored as an `@Injectable({ providedIn: 'root' })` service that aggregates the read-only signals from HIST/EVNT/EDGE/PAT into the view-models consumed by `OverviewPageComponent`, implementing the fail-safe composite status derivation from SPEC-03 §4 — the central safety invariant of the DASH module. No `HttpClient`; no DASH-owned timer.

## Approach (execution path)
1. Create `libs/dash/src/lib/data-access/dashboard.facade.ts`.
2. Inject (constructor DI): `HistShellIntegrationService`, `AlarmFacade` (EVNT), `DeviceFacade` (EDGE), `CommandFacade` (PAT), `PatientFacade` (PAT). Do NOT inject `HttpClient`.
3. Implement `CompositeStatus` derivation as a `computed()` signal using the freshness constants from `dash.constants.ts`:
   - `loading` while ANY source ∈ `{loading}` — headline held, NEVER `all_clear`
   - `all_clear` IFF EVERY source is `'ok'` AND fresh AND affirmatively clear (INV-1 / SAFETY-DASH-1)
   - `notice` when every source ok+fresh but EVNT routine-notice OR open detection-lapse is active (`evnt.detection-lapse.read` authority — amber, never `emergency`)
   - `degraded` when ANY source ∈ `{loading→expired, empty, stale, unknown, error}` — "cannot confirm"
   - `emergency` defers to EVNT (never styled or suppressed by DASH — INV-3); DASH composite only marks it as `'emergency'` and the template renders nothing over EVNT's takeover
4. Implement per-source freshness gating using the constants:
   - EVNT: `PollingState == 'live'` AND `now - lastPolledAt ≤ DASH_EVNT_FRESH_FACTOR × pollIntervalSeconds × 1000`
   - EDGE: `now - lastHeartbeatAt ≤ DASH_EDGE_HEARTBEAT_STALE_MS`
   - HIST: `now - histReadAt ≤ DASH_HIST_SUMMARY_TTL_MS`
   - PAT: `now - patReadAt ≤ DASH_PAT_TTL_MS`; `empty` (no patient) → `degraded`
5. Expose signals: `overview: Signal<OverviewVM>`, `kpis: Signal<KpiVM>`, `sources: Signal<Record<SourceKey, SourceHealth>>`, `deviceHealth: Signal<DeviceHealthVM>`, `notices: Signal<NoticeVM>`, `detectionLapse: Signal<NoticeVM | null>`, `catalog: Signal<CatalogSummaryVM>`, `suggestion: Signal<SuggestionVM | null>`.
6. `KpiVM.eventsToday` / `confirmedToday` / `pendingToday` = `null` (renders as `"—"`) when HIST source is not `ok` — NEVER `0` (INV-4).
7. Expose `refresh(): void` that asks each composed facade to re-read; DASH adds no optimistic layer.
8. Create `libs/dash/src/lib/data-access/composite-status.util.ts` with the pure `deriveCompositeStatus(sources, evntState)` function (testable in isolation).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/data-access/dashboard.facade.ts` created (`@Injectable providedIn: 'root'`)
- [ ] No `HttpClient` injection in this facade
- [ ] No `setInterval` / `timer()` / `interval()` in this facade
- [ ] `CompositeStatus` derivation implemented as `computed()` using `dash.constants.ts` values
- [ ] `all_clear` branch ONLY when EVERY source is `ok` AND fresh (INV-1)
- [ ] `KpiVM` nulls for HIST not-ok (renders `"—"`, never `0`) (INV-4)
- [ ] `emergency` branch only marks status and does NOT render alarm UI (INV-3)
- [ ] `detectionLapse: Signal<NoticeVM | null>` exposed (wired to INT-DASH-1 in INT-FE-DASH-001)
- [ ] `refresh()` method fans out to all composed facades
- [ ] `composite-status.util.ts` pure function exported and unit-tested
- [ ] `npx nx test dash` PASS (unit tests for composite-status derivation)
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS
- [ ] All view-model signals match SPEC-03 §2 field names exactly

## Acceptance criteria
- [ ] `deriveCompositeStatus` unit test: returns `all_clear` only when every source is `ok+fresh`; returns `degraded` for any non-ok source; `notice` for ok+fresh but lapse open; `loading` while any loading
- [ ] `KpiVM.eventsToday` is `null` (not `0`) when HIST is not `ok`
- [ ] `emergency` state does NOT trigger DASH alarm rendering
- [ ] `npx nx test dash` PASS

## Dependencies
- FE-DASH-005 (freshness constants)
- FE-DASH-007 (DashShellIntegrationService — provides HIST/EVNT/EDGE/PAT seams)
- INT-FE-DASH-001 (LapseAlertFacade — until it lands, `detectionLapse` defaults to `null`)

## Tenant-context impact
None — `DashboardFacade` reads from composed facades that already carry the tenant context via the ACS JWT interceptor.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-03-view-models.md` (§1–§4)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-04-data-access.md` (§1–§3)
- `docs/architecture/frontend/modules/dash/frontend/adr/ADR-005-composition-host-and-fail-safe-overview.md`

## Architecture alignment
- SAFETY-DASH-1 (INV-1): `all_clear` only when every source ok+fresh — the contrapositive is the law
- INV-3: emergency never faked, never hidden
- INV-4: `"—"` not `0` for failed KPIs
- Signals-based (`computed()`); no NgRx; no `BehaviorSubject`
- Tags Nx: `scope:dash`, `type:data-access`

## Milestone
Wave 2 / Composition wiring

## Labels
type:feature
layer:frontend
scope:dash
priority:P2
safety:INV-1,INV-3,INV-4

## Prioridade
P2
