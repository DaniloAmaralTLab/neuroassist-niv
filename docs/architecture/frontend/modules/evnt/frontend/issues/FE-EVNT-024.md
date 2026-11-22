# FE-EVNT-024 -- E2E stubs — emergency-alarm.feature + alarm-delivery-safety.feature

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`apps/evnt-e2e/` contains Playwright specs for `emergency-alarm.feature` (8 scenarios) and `alarm-delivery-safety.feature` (10 SAFETY scenarios). All scenarios use `EVENT_PORT` stubs (never live BE). The 10 safety scenarios prove the SAFETY invariants: monitoring banner visible when degraded, state='none' only after positive read, confirm failure keeps alarm active.

## Context / Problem statement

- These two feature files cover the alarm takeover happy path and the safety-critical edge cases (SPEC-08-e2e-scenarios.md §1 and §2).
- Stub-integrity rule (SPEC-08 §5): e2e stubs must mirror real wire records (no fabricated `patientName`/`confirmedByName`). The mapper under test proves the stub is valid.
- The 10 `alarm-delivery-safety.feature` scenarios include: tab-hidden → monitoring banner; offline → monitoring banner; stale → monitoring banner; positive null read → empty state (NOT banner); confirm 409 → alarm re-raised; confirm 500 → alarm re-raised; poll error → banner (not toast); push-enroll blocked → channel blocked (not on); push 410 → no toast; notificationclick → route /alarm.

## Approach (execution path)

1. Create `apps/evnt-e2e/src/e2e/emergency-alarm.spec.ts` (8 scenarios from SPEC-08 §1).
2. Create `apps/evnt-e2e/src/e2e/alarm-delivery-safety.spec.ts` (10 SAFETY scenarios from SPEC-08 §2).
3. Use `context.grantPermissions(['notifications'])` and `page.evaluate(() => { ... })` to control Notification API permission.
4. All scenarios mock `EVENT_PORT` endpoints via Playwright `route()` intercepts (no live BE).
5. Stub records include required fields: `eventId`, `commandLabel`, `detectedAt`, `severity`, `pollingState`. No fabricated `patientName`.

## Non-goals

- No live BE calls in e2e.
- No SW registration in e2e (mock PUSH_PORT — INT-FE-EVNT-006).

## Layer(s)

frontend / e2e (`apps/evnt-e2e/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` §1–§2

## Architecture alignment

- Playwright with stub EVENT_PORT
- Stub-integrity rule (no fabricated fields)
- Tag Nx: `scope:evnt`, `type:e2e`

## Implementation checklist (by file)

**e2e layer**
- [ ] `apps/evnt-e2e/src/e2e/emergency-alarm.spec.ts` (8 scenarios)
- [ ] `apps/evnt-e2e/src/e2e/alarm-delivery-safety.spec.ts` (10 SAFETY scenarios)
- [ ] `apps/evnt-e2e/src/support/evnt-stubs.ts` (shared stub factories)

**Tests**
- [ ] `npx nx e2e evnt-e2e` PASS (all 18 scenarios)
- [ ] `npx nx lint evnt-e2e` PASS

## Milestone

Wave P9 / e2e + Hardening

## Labels

type:e2e
layer:frontend
scope:evnt
priority:P9
safety:e2e

## Acceptance criteria

- `npx nx e2e evnt-e2e` PASS for all 18 scenarios
- Monitoring banner visible in: tab-hidden, offline, stale scenarios (3 of 10 SAFETY)
- Confirm failure keeps alarm (not empty state) in: 409, 500 scenarios
- Poll error → banner (not toast)
- Empty state shown ONLY after positive null read scenario

## Dependencies

- FE-EVNT-009 (AlarmFacade states under test)
- FE-EVNT-014 (MonitoringStatusBanner — SAFETY assertion target)
- INT-FE-EVNT-006 (mock PUSH_PORT)

## Tenant-context impact

Nenhum (e2e uses a test tenant stub).

## Risks / Notes

- SAFETY: these scenarios are the contractual proof of the safety invariants. They must NEVER be skipped or marked `.skip`.

## Prioridade

P9
