# FE-GEST-017 -- StationRuntimePageComponent — smart, reads RuntimeFacade/CatalogFacade/ReportFacade signals, wires detection→report, never-false-RUNNING (INV-GEST-6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`StationRuntimePageComponent` (smart, `OnPush`, standalone) is the near-headless detection runtime host: it wires detection recognitions to `ReportFacade`, drives presentational children from facade signals, and NEVER renders `detection='running'` when no frames are produced (INV-GEST-6). It holds NO camera stream, NO worker handle, NO `HttpClient` — all in `libs/gest/detection` and `data-access`.

## Approach (execution path)
1. Inject `RuntimeFacade`, `CatalogFacade`, `ReportFacade`, `WakeLockService`.
2. On `commandRecognised` event from `CompoundGestureStateMachine` (via `GestShellIntegrationService`) → `ReportFacade.enqueue(recognition)`.
3. Template: bind `OperatorPreviewComponent` stream to `cameraService.getStream()` (via inject, NOT held as field); bind `DetectionPausedOverlayComponent` to `runtimeVm().paused || runtimeVm().detection === 'degraded'`; bind `StationIdentityNoticeComponent.unpaired` to `runtimeVm().stationIdentity === 'unpaired'`.
4. `OperatorPreviewComponent` binds the SAME `MediaStream` the worker reads — never a second `getUserMedia` call.
5. All template state derived from `runtimeVm()` signal — no component-local boolean flags for detection status.
6. Spec: (a) `runtimeVm().detection='running'` only when loop producing frames; (b) `detection='paused'` when tab hidden; (c) `stationIdentity='unpaired'` → `StationIdentityNoticeComponent.unpaired=true`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/feature-station-runtime/src/lib/station-runtime-page.component.ts`
- [ ] implementar `frontend/libs/gest/feature-station-runtime/src/lib/station-runtime-page.component.spec.ts`
- [ ] implementar `frontend/libs/gest/feature-station-runtime/src/lib/station-runtime.routes.ts`
- [ ] Component is `standalone: true`, `changeDetection: OnPush`
- [ ] No component holds `MediaStream`, worker handle, or `HttpClient`
- [ ] `detection='running'` only when loop producing frames — spec proves this
- [ ] `DetectionPausedOverlayComponent` binds to honest paused/degraded state
- [ ] `commandRecognised` event → `ReportFacade.enqueue()`
- [ ] `npx nx test gest-feature-station-runtime` PASS

## Acceptance criteria
- [ ] 3 rendering scenarios spec-verified (running/paused/unpaired)
- [ ] Never-false-RUNNING INV-GEST-6 proven in component spec
- [ ] `npx nx test gest-feature-station-runtime` PASS

## Dependencies
- FE-GEST-009 (ReportFacade)
- FE-GEST-010 (CatalogFacade)
- FE-GEST-011 (RuntimeFacade)
- FE-GEST-018 (presentational components)
- FE-GEST-022 (WakeLockService)

## Tenant-context impact
None — station runtime; no tenant session in this component.

## Prioridade
P4
