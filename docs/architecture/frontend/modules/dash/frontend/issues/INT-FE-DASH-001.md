# INT-FE-DASH-001 -- INT-DASH-1: Consume LapseAlertFacade from @neuroassist/evnt — wire DetectionLapseNoticeComponent + DashboardFacade detectionLapse signal; depends on FE-EVNT-027/028 + FE-EDGE-028/029

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`DashboardFacade.detectionLapse: Signal<NoticeVM | null>` is wired to the EVNT `LapseAlertFacade.openDetectionLapses` signal (exported from `@neuroassist/evnt` by FE-EVNT-027/028), and `DetectionLapseNoticeComponent` correctly reflects the live lapse state. Until this INT lands, `detectionLapse` defaults to `null` (stopgap: headline stays `degraded` if the HIST timeline has an open lapse entry — per SPEC-04 §4).

## Context / Problem statement
- EVNT's `index.ts` exports `AlarmFacade` and `RoutineNotice*Component` but **no open-lapse signal** (verified SPEC-04 §4). The lapse exists only as a historical `DetectionLapseStarted` entry in HIST.
- `LapseAlertFacade` is planned by FE-EVNT-027 (facade + authority `evnt.detection-lapse.read`) and FE-EVNT-028 (EDGE detection fields), and FE-EDGE-028/029 (edge detection state fields). INT-DASH-1 consumes those — it does NOT add a parallel export.
- Bloqueia: FE-DASH-011 (full amber notice), FE-DASH-025 (E2E lapse scenario)
- Depends on: FE-EVNT-027, FE-EVNT-028, FE-EDGE-028, FE-EDGE-029 (must be in `@neuroassist/evnt` and `@neuroassist/edge` `index.ts`)

## Approach (execution path)
1. Verify `LapseAlertFacade` is exported from `@neuroassist/evnt` `index.ts` (FE-EVNT-027/028 must be done).
2. Verify `detectionState: Signal<'running' | 'lapsed' | 'unknown'>` is available from `LapseAlertFacade`.
3. In `DashboardFacade`:
   - Inject `LapseAlertFacade` from `@neuroassist/evnt`.
   - Replace the stopgap null with: `detectionLapse = computed(() => lapseAlertFacade.openDetectionLapses().length > 0 ? { message: 'Device online but no gesture detected ...' } : null)`.
4. Update `DashboardFacade.sources()` to derive EVNT detection-lapse `SourceHealth` from `LapseAlertFacade.detectionState()`:
   - `'running'` + source `ok` → headline `notice` (not `degraded`, not `all_clear`)
   - `'lapsed'` → open lapse → `notice` branch
   - `'unknown'` → `unknown` SourceHealth → `degraded`
5. `DetectionLapseNoticeComponent` now shows the amber notice when `detectionLapse()` is non-null.
6. Remove the stopgap HIST-timeline-based lapse derivation from `DashboardFacade`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/data-access/dashboard.facade.ts` — inject `LapseAlertFacade`, wire `detectionLapse` signal
- [ ] `frontend/libs/dash/feature-overview/src/lib/detection-lapse-notice/detection-lapse-notice.component.ts` — renders correctly with real lapse signal
- [ ] Stopgap HIST-timeline derivation removed from `DashboardFacade`
- [ ] `SourceHealth` for `evnt.detection-lapse.read` derived from `LapseAlertFacade.detectionState()`
- [ ] `npx nx test dash` PASS (updated unit tests)
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS
- [ ] `npx nx run dash-e2e:e2e` PASS for `detection-lapse-notice.spec.ts`

## Acceptance criteria
- [ ] `DashboardFacade.detectionLapse()` is non-null when EVNT reports an open lapse (integration test)
- [ ] Detection lapse → headline `notice` (amber), never `all_clear`, never `emergency`
- [ ] No stopgap HIST-timeline derivation remains

## Dependencies
- **FE-EVNT-027** (LapseAlertFacade — EVNT must export this before INT-DASH-1 can proceed)
- **FE-EVNT-028** (EVNT detection-lapse read endpoint wiring)
- **FE-EDGE-028** (EDGE detection-state field)
- **FE-EDGE-029** (EDGE detection-fields in DeviceFacade)
- FE-DASH-006 (DashboardFacade stopgap to replace)
- FE-DASH-011 (DetectionLapseNoticeComponent)

## Tenant-context impact
None — lapse state is scoped to the active patient by EVNT.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-04-data-access.md` (§4 INT-DASH-1)
- `docs/architecture/frontend/modules/dash/frontend/contracts/backend-api-cross-link.md` (§3 INT-DASH-1)

## Architecture alignment
- INT-DASH-1 consumes FE-EVNT-027/028 and FE-EDGE-028/029; it does NOT add a parallel export
- Authority: `evnt.detection-lapse.read` (EVNT-owned, SPEC-05 §2)
- Tags Nx: `scope:dash`, `type:data-access`

## Milestone
Wave 4 / Hub integrations

## Labels
type:integration
layer:frontend
scope:dash
priority:P4
safety:INV-1,SAFETY-GEST-1

## Prioridade
P4
