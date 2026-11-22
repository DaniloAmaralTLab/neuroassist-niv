# FE-GEST-023 -- DetectionStateMapper — StationRuntimeVM → DetectionStateEnum (SPEC-03 §7, never-false-RUNNING INV-GEST-8)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`DetectionStateMapper` maps the full `StationRuntimeVM` to a `{state: DetectionStateEnum; reason: string}` pair applying the SPEC-03 §7 priority table in order; `'RUNNING'` is the last/lowest-priority state and is ONLY reached when all higher-priority checks pass (INV-GEST-8); the mapper is a pure function (no side effects, no injections) — testable in isolation.

## Approach (execution path)
Priority table (SPEC-03 §7, first-match wins, evaluated top-down):
1. `camera ∈ {denied, no-device}` → `{state:'UNAVAILABLE', reason:'CAMERA_UNAVAILABLE'}`
2. `model === 'failed'` → `{state:'UNAVAILABLE', reason:'MODEL_FAILED'}`
3. `camera ∈ {idle, requesting} || model === 'loading'` → `{state:'UNAVAILABLE', reason:'INITIALISING'}`
4. `stationIdentity === 'unpaired'` → `{state:'UNAVAILABLE', reason:'STATION_UNPAIRED'}`
5. `paused === true` → `{state:'PAUSED', reason:'HIDDEN'}`
6. `degraded === true` → `{state:'DEGRADED', reason:'FPS_BELOW_BUDGET'}`
7. all checks passed → `{state:'RUNNING', reason:''}` (last row — never reached early)

Each row is an exhaustive `if/else if` chain — never `switch` with fall-through. The function signature: `map(vm: Partial<StationRuntimeVM>): {state: DetectionStateEnum; reason: string}`.

Spec: 7 unit tests, one per row, each asserting the correct state and reason. The RUNNING test proves all 6 prior conditions are false before `state='RUNNING'` is returned.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/detection-state.mapper.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/detection-state.mapper.spec.ts`
- [ ] 7 unit tests (one per priority row) — RUNNING test is the 7th
- [ ] No `HttpClient`, no injection — pure function
- [ ] `'RUNNING'` is the LAST else branch (never the first)
- [ ] Reason strings are non-empty for all states except `RUNNING`
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS

## Acceptance criteria
- [ ] 7 priority-table tests all PASS (INV-GEST-8: RUNNING only when last)
- [ ] RUNNING test proves all 6 prior conditions false
- [ ] `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-011 (RuntimeFacade — provides StationRuntimeVM to map)
- FE-GEST-021 (GestShellIntegrationService — consumes mapper output)

## Tenant-context impact
None — pure local state mapper; no tenant data.

## Prioridade
P2
