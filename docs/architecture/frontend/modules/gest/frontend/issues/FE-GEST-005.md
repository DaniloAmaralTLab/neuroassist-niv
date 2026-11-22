# FE-GEST-005 -- gest.bootstrap.ts — ModuleBootstrap init/destroy: catalog load, support-check, camera, model, Wake Lock, detection loop, queue flush

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/gest/src/lib/gest.bootstrap.ts` exports `gestBootstrap: ModuleBootstrap` with `init()` (verify station identity → load catalog → support-check → request camera → load landmark model → acquire Wake Lock → start detection loop only when all ready → push initial detectionState to StationLivenessPort) and `destroy()` (stop loop, terminate worker, stop every camera track, release Wake Lock, flush/persist durable report queue). `destroy()` MUST turn the camera off and persist the queue — a pending help request must survive a reload (SPEC-06 §3, INV-GEST-5).

## Approach (execution path)
1. `init(ctx)`:
   a. Verify station identity (edge.device token present and unrevoked via `StationIdentityService`); on absent/expired/revoked → route to `station-unpaired` state, stop.
   b. Load EDGE catalog (`CatalogFacade.loadCatalog()`).
   c. Run support-check (`CatalogFacade.checkSupport(engineVersion, codes)`); recompute detectable gate.
   d. `CameraService.requestCamera()`; push `camera` state to `RuntimeFacade`.
   e. `LandmarkWorkerSeam.load()`; await `model-ready` or `model-failed` message.
   f. Acquire Screen Wake Lock (`WakeLockService.acquire()`) only when `camera=granted && model=ready && tab visible`.
   g. Start detection loop via `rAF` only when `camera=granted && model=ready && !document.hidden`.
   h. Push `StationLivenessPort.setDetectionState(DetectionStateMapper.map(runtimeVm).state, reason, engineVersion)`.
   i. Register `visibilitychange` handler (passes to `WakeLockService` and `GestShellIntegrationService`).
2. `destroy(ctx)`:
   a. Stop the detection loop; terminate `LandmarkWorkerSeam`.
   b. `CameraService.stop()` — stops every `MediaStreamTrack` (camera LED off).
   c. `WakeLockService.release()`; remove `visibilitychange` handler.
   d. `ReportFacade.persistQueue()` — write pending items to durable store before unload.
   e. Clear module-local runtime/recognition signals; leave no dangling subscriptions.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/src/lib/gest.bootstrap.ts`
- [ ] `init()` verifies station identity before starting loop
- [ ] `init()` starts loop ONLY when `camera=granted && model=ready && !document.hidden`
- [ ] `destroy()` calls `CameraService.stop()` to stop every `MediaStreamTrack`
- [ ] `destroy()` calls `ReportFacade.persistQueue()` (pending reports survive reload)
- [ ] `StationLivenessPort.setDetectionState` called on every runtime-state change in init
- [ ] Wake Lock acquired in init; released in destroy
- [ ] `npx nx lint gest` PASS
- [ ] `npx nx build gest` PASS

## Acceptance criteria
- [ ] `destroy()` stops every camera track — camera off after teardown
- [ ] `init()` does NOT start loop when camera is denied or model failed
- [ ] Pending queue survives reload (persisted in `destroy()`)
- [ ] `npx nx build gest` PASS

## Dependencies
- FE-GEST-009 (ReportFacade)
- FE-GEST-010 (CatalogFacade)
- FE-GEST-011 (RuntimeFacade)
- FE-GEST-012 (CameraService)
- FE-GEST-021 (GestShellIntegrationService — wires StationLivenessPort)
- FE-GEST-022 (WakeLockService)
- FE-GEST-024 (stationIdentityGuard / StationIdentityService)

## Tenant-context impact
None — bootstrap operates on station identity (edge.device), no tenant session.

## Prioridade
P1
