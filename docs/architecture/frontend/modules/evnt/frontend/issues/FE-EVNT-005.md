# FE-EVNT-005 -- evnt.bootstrap.ts — init/destroy lifecycle

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/src/lib/evnt.bootstrap.ts` exports `evntBootstrap: ModuleBootstrap` with `init()` and `destroy()` correctly wired: poll starts, visibility/connectivity listeners are attached, takeover observer is armed, push bridge is set up idempotently on init; all are cleaned up on destroy without unsubscribing the browser push subscription.

## Context / Problem statement

- The bootstrap orchestrates all long-lived EVNT side-effects for the session (SPEC-06 §3).
- `init` must wire the poll, page-visibility, and push bridge WITHOUT requesting notification permission (SPEC-04 §5.7) — permission only on explicit gesture.
- `destroy` must leave no dangling poll timers or event listeners, but MUST NOT unsubscribe the browser push subscription (it must survive the dashboard being closed — that is the point of Tier 0).
- A tenant switch during the session invalidates any future EVNT state — handled in destroy.
- Bloqueia: FE-EVNT-020 (depends on bootstrap being wired to integration service)

## Approach (execution path)

1. Create `evntBootstrap` with `init(ctx)` calling `alarmFacade.startPolling()`, `evntShellIntegrationService.wireVisibility()`, `evntShellIntegrationService.wireConnectivity()`, `evntShellIntegrationService.armTakeoverObserver()`, then push bridge idempotent re-register (WHERE `evnt.push-escalation` flag on and permission already granted — never prompt here).
2. `destroy(ctx)` calls `alarmFacade.stopPolling()`, `evntShellIntegrationService.teardown()`, clears EVNT signals, detaches push relays — does NOT call `pushSubscription.unsubscribe()`.
3. No login logic (owned by `@neuroassist/shared/auth-session`).
4. No tenant writes (EVNT reads tenant from JWT, never writes it).

## Non-goals

- No AlarmFacade implementation — that is FE-EVNT-009.
- No EvntShellIntegrationService — that is FE-EVNT-020.
- No permission prompt — that is FE-EVNT-018.

## Layer(s)

frontend / tool entry (`libs/evnt/src/lib/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-06-shell-integration.md` §3

## Architecture alignment

- Standalone + Signals
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Lib path**
- [ ] `libs/evnt/src/lib/evnt.bootstrap.ts`
- [ ] `libs/evnt/src/index.ts` (export evntBootstrap)

**Tests**
- [ ] `npx nx test evnt` PASS (unit: init starts poll, destroy stops poll and does NOT unsubscribe push)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P1 / Foundation

## Labels

type:domain
layer:frontend
scope:evnt
priority:P1

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- `destroy()` calls are verified not to invoke `pushManager.getSubscription().unsubscribe()` (unit test)
- `init()` does not call `Notification.requestPermission()` (unit test)

## Dependencies

- FE-EVNT-009 (AlarmFacade.startPolling / stopPolling)
- FE-EVNT-020 (EvntShellIntegrationService.wireVisibility / teardown)
- FE-EVNT-019 (push bridge refresh)

## Tenant-context impact

`destroy()` invalidates EVNT state on tenant switch so a re-entry starts clean.

## Risks / Notes

- Dangling poll timer risk: test with a fake clock that the timer is cleared in destroy.
- Do NOT unsubscribe the browser SW push subscription in destroy (must survive dashboard close).

## Prioridade

P1
