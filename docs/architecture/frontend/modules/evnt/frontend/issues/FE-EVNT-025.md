# FE-EVNT-025 -- E2E stubs — routine-notice.feature + evnt-navigation.feature

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`apps/evnt-e2e/` contains Playwright specs for `routine-notice.feature` (6 scenarios) and `evnt-navigation.feature` (7 scenarios). Covers routine notice display, dismiss, mark-not-real RBAC, and navigation/guard scenarios.

## Context / Problem statement

- Routine notice scenarios prove the guard between routine and emergency paths (SPEC-08 §3–§4).
- Navigation scenarios prove route guards: `evnt.event.read` absent → redirect; `evnt.event.confirm` absent → button hidden (not forbidden).
- `evnt-navigation.feature` also covers: `/alarm` with no active alarm → empty state (not banner); breadcrumb-free navigation; lazy-load latency.
- Stub-integrity rule applies: stubs mirror real `RoutineNoticeRecord` wire shape.

## Approach (execution path)

1. Create `apps/evnt-e2e/src/e2e/routine-notice.spec.ts` (6 scenarios from SPEC-08 §3).
2. Create `apps/evnt-e2e/src/e2e/evnt-navigation.spec.ts` (7 scenarios from SPEC-08 §4).
3. RBAC scenario: seed an `accessDecision` mock with/without `evnt.event.record` to show/hide `markNotReal` button.
4. Navigation guards: use Playwright `page.route()` to intercept `/access/session` and return custom permissions.

## Non-goals

- No alarm delivery tests (FE-EVNT-024).
- No push tests (FE-EVNT-026).

## Layer(s)

frontend / e2e (`apps/evnt-e2e/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` §3–§4

## Architecture alignment

- Playwright with stub EVENT_PORT
- Stub-integrity rule
- Tag Nx: `scope:evnt`, `type:e2e`

## Implementation checklist (by file)

**e2e layer**
- [ ] `apps/evnt-e2e/src/e2e/routine-notice.spec.ts` (6 scenarios)
- [ ] `apps/evnt-e2e/src/e2e/evnt-navigation.spec.ts` (7 scenarios)

**Tests**
- [ ] `npx nx e2e evnt-e2e` PASS for these 13 scenarios
- [ ] `npx nx lint evnt-e2e` PASS

## Milestone

Wave P9 / e2e + Hardening

## Labels

type:e2e
layer:frontend
scope:evnt
priority:P9

## Acceptance criteria

- `npx nx e2e evnt-e2e` PASS for all 13 scenarios
- `markNotReal` button hidden when `evnt.event.record` absent (RBAC scenario)
- `/alarm` with no active alarm shows empty state (not banner) after positive null read
- Lazy-load latency scenario passes (< 2 s LCP stub)

## Dependencies

- FE-EVNT-015 (RoutineNoticeListComponent)
- FE-EVNT-002 (EVNT_ROUTES + guards)
- FE-EVNT-006 (Access guards)

## Tenant-context impact

Nenhum (e2e test tenant stub).

## Risks / Notes

- Navigation guard test must use a real mock of `AccessDecisionService`, not a permissive stub (`guard:stub-permissive` pitfall).

## Prioridade

P9
