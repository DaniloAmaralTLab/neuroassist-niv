# FE-GEST-016 -- Perf budget / degradation monitoring — fps measurement, budget floor, degraded state trigger, capture downscale fallback

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`PerfBudgetService` measures landmark cadence (actual fps from inter-frame intervals); when sustained fps stays below `fpsBudget` for N consecutive frames, it switches detection to `'degraded'` and optionally triggers a capture-resolution downscale via `CameraService.constrainResolution()`; degradation is NEVER silent — it always surfaces as `detection='degraded'` in `StationRuntimeVM` (SPEC-09 §2.5, never a silent fps collapse).

## Approach (execution path)
1. `PerfBudgetService.recordFrame(timestampMs: number)`: maintain a rolling N-window (e.g. N=5) of inter-frame intervals; compute `fps = 1000 / avgInterval`.
2. `fpsBudget` from configuration (default 15 fps per ADR-005; never hardcoded magic number in business logic).
3. Degraded condition: N consecutive frames below budget → `degradedChange.emit(true)`; N consecutive frames above → `degradedChange.emit(false)`.
4. On sustained degraded (> M frames): optionally call `CameraService.constrainResolution(640, 480)` to hold the fps budget.
5. `PerfBudgetService.fps$: Signal<number>` and `degraded$: Signal<boolean>` consumed by `RuntimeFacade` to set `detection='degraded'`.
6. Spec: (a) 10 frames at 10 fps (< 15 budget) → `degraded=true`; (b) 10 frames at 20 fps (> budget) → `degraded=false`; (c) transition emits a change event.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/detection/src/lib/perf-budget.service.ts`
- [ ] implementar `frontend/libs/gest/detection/src/lib/perf-budget.service.spec.ts`
- [ ] `fpsBudget` from config — not hardcoded in comparison logic
- [ ] Rolling N-window average (not single-frame check)
- [ ] Degraded transition emits signal for `RuntimeFacade`
- [ ] Optional resolution downscale call on sustained degraded
- [ ] No `HttpClient` import (pure domain)
- [ ] `npx nx test gest-detection` PASS
- [ ] `npx nx build gest-detection` PASS (1 extra for detection spec)

## Acceptance criteria
- [ ] 10 consecutive sub-budget frames → `degraded=true` (not on first frame alone)
- [ ] `degraded` signal consumed by `RuntimeFacade` → `detection='degraded'` (SPEC-09 §2.5)
- [ ] `npx nx test gest-detection` PASS

## Dependencies
- FE-GEST-012 (CameraService.constrainResolution for downscale)
- FE-GEST-011 (RuntimeFacade consumes degraded signal)

## Tenant-context impact
None — local performance measurement; no tenant data.

## Prioridade
P3
