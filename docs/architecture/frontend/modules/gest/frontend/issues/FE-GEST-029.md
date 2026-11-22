# FE-GEST-029 -- e2e: station-identity-and-runtime + station-detection-liveness (SAFETY-GEST-1 e2e, Playwright)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
Two Playwright e2e specs covering identity guard and liveness: `station-identity-and-runtime.spec.ts` asserts the guard redirects on expired/absent device token; `station-detection-liveness.spec.ts` asserts `setDetectionState + beatNow` are called on every RUNNING→PAUSED and PAUSED→RUNNING transition (SAFETY-GEST-1 e2e proof).

## Approach (execution path)
1. `station-identity-and-runtime.spec.ts`:
   - Case A: mock `EdgeIdentityService.validateDeviceToken()` → `{valid:false, reason:'ABSENT'}` → navigate `/station/runtime` → assert redirect to `/station/status?unpaired=true`.
   - Case B: mock → `{valid:true}` → navigate `/station/runtime` → assert `StationRuntimePageComponent` renders (not redirected).
   - Case C: expire token mid-session (re-mock service) → assert `StationIdentityNoticeComponent.unpaired=true` renders.
2. `station-detection-liveness.spec.ts` (SAFETY-GEST-1 e2e):
   - Spy on `StationLivenessPort.setDetectionState` and `beatNow` using test harness injection.
   - Start runtime: `camera=granted, model=ready` → assert `setDetectionState(RUNNING, ...)` + `beatNow()` called.
   - Fire `visibilitychange → hidden` → assert `setDetectionState(PAUSED, HIDDEN, ...)` + `beatNow()` called (keepalive beat).
   - Fire `visibilitychange → visible` → assert `setDetectionState(RUNNING, ...)` + `beatNow()` called.
3. Both in `apps/gest-e2e/src/e2e/`.

## Implementation checklist (by layer/file)
- [ ] implementar `apps/gest-e2e/src/e2e/station-identity-and-runtime.spec.ts`
- [ ] implementar `apps/gest-e2e/src/e2e/station-detection-liveness.spec.ts`
- [ ] Identity: absent token → redirect to `/station/status?unpaired=true`
- [ ] Identity: valid token → page renders without redirect
- [ ] Liveness: RUNNING→PAUSED transition → `setDetectionState(PAUSED,HIDDEN) + beatNow()` called
- [ ] Liveness: PAUSED→RUNNING transition → `setDetectionState(RUNNING) + beatNow()` called
- [ ] Uses `NoOpStationLivenessPort` spy in test harness
- [ ] `npx nx e2e gest-e2e` PASS

## Acceptance criteria
- [ ] Identity guard redirect assertion PASS
- [ ] SAFETY-GEST-1 liveness transitions asserted in e2e (RUNNING/PAUSED/RUNNING cycle)
- [ ] `npx nx e2e gest-e2e` PASS

## Dependencies
- FE-GEST-002 (gest.routes.ts — guard registration)
- FE-GEST-021 (GestShellIntegrationService — liveness wiring)
- FE-GEST-022 (WakeLockService / visibility handler)
- FE-GEST-024 (stationIdentityGuard)

## Tenant-context impact
None — station identity e2e; no patient data.

## Prioridade
P6
