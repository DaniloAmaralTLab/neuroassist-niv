# FE-EVNT-014 -- [SAFETY] MonitoringStatusBannerComponent — always-visible degraded-state rendering

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`MonitoringStatusBannerComponent` is always evaluated in `AlarmPageComponent`. It renders a visible, non-dismissible safety notice WHILE `MonitoringVM.foregroundRequired=true` (polling IN {paused-hidden, offline, stale}). It NEVER renders a false all-clear and NEVER is silent. A Retry action triggers an immediate poll.

## Context / Problem statement

- SAFETY mandate (assistive product): delivery limitations must be VISIBLE, not silent (SPEC-02 §1, SPEC-03 §4, SPEC-04 §5, SPEC-07 §2.1).
- WHILE monitoring is degraded: "monitoring paused — keep this window in front", "offline — alarms delayed", "status stale" per `PollingState`.
- It NEVER shows a "monitoring ok / all systems go" message that could give false confidence — it is only visible WHILE `foregroundRequired=true`.
- The component is non-dismissible (a dismissed safety notice is a silent failure).
- Retry in the banner triggers an immediate `getActiveAlarm` poll in `AlarmFacade`.
- Bloqueia: FE-EVNT-011 (AlarmPageComponent always renders this)

## Approach (execution path)

1. Create `MonitoringStatusBannerComponent`: standalone, OnPush. Input `vm: MonitoringVM`.
2. WHILE `vm.foregroundRequired` is true: render the visible banner with `vm.message` and a Retry button.
3. WHILE `vm.foregroundRequired` is false: render nothing (or an invisible placeholder — no false "all clear").
4. Retry: output `retryRequested` (AlarmPageComponent calls `alarmFacade.pollNow()`).
5. Messages per `PollingState`: `paused-hidden` → "Keep this window in front to receive alarms"; `offline` → "Offline — alarms may be delayed"; `stale` → "Status stale — checking connection".
6. The banner is non-dismissible by the user.

## Non-goals

- No alarm state changes (the banner is a read-only status indicator).
- No "you're covered" / "all systems go" message.

## Layer(s)

frontend / feature (`libs/evnt/feature-alarm/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §1
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §5.3–§5.5
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-07-error-handling.md` §2.1–§3

## Architecture alignment

- Standalone + OnPush
- Safety mandate: limitation is visible (assistive product)
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-alarm/src/lib/monitoring-status-banner/monitoring-status-banner.component.ts`
- [ ] `libs/evnt/feature-alarm/src/lib/monitoring-status-banner/monitoring-status-banner.component.html`

**Tests**
- [ ] `npx nx test evnt` PASS (SAFETY: visible when foregroundRequired=true; hidden when false; shows correct message per PollingState; Retry emits retryRequested; no "all clear" text ever rendered)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P3 / Feature libs

## Labels

type:feature
layer:frontend
scope:evnt
priority:P3
safety:monitoring

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- Component visible WHILE `foregroundRequired=true` (3 PollingStates)
- Component hidden / zero-height WHILE `foregroundRequired=false`
- No "all clear" or "you're covered" text in any template state
- Retry output emitted on Retry button click
- Component is not dismissible by user interaction

## Dependencies

- FE-EVNT-011 (AlarmPageComponent always renders MonitoringStatusBanner)

## Tenant-context impact

Nenhum.

## Risks / Notes

- SAFETY: THIS IS THE MOST CRITICAL UI COMPONENT IN EVNT. A hidden or silently-cleared monitoring banner is a safety regression — the caregiver may miss an emergency.

## Prioridade

P3
