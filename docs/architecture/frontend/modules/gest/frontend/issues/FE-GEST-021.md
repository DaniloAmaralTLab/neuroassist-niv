# FE-GEST-021 -- GestShellIntegrationService — detection→report wiring, StationLivenessPort.setDetectionState/beatNow on transitions (SAFETY-GEST-1, INV-GEST-8)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`GestShellIntegrationService` wires the detection pipeline (`CompoundGestureStateMachine` → `ReportFacade`) and publishes mapped `detectionState` to `StationLivenessPort.setDetectionState()` on EVERY state transition + calls `beatNow()` immediately — keeping GEST's network boundary at exactly **three** device-token calls; GEST NEVER opens its own `POST /edge/heartbeat` (INV-GEST-8, SAFETY-GEST-1 closed). `StationLivenessPort` is provided by `libs/edge` (INT-FE-GEST-004).

## Approach (execution path)
1. Inject `RuntimeFacade`, `ReportFacade`, `StationLivenessPort` (InjectionToken; provided by `libs/edge`), `GestTelemetryService`.
2. `effect(() => { const vm = runtimeFacade.runtimeVm(); const mapped = detectionStateMapper.map(vm); if (mapped.state !== previousState) { livenessPort.setDetectionState(mapped.state, mapped.reason, vm.engineVersion); livenessPort.beatNow(); previousState = mapped.state; } })`.
3. Wire `CompoundGestureStateMachine.commandRecognised$` → `ReportFacade.enqueue(recognition)`.
4. Wire detection state/recognition events to `GestTelemetryService.track*()` (never console.log, never frames — INV-GEST-4).
5. Export `NoOpStationLivenessPort` for use in unit tests when `libs/edge` provider is not available.
6. Spec: (a) RUNNING→PAUSED transition → `setDetectionState(PAUSED, HIDDEN, ...)` called + `beatNow()` called; (b) no `POST /edge/heartbeat` issued from GEST directly; (c) `commandRecognised` → `ReportFacade.enqueue()` called; (d) telemetry does not receive frame or landmark data.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/integration/src/lib/gest-shell-integration.service.ts`
- [ ] implementar `frontend/libs/gest/integration/src/lib/gest-shell-integration.service.spec.ts`
- [ ] implementar `frontend/libs/gest/integration/src/lib/station-liveness.port.ts` (interface + NoOp)
- [ ] Every `detectionState` transition → `setDetectionState()` + `beatNow()` called
- [ ] No `POST /edge/heartbeat` from GEST — spec proves this (network call count = 3)
- [ ] `commandRecognised` → `ReportFacade.enqueue()` wired
- [ ] Telemetry events contain no frames/landmarks (INV-GEST-4)
- [ ] `NoOpStationLivenessPort` exported for unit tests
- [ ] `npx nx test gest-integration` PASS

## Acceptance criteria
- [ ] Spec proves exactly 3 network calls from GEST (not 4) — no `POST /edge/heartbeat` directly
- [ ] Every transition triggers `setDetectionState + beatNow` — SAFETY-GEST-1 FE side proven
- [ ] `npx nx test gest-integration` PASS

## Dependencies
- FE-GEST-011 (RuntimeFacade)
- FE-GEST-009 (ReportFacade)
- FE-GEST-023 (DetectionStateMapper)
- FE-GEST-026 (GestTelemetryService)
- INT-FE-GEST-004 (libs/edge implements StationLivenessPort — EDGE-side issue, OPEN)

## Tenant-context impact
None — station integration service; no tenant session.

## Prioridade
P5
