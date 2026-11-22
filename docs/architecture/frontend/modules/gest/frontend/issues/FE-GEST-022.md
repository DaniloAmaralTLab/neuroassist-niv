# FE-GEST-022 -- Wake Lock + kiosk/foreground — acquire/re-acquire on visibilitychange, keepalive beat on hidden (SPEC-09 §2.1–§2.2)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`WakeLockService` acquires a Screen Wake Lock (`navigator.wakeLock.request('screen')`) when detection starts; re-acquires on `visibilitychange → visible`; on `visibilitychange → hidden` immediately sets `detection=PAUSED/HIDDEN` and calls `StationLivenessPort.beatNow()` — `libs/edge` sends this final beat with `fetch({keepalive:true})` so it survives the tab being backgrounded; unsupported browser → `wakeLock='unsupported'`, never throws (graceful).

## Approach (execution path)
1. `WakeLockService.acquire()`: `navigator.wakeLock.request('screen')` → `wakeLock='held'`; on release-by-browser → `wakeLock='released'`; on unsupported (TypeError / absent API) → `wakeLock='unsupported'`.
2. Register `visibilitychange` listener in `gestBootstrap.init()`:
   - `hidden` → `RuntimeFacade.onVisibilityChange(true)` → `detection='paused'`; `StationLivenessPort.setDetectionState(PAUSED, HIDDEN, engineVersion)` + `StationLivenessPort.beatNow()`.
   - `visible` → `RuntimeFacade.onVisibilityChange(false)` → re-acquire Wake Lock; resume detection loop.
3. `WakeLockService.release()`: release the lock sentinel; set `wakeLock='released'`.
4. `keepalive: true` on the hidden-transition beat is `libs/edge`'s responsibility (via `StationLivenessPort.beatNow()`); GEST only calls `beatNow()`.
5. Spec: (a) `acquire()` called on `camera=granted && model=ready`; (b) re-acquire after `visibilitychange → visible`; (c) `beatNow()` called on `visibilitychange → hidden`; (d) unsupported → `wakeLock='unsupported'`, no throw.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/integration/src/lib/wake-lock.service.ts`
- [ ] implementar `frontend/libs/gest/integration/src/lib/visibility-handler.ts`
- [ ] `acquire()` called on detection start (`camera=granted && model=ready && tab visible`)
- [ ] Re-acquire on `visibilitychange → visible` spec
- [ ] `beatNow()` called synchronously on `visibilitychange → hidden` before tab suspends
- [ ] Unsupported browser → `wakeLock='unsupported'`, never throws
- [ ] `wakeLock` state surfaced in `StationRuntimeVM`
- [ ] `npx nx test gest-integration` PASS
- [ ] `npx nx build gest-integration` PASS

## Acceptance criteria
- [ ] Re-acquire on visibility return spec-verified
- [ ] `beatNow()` called on hidden — SAFETY-GEST-1 keepalive path
- [ ] Unsupported browser graceful (`wakeLock='unsupported'`)
- [ ] `npx nx test gest-integration` PASS

## Dependencies
- FE-GEST-021 (GestShellIntegrationService — provides StationLivenessPort ref for beatNow)
- FE-GEST-011 (RuntimeFacade — wakeLock signal)

## Tenant-context impact
None — OS-level resource; no tenant data.

## Prioridade
P5
