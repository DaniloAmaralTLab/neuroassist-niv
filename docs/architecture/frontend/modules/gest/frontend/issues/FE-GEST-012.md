# FE-GEST-012 -- CameraService — getUserMedia lifecycle (idle/requesting/granted/denied/no-device), MediaStream teardown, honest camera state

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`CameraService` manages the `getUserMedia` lifecycle with explicit `CameraState` transitions; on teardown `stop()` stops every `MediaStreamTrack` so the camera LED turns off and no stream leaks into the detection worker (privacy teardown, INV-GEST-4). The service lives in `libs/gest/detection` (`type:domain`).

## Approach (execution path)
1. `CameraService.requestCamera(constraints?: MediaStreamConstraints)`: call `navigator.mediaDevices.getUserMedia({video:{facingMode:'user',...}})`; on success → `camera='granted'`, store stream; `NotAllowedError` → `camera='denied'`; `NotFoundError` / `OverconstrainedError` → `camera='no-device'`.
2. `currentState: Signal<CameraState>` exposed as readonly signal (initial: `'idle'`; on request start: `'requesting'`).
3. `getStream(): MediaStream | null` for operator preview and worker binding.
4. `stop()`: call `.getTracks().forEach(t => t.stop())` on the active stream; set `camera='idle'`.
5. `constrainResolution(width: number, height: number)`: apply via `MediaStreamTrack.applyConstraints()` for perf-budget downscale (FE-GEST-016).
6. Spec: mock `navigator.mediaDevices.getUserMedia`; verify transitions for all 5 states; verify `stop()` calls `MediaStreamTrack.stop()`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/detection/src/lib/camera.service.ts`
- [ ] implementar `frontend/libs/gest/detection/src/lib/camera.service.spec.ts`
- [ ] All 5 `CameraState` values covered (idle/requesting/granted/denied/no-device)
- [ ] `stop()` calls `.stop()` on every `MediaStreamTrack` — spec verifies
- [ ] `constrainResolution()` for downscale fallback
- [ ] No `HttpClient` import in this service (`type:domain`)
- [ ] `npx nx test gest-detection` PASS
- [ ] `npx nx build gest-detection` PASS

## Acceptance criteria
- [ ] `stop()` stops every track — spec proves camera LED goes off
- [ ] All 5 `CameraState` transitions verified
- [ ] `npx nx test gest-detection` PASS

## Dependencies
- None — browser `getUserMedia` API only.

## Tenant-context impact
None — camera is a local hardware resource; no tenant data involved.

## Prioridade
P3
