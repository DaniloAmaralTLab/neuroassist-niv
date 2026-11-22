# FE-GEST-020 -- Status panel + chips + command list + report queue panel — DetectionStatusPanelComponent, ActiveCommandListComponent, DetectableBadgeComponent, ReportQueuePanelComponent (relative-time pipe, never toFixed)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
Four presentational components (pure `input()/output()`, standalone, `OnPush`): `DetectionStatusPanelComponent` (wraps 4 state chips + `LastRecognitionLine`); `ActiveCommandListComponent` with `DetectableBadgeComponent` ('not yet detectable' when `detectable=false`, INV-GEST-7); `ReportQueuePanelComponent` (pending count, last sent, last error, next retry in N — via `RelativeTimePipe`, NEVER `Number.toFixed` — carry-forward `fe-component:kpi-decimal-format`).

## Approach (execution path)
1. `DetectionStatusPanelComponent`: `input() vm: StationRuntimeVM`; renders `CameraStateChip`, `ModelStateChip`, `DetectionStateChip`, `LastRecognitionLine` (each sub-component is `input()`-driven).
2. `DetectableBadgeComponent`: `input() detectable: boolean`; `input() supportStatus: SupportStatus`; when `detectable=false` → renders badge text "not yet detectable" (INV-GEST-7); never armed colour.
3. `ReportQueuePanelComponent`: `input() vm: ReportQueueVM`; "pending N" via integer pipe; "next retry in N" via `RelativeTimePipe(vm.nextRetryInMs)` — NEVER `Number.toFixed` or millisecond raw display; "report expired, not delivered" message for expired items.
4. `RelativeTimePipe`: transforms milliseconds to human-readable relative time (e.g. "in 30 s", "in 2 m").
5. All components: `standalone: true`, `changeDetection: OnPush`, no injected facade.
6. Spec: (a) `DetectableBadgeComponent` renders 'not yet detectable' when `detectable=false`; (b) `ReportQueuePanelComponent` uses `RelativeTimePipe` output not raw ms number; (c) all chips render all state values; (d) expired item surfaces 'not delivered' message.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/feature-station-status/src/lib/detection-status-panel.component.ts`
- [ ] implementar `frontend/libs/gest/feature-station-status/src/lib/active-command-list.component.ts`
- [ ] implementar `frontend/libs/gest/feature-station-status/src/lib/detectable-badge.component.ts`
- [ ] implementar `frontend/libs/gest/feature-station-status/src/lib/report-queue-panel.component.ts`
- [ ] `DetectableBadgeComponent` renders 'not yet detectable' on `detectable=false` — spec verifies
- [ ] `ReportQueuePanelComponent` uses `RelativeTimePipe` — NEVER `toFixed` (carry-forward `fe-component:kpi-decimal-format`)
- [ ] All components: `standalone: true`, `changeDetection: OnPush`, no facade injection
- [ ] `npx nx test gest-feature-station-status` PASS
- [ ] `npx nx build gest-feature-station-status` PASS

## Acceptance criteria
- [ ] 'not yet detectable' badge renders on `detectable=false` (INV-GEST-7 visual proof)
- [ ] `RelativeTimePipe` used for retry countdown (not `toFixed`)
- [ ] `npx nx test gest-feature-station-status` PASS

## Dependencies
- FE-GEST-019 (StationStatusPageComponent hosts these)

## Tenant-context impact
None — pure presentational status display; no tenant data.

## Prioridade
P4
