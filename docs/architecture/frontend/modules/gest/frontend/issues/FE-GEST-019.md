# FE-GEST-019 -- StationStatusPageComponent — smart, DiagnosticsVM composed view, kiosk/foreground requirement surface, operator panel

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`StationStatusPageComponent` (smart, `OnPush`, standalone) composes `DiagnosticsVM` from the three facades as a `computed()` signal; surfaces the kiosk/foreground requirement notice (SPEC-09 §2.2); exposes the on-station operator diagnostics surface — it is NOT a remote caregiver liveness panel (caregiver liveness is EDGE's `DeviceStatusBadge`, not a GEST surface).

## Approach (execution path)
1. Inject `RuntimeFacade`, `CatalogFacade`, `ReportFacade`.
2. `diagnosticsVm(): Signal<DiagnosticsVM>` as `computed()` composing `{runtime: runtimeVm(), activeCommands: activeCommandsVm(), queue: queueVm(), lastRecognition: lastRecognitionVm()}`.
3. Template:
   - Static "Keep this tab in the foreground" notice (kiosk requirement, SPEC-09 §2.2).
   - `<gest-detection-status-panel [vm]="diagnosticsVm().runtime">` 
   - `<gest-active-command-list [commands]="diagnosticsVm().activeCommands">`
   - `<gest-report-queue-panel [vm]="diagnosticsVm().queue">`
4. No remote caregiver signal here — caregiver liveness is EDGE's concern, not GEST's.
5. Spec: (a) `DiagnosticsVM` assembles from all three facades; (b) kiosk requirement notice present in DOM; (c) `lastRecognition=null` renders empty state without error; (d) `diagnosticsVm()` updates when any facade updates.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/feature-station-status/src/lib/station-status-page.component.ts`
- [ ] implementar `frontend/libs/gest/feature-station-status/src/lib/station-status-page.component.spec.ts`
- [ ] implementar `frontend/libs/gest/feature-station-status/src/lib/station-status.routes.ts`
- [ ] `diagnosticsVm()` is a `computed()` signal — not manual subscription
- [ ] Kiosk/foreground requirement notice always visible
- [ ] No remote caregiver liveness surface in this component
- [ ] `standalone: true`, `changeDetection: OnPush`
- [ ] `npx nx test gest-feature-station-status` PASS

## Acceptance criteria
- [ ] Kiosk requirement notice present in DOM spec
- [ ] `computed()` DiagnosticsVM assembles all three facades
- [ ] `npx nx test gest-feature-station-status` PASS

## Dependencies
- FE-GEST-011 (RuntimeFacade)
- FE-GEST-010 (CatalogFacade)
- FE-GEST-009 (ReportFacade)
- FE-GEST-020 (presentational status panels)

## Tenant-context impact
None — station diagnostics; no tenant data.

## Prioridade
P4
