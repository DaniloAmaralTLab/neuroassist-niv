# FE-DASH-026 -- E2E — partial-failure-and-errors + entry-and-shell-routing scenarios: source error degrades, device error panel, em-dash, partial failure, PII-free telemetry, entry as shell route, authGuard/dashGuard

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`partial-failure-and-errors.spec.ts` and `entry-and-shell-routing.spec.ts` are fully implemented: 5 partial-failure scenarios and 5 shell-routing scenarios from their respective feature files all pass.

## Approach (execution path)
1. `partial-failure-and-errors.spec.ts`:
   - "A composed source error degrades the headline with a reason": mock EVNT `error` → assert `degraded` headline with reason text.
   - "A failed device read shows an error panel, not offline or blank": mock EDGE `error` → assert no "offline" text, no blank card; error-state element visible.
   - "A failed history summary shows an em dash, not zero events": mock HIST `error` → KPI tile text `'—'`.
   - "Partial failure keeps the healthy panels rendered": mock only EVNT `error`; HIST/EDGE/PAT ok → assert HIST and EDGE panels still render.
   - "Composed-read failures report via correlation id with no PII": spy on `ObservabilityService.emit`, assert event has `correlationId` field and no patient-name/DOB field.
2. `entry-and-shell-routing.spec.ts`:
   - "entry is a shell route, not a DASH route": navigate to `/entry`, assert it loads (shell route) and NOT via DASH lazy-load.
   - "entry is promoted as a shell route into the ACS login flow": tap CTA on entry page, assert redirect to `/login` (ACS login).
   - "authGuard redirects an unauthenticated caregiver from home to the login flow": no session, navigate to `/home`, assert redirect to `/login`.
   - "dashGuard denies home and redirects to a safe fallback": mock dashGuard deny, assert redirect.
   - "Shell pushes the active patient to the composed modules": spy on `DashShellIntegrationService.setActivePatient`, login, assert it is called.

## Implementation checklist (by layer/file)
- [ ] `frontend/apps/dash-e2e/src/partial-failure-and-errors.spec.ts` — 5 scenarios implemented
- [ ] `frontend/apps/dash-e2e/src/entry-and-shell-routing.spec.ts` — 5 scenarios implemented
- [ ] No "offline" text asserted on EDGE error
- [ ] PII check: spy asserts no `patient.name` / `dateOfBirth` in observability event
- [ ] `npx nx run dash-e2e:e2e` PASS (all 10 scenarios across both files)

## Acceptance criteria
- [ ] 5 partial-failure scenarios PASS
- [ ] 5 shell-routing scenarios PASS
- [ ] EDGE error: no "offline" label in DOM; error-panel element present

## Dependencies
- FE-DASH-022 (stubs)
- FE-DASH-017 (entry shell promotion)
- FE-DASH-014/015 (authGuard/dashGuard)
- FE-DASH-021 (observability — PII-free telemetry)
- FE-DASH-019 (panel-error-banner — device error state)

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/e2e/partial-failure-and-errors.feature`
- `docs/architecture/frontend/modules/dash/frontend/e2e/entry-and-shell-routing.feature`

## Architecture alignment
- Tags Nx: `scope:dash`, `type:e2e`

## Milestone
Wave 9 / E2E

## Labels
type:e2e
layer:frontend
scope:dash
priority:P9

## Prioridade
P9
