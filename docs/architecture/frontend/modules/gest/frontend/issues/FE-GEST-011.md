# FE-GEST-011 -- RuntimeFacade — StationRuntimeVM signals, honest state management, error mapping by ProblemDetail type slug

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

## Outcome
`RuntimeFacade` exposes `runtimeVm(): Signal<StationRuntimeVM>` with honest states; `detection='running'` ONLY when `camera=granted && model=ready && tab visible && loop producing frames` — the `StationRuntimeVM` never defaults to 'watching' or 'running' when any fault is active (INV-GEST-6); errors from device-token calls are mapped by `type` slug, never by HTTP status alone.

## Approach (execution path)
1. `RuntimeFacade` holds `WritableSignal`s for `camera`, `model`, `fps`, `fpsBudget`, `paused`, `wakeLock`, `stationIdentity`.
2. Computed `detection: DetectionState`: priority order matching SPEC-03 §7 (same as `DetectionStateMapper`): `camera ∈ {denied,no-device}` → `'unavailable'`; `model=failed` → `'unavailable'`; `camera ∈ {idle,requesting}||model=loading` → `'unavailable'`; `paused=true` → `'paused'`; `fps < fpsBudget` sustained → `'degraded'`; else → `'running'`.
3. `runtimeVm()`: `computed()` composing all sub-signals into `StationRuntimeVM`.
4. Setters: `onCameraState(CameraState)`, `onModelState(ModelState)`, `onFpsUpdate(fps, budget)`, `onVisibilityChange(hidden)`, `onWakeLockChange(state)`, `onStationIdentity(state)`.
5. Errors surfaced via `AppError` (not raw HTTP body — carry-forward `fe-error-handler:raw-http-error-detail`); `detail + correlationId` preserved.
6. Spec: five detection-state transition scenarios — (a) camera=denied→unavailable; (b) model=failed→unavailable; (c) tab hidden→paused; (d) fps<budget→degraded; (e) all ok→running. Each test proves `detection` does NOT equal 'running' when the fault is active.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/runtime.facade.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/runtime.facade.spec.ts`
- [ ] `detection='running'` requires all 4 conditions true (5 spec scenarios)
- [ ] No field defaults to placeholder '0'/'' when data absent — explicitly `null` or absent (carry-forward `fe-facade:fabricated-null-fields`)
- [ ] `AppError` carries `detail + correlationId` (carry-forward `fe-facade:toast-fixed-text-discards-be-detail`)
- [ ] `reportedDetectionState` and `reportedReason` computed signals (SPEC-03 §7, used by FE-GEST-023)
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx lint gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS
- [ ] All 5 detection-state scenarios in spec

## Acceptance criteria
- [ ] 5 spec scenarios prove never-false-RUNNING (INV-GEST-6)
- [ ] No fabricated null/zero field when data absent
- [ ] `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-012 (CameraService pushes camera state)
- FE-GEST-013 (LandmarkWorker pushes model state)
- FE-GEST-016 (PerfBudgetService pushes fps/degraded)

## Tenant-context impact
None — station runtime state is per-device; no tenant PII in the VM.

## Prioridade
P2
