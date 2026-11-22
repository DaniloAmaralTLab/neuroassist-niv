# FE-DASH-003 -- dash.module.ts (shell-entry barrel) + dash.bootstrap.ts — patient-context init, fan-out, destroy; no DASH timer

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`libs/dash/src/lib/dash.module.ts` (shell-entry barrel) and `dash.bootstrap.ts` are authored: bootstrap registers the `DASH_DESCRIPTOR`, fans out the active patient id to the composed modules' seams on patient-context ready, and destroys DASH's own UI-local state on teardown — without starting any DASH timer (EVNT owns the only poll loop per SPEC-06 §3).

## Approach (execution path)
1. Create `libs/dash/src/lib/dash.module.ts` as the NgModule barrel (or standalone provider function `provideDash()`); it imports and re-exports the providers from `libs/dash/data-access` and `libs/dash/integration`.
2. Create `libs/dash/src/lib/dash.bootstrap.ts` with an `initDash()` function:
   - Registers `DASH_DESCRIPTOR` in the shell (calls `ShellToolRegistryService.register(DASH_DESCRIPTOR)`).
   - Subscribes to the shell's `AuthenticatedCaregiverService.activePatientId$` (or equivalent); on first emission calls `DashShellIntegrationService.setActivePatient(id)`.
   - Does NOT start any interval/timer (EVNT owns the poll loop, SPEC-06 §3).
3. Add a `destroyDash()` function that unsubscribes the composed signals and clears DASH UI-local state (advisory-dismissed flag, source-health overrides) — does NOT mutate any composed-module state.
4. Export `provideDash`, `initDash`, `destroyDash` from `libs/dash/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/dash.module.ts` (barrel / `provideDash()`)
- [ ] `frontend/libs/dash/src/lib/dash.bootstrap.ts` — `initDash()` + `destroyDash()`
- [ ] `initDash()` fans out active patient via `DashShellIntegrationService.setActivePatient(id)`
- [ ] No `setInterval` / `timer` / `interval` started by DASH (EVNT owns the poll loop)
- [ ] `destroyDash()` clears only DASH UI-local state; does NOT mutate composed-module state
- [ ] All exports re-exported from `libs/dash/src/index.ts`
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] No `setInterval` / `timer()` / `interval()` calls in `dash.bootstrap.ts`
- [ ] `destroyDash()` does not call `AlarmFacade.stop()`, `DeviceFacade.reset()`, or any composed-module mutation
- [ ] `npx nx build dash` PASS (no TS errors)

## Dependencies
- FE-DASH-001 (MODULE_KEY / DASH_DESCRIPTOR needed)
- FE-DASH-004 (DASH_DESCRIPTOR shape)
- FE-DASH-007 (DashShellIntegrationService must exist)

## Tenant-context impact
None — patient context is supplied by the shell's authenticated-caregiver context (INV-6).

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2, §3)

## Architecture alignment
- No timer ownership in DASH (EVNT owns the only poll loop)
- Standalone + OnPush pattern downstream
- Tags Nx: `scope:dash`, `type:domain`

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:dash
priority:P1

## Prioridade
P1
