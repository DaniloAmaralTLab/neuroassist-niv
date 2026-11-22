# FE-DASH-025 -- E2E — detection-lapse-notice + emergency-precedence scenarios: amber notice never emergency; DASH defers to EVNT takeover without styling or suppressing

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
`detection-lapse-notice.spec.ts` and `emergency-precedence.spec.ts` are fully implemented: (1) an open detection lapse renders an amber notice, never emergency styling; (2) an EVNT unconfirmed emergency is deferred to EVNT's takeover — DASH applies no emergency styling and does not suppress it. Both enforce INV-3.

## Approach (execution path)
1. `detection-lapse-notice.spec.ts` — "Online but not detecting shows an amber notice, never emergency":
   - Mock EDGE `DeviceFacade.statusVm()` = `online`; mock EVNT `LapseAlertFacade.openDetectionLapses` = non-empty.
   - Assert `DetectionLapseNoticeComponent` is visible with amber styling.
   - Assert no emergency CSS class is applied to the notice banner.
   - Assert headline is `notice` (not `emergency`, not `all_clear`).
2. `emergency-precedence.spec.ts` — "DASH defers to the EVNT emergency takeover without styling or suppressing it":
   - Mock EVNT `AlarmFacade.alarmVm()` = `{ urgency: 'emergency', confirmed: false }`.
   - Assert DASH does NOT render `--color-alarm` or any `.emergency` class on its own elements.
   - Assert EVNT emergency takeover component is visible (EVNT renders above DASH).
   - Assert DASH overview is NOT suppressed (still in DOM, just below the takeover).

## Implementation checklist (by layer/file)
- [ ] `frontend/apps/dash-e2e/src/detection-lapse-notice.spec.ts` — 1 scenario implemented
- [ ] `frontend/apps/dash-e2e/src/emergency-precedence.spec.ts` — 1 scenario implemented
- [ ] `detection-lapse-notice.spec.ts`: amber CSS token asserted, no emergency class
- [ ] `emergency-precedence.spec.ts`: no DASH-owned `.emergency` class; EVNT takeover visible
- [ ] `npx nx run dash-e2e:e2e` PASS (both scenarios)

## Acceptance criteria
- [ ] Detection-lapse notice: amber token applied, NOT `--color-alarm`
- [ ] Emergency: DASH has no `.emergency` class; EVNT takeover is not suppressed (INV-3)

## Dependencies
- FE-DASH-022 (stubs)
- FE-DASH-011 (DetectionLapseNoticeComponent)
- INT-FE-DASH-001 (LapseAlertFacade — required for lapse scenario; test may use mock)
- FE-DASH-009 (OverviewHeadlineComponent — emergency branch renders nothing)

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/e2e/detection-lapse-notice.feature`
- `docs/architecture/frontend/modules/dash/frontend/e2e/emergency-precedence.feature`

## Architecture alignment
- INV-3: emergency never faked, never hidden — E2E coverage
- Tags Nx: `scope:dash`, `type:e2e`

## Milestone
Wave 9 / E2E

## Labels
type:e2e
layer:frontend
scope:dash
priority:P9
safety:INV-3,SAFETY-GEST-1

## Prioridade
P9
