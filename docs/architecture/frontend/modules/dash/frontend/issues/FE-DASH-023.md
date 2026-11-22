# FE-DASH-023 -- E2E — home-overview-composition scenarios: routing + compose-only + no /dash endpoint + refresh + shell-patient + per-panel RBAC + permission map + AccessDecisionService check

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`apps/dash-e2e/src/home-overview-composition.spec.ts` is fully implemented: all 12 scenarios from `home-overview-composition.feature` pass in Playwright, covering the happy path routing, composition-only architecture, no `/dash` endpoint, refresh behaviour, shell-patient scoping, per-panel RBAC, permission map composition, and `AccessDecisionService` can-check.

## Approach (execution path)
1. Implement each scenario from `home-overview-composition.feature`:
   - "Default route after sign-in is the home overview": sign in → assert URL is `/home`
   - "Home overview composes only the published module APIs": mock HTTP layer, assert no call to `/dash/**`
   - "Home overview calls no /dash endpoint": network interception, assert zero `/dash` calls
   - "Refresh re-reads every composed facade": spy on facade methods, trigger refresh button, assert re-reads
   - "Overview scopes to the shell-provided patient with no picker": assert no patient-picker element in DOM
   - "Missing hist.history.read hides KPI and recent-events panels": mock `AccessDecisionService.can('hist.history.read') = false`, assert panels hidden
   - "Missing edge.device.read hides device-health panel": analogous
   - "Missing evnt.event.read hides alarm-status and routine-notice panels": analogous
   - "Missing pat.command.read hides command-catalog summary": analogous
   - "Permission map uses only composed authorities": inspect `MODULE_PERMISSION_MAP` keys — no `dash.*`
   - "Every DASH gate goes through AccessDecisionService": spy on `AccessDecisionService.can`, assert called
   - "Suggestion flag off hides inline advisory card": set flag off, assert card absent
2. Use `page.route('**/dash/**', route => route.abort())` for endpoint absence test.
3. RBAC tests: use Playwright fixture that injects a mock `AccessDecisionService`.

## Implementation checklist (by layer/file)
- [ ] `frontend/apps/dash-e2e/src/home-overview-composition.spec.ts` — all 12 scenarios implemented
- [ ] No `/dash/**` network call asserted via Playwright network interception
- [ ] RBAC tests use mock `AccessDecisionService` fixture
- [ ] No patient-picker DOM element asserted
- [ ] `npx nx run dash-e2e:e2e` PASS (all 12 scenarios)
- [ ] `npx nx lint neuroassist-niv-web` PASS

## Acceptance criteria
- [ ] 12 scenarios in `home-overview-composition.spec.ts` PASS
- [ ] Zero `/dash/**` calls during home overview load (network interception)

## Dependencies
- FE-DASH-022 (stubs exist)
- FE-DASH-001 through FE-DASH-013 (all DASH components and routes implemented)
- FE-DASH-015 (dashGuard for RBAC scenarios)

## Tenant-context impact
None.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/e2e/home-overview-composition.feature`
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` (§2)

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
