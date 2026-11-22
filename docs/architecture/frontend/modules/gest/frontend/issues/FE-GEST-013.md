# FE-GEST-013 -- LandmarkWorker — Web Worker frame→facial landmarks (MediaPipe/TF.js), model load/fail, privacy boundary: frames discarded per tick (INV-GEST-4)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`LandmarkWorker` (a Web Worker) loads the `@mediapipe/tasks-vision` `FaceLandmarker` locally; on each animation frame it runs landmark detection and posts only the landmark array back — raw video frames are NEVER posted back and are DISCARDED per tick inside the worker (INV-GEST-4); model load/fail messages are signalled honestly; `LandmarkWorkerSeam` wraps the Worker with typed messages and exposes model state for `RuntimeFacade`.

## Approach (execution path)
1. `landmark.worker.ts`: on `'load'` message, call `FaceLandmarker.createFromOptions(...)` with the WASM/model loaded locally; on success → `postMessage({type:'model-ready'})`; on failure → `postMessage({type:'model-failed', error: message})`.
2. On each `'frame'` message (canvas or ImageBitmap from `rAF`): run `FaceLandmarker.detectForVideo(image, timestamp)`; `postMessage({type:'landmarks', payload:{landmarks}})` — NEVER post the raw image; transfer or discard the `ImageBitmap` immediately after detection.
3. Frames are **discarded** in the worker after processing — not cached, not persisted, not forwarded (INV-GEST-4 privacy architecture, SPEC-09 §5).
4. `LandmarkWorkerSeam`: wraps `new Worker(...)`, routes typed messages; exposes `modelState: Signal<ModelState>` and `landmarks$: Observable<Landmark[][]>`.
5. Spec (`landmark-worker.seam.spec.ts`): mock `Worker`; assert no `{type:'frame-data'}` or raw image bytes in `postMessage` calls; model-ready/model-failed transitions.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/detection/src/lib/landmark.worker.ts`
- [ ] implementar `frontend/libs/gest/detection/src/lib/landmark-worker.seam.ts`
- [ ] Raw frame/ImageBitmap discarded inside worker after detection — never posted back
- [ ] Only `{type:'landmarks', payload:{landmarks}}` crosses the worker boundary
- [ ] `model-ready` / `model-failed` messages signal honest model state
- [ ] `@mediapipe/tasks-vision` loaded from local assets (never a CDN call — INV-GEST-4)
- [ ] No `HttpClient` import (pure domain)
- [ ] `npx nx test gest-detection` PASS
- [ ] `npx nx build gest-detection` PASS

## Acceptance criteria
- [ ] Spec proves no raw frame crosses the worker boundary (INV-GEST-4)
- [ ] `model-failed` → `RuntimeFacade` receives `model='failed'`
- [ ] `npx nx test gest-detection` PASS

## Dependencies
- FE-GEST-011 (RuntimeFacade consumes model state from seam)
- extra dependency: `@mediapipe/tasks-vision` (loaded locally, ADR-005)

## Tenant-context impact
None — pure local ML inference; no data leaves the worker.

## Prioridade
P3
