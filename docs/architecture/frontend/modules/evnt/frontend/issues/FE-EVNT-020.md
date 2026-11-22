# FE-EVNT-020 -- [SAFETY] EvntShellIntegrationService — Page Visibility + connectivity wiring, polling, takeover observer

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/integration/src/lib/evnt-shell-integration.service.ts` wires `document.visibilitychange`, `window.online`, and `window.offline` listeners, pauses/resumes the poll, issues an immediate `getActiveAlarm` on resume, arms the emergency-takeover observer, and surfaces the monitoring-limitation banner across all dashboard screens. No dangling listeners after `teardown()`.

## Context / Problem statement

- SAFETY: the Shell owns the page-level event listeners because polling must follow the whole dashboard's foreground/online state, not a single route (SPEC-06 §2).
- WHILE hidden: `MonitoringVM.polling='paused-hidden'`, visible banner, poll throttled/unreliable — do NOT pretend hidden is covered.
- WHEN tab becomes visible: immediate `getActiveAlarm` poll (not wait up to one interval — SPEC-04 §5.3).
- WHEN connectivity returns: immediate poll (SPEC-04 §5.4).
- Clock-skew / stalled loop: compare `serverTime` each cycle; if stalled → `polling='stale'` + banner (SPEC-04 §5.4).
- Emergency-takeover observer: WHEN `alarmFacade.alarmVm().state='active'` and `evnt.alarm-autoroute` flag is on → auto-route to `/alarm` or render overlay.
- NEVER clears the takeover on its own — only an acknowledge write does.
- Monitoring-limitation banner must be surfaced across ALL dashboard screens while degraded.

## Approach (execution path)

1. `wireVisibility()`: subscribe to `document.visibilitychange`; on hidden → `alarmFacade.pausePoll()`; on visible → `alarmFacade.resumePoll()` + immediate `alarmFacade.pollNow()`.
2. `wireConnectivity()`: subscribe to `window.online/offline`; on offline → `alarmFacade.setOffline()`; on online → `alarmFacade.resumePoll()` + `alarmFacade.pollNow()`.
3. `armTakeoverObserver()`: `effect(() => { if (alarmFacade.alarmVm().state === 'active' && featureFlags.has('evnt.alarm-autoroute')) router.navigate(['/alarm']); })`.
4. `teardown()`: remove all listeners, unsubscribe effect, clear interval — zero dangling side-effects.
5. Expose `monitoringVm()` as a passthrough for the global Shell banner (SPEC-06 §2).

## Non-goals

- No alarm state setting (the facade owns state).
- No SW registration (INT-FE-EVNT-002 owns that).

## Layer(s)

frontend / integration (`libs/evnt/integration/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-06-shell-integration.md` §2–§3
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §5.3–§5.4

## Architecture alignment

- Standalone + Signals + Effects
- No dangling listeners after teardown (carry-forward `fe-integration:dangling-listeners`)
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Integration layer**
- [ ] `libs/evnt/integration/src/lib/evnt-shell-integration.service.ts`
- [ ] `libs/evnt/integration/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (visibilitychange → pause/resume; online/offline → pause/resume + immediate poll; takeover observer routes; teardown leaves no listeners; monitor banner surfaced when degraded)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P4 / Hub integrations

## Labels

type:domain
layer:frontend
scope:evnt
priority:P4
safety:monitoring

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- Tab-hidden → `MonitoringVM.polling='paused-hidden'` (unit test with fake visibility)
- Tab-visible → immediate poll triggered within the same tick (not after one interval)
- `teardown()` removes all event listeners (spy on removeEventListener)

## Dependencies

- FE-EVNT-009 (AlarmFacade.pausePoll / resumePoll / pollNow)
- FE-EVNT-005 (evntBootstrap calls wireVisibility/wireConnectivity)
- INT-FE-EVNT-002 (push relays bridged here)

## Tenant-context impact

Teardown clears EVNT signals on tenant switch.

## Risks / Notes

- SAFETY: immediate poll on tab-visible is critical for < 5 s p95 commitment.
- Dangling timers/listeners are a common defect — test teardown thoroughly.

## Prioridade

P4
