# FE-EVNT-009 -- AlarmFacade — live projection signals, polling loop, server-cadence adoption

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/data-access/src/lib/alarm.facade.ts` is a signal-based live projection (never a store). `alarmVm()` and `monitoringVm()` are `Signal<AlarmVM>` / `Signal<MonitoringVM>`. The polling loop adopts the server-advertised `pollIntervalSeconds`. `AlarmVM.state` NEVER yields `none` on a failed/paused read.

## Context / Problem statement

- EVNT is a live projection, not an NgRx store (ADR-005 §Decision 1, SPEC-04 §1).
- The facade must adopt the server-advertised `pollIntervalSeconds` and NEVER hardcode the cadence (BE SPEC-03 Decision 1, SPEC-04 §5.1).
- SAFETY invariant: `state='none'` is set ONLY after a successful read returned `activeAlarm: null`. A paused/offline/failing read holds the last known state and surfaces `MonitoringVM` (SPEC-03 §1, SPEC-04 §5.3–§5.5).
- The facade never infers an emergency from a timer (ADR-005 §Decision 3).
- Confirm-then-clear by default: await `200` before clearing the takeover (SPEC-04 §4).
- Optimistic clear allowed ONLY with rollback that re-raises the alarm on failure.
- Bloqueia: FE-EVNT-011 (AlarmPageComponent reads facade), FE-EVNT-015 (RoutineNoticeListComponent)

## Approach (execution path)

1. Create `alarm.facade.ts` with private `signal<AlarmVM>` + `signal<MonitoringVM>` + `signal<RoutineNoticeVM[]>`.
2. `startPolling(pollIntervalMs: number)`: start the emergency poll loop; initial cadence from first response's `pollIntervalSeconds`; adjust dynamically from each envelope.
3. On each poll cycle: call `eventApiService.getActiveAlarm(patientId)` → if success: update alarmVm; if failure: set `MonitoringVM.polling='offline'/'stale'`, hold last alarmVm.
4. `confirmAlarm(eventId)`: optimistic flow with explicit rollback — await `200`, then clear (or rollback + re-raise on failure).
5. `recordFeedback(eventId, verdict)`: pessimistic write.
6. Expose `escalationTrailVm(eventId): Signal<EscalationTrailVM>` for on-demand reads.
7. Never set `state='none'` from a failed read (carry-forward the SAFETY invariant to the unit spec).

## Non-goals

- No NgRx (signals only, ADR-005).
- No full event history — that is HIST.
- No cross-patient aggregation — that is DASH.

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §1–§5

## Architecture alignment

- Signals + .asReadonly() — no NgRx
- Live projection, never a store (ADR-005)
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access layer**
- [ ] `libs/evnt/data-access/src/lib/alarm.facade.ts`
- [ ] `libs/evnt/data-access/src/lib/alarm.vm.ts`
- [ ] `libs/evnt/data-access/src/lib/monitoring.vm.ts`
- [ ] `libs/evnt/data-access/src/lib/routine-notice.vm.ts`
- [ ] `libs/evnt/data-access/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (SAFETY: failed read never yields state=none; cadence adopted from envelope; confirm rollback re-raises alarm)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P2 / Data access

## Labels

type:data-access
layer:frontend
scope:evnt
priority:P2
safety:monitoring

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- Unit test: a mock HTTP 500 on the poll does NOT set `alarmVm.state='none'`
- Unit test: `pollIntervalSeconds` from the first response is adopted; subsequent responses can adjust it
- Unit test: a failed confirm write restores `alarmVm.state='active'`

## Dependencies

- FE-EVNT-007 (EventApiService for HTTP calls)
- FE-EVNT-008 (mappers)

## Tenant-context impact

Tenant-context switch clears the facade's signals via `evntBootstrap.destroy()`.

## Risks / Notes

- SAFETY: the most critical invariant — a failed read must never yield a false all-clear.
- Server-advertised cadence: test that the loop adjusts dynamically, not on first value only.

## Prioridade

P2
