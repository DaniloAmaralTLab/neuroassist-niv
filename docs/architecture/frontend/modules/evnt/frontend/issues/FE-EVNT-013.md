# FE-EVNT-013 -- AlarmEmptyStateComponent + AcknowledgedConfirmationComponent

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

Two presentational components: `AlarmEmptyStateComponent` (calm "no active emergency" — rendered ONLY after a successful read returned null) and `AcknowledgedConfirmationComponent` (transient session feedback after a successful confirm). Both standalone, OnPush.

## Context / Problem statement

- SAFETY invariant: `AlarmEmptyStateComponent` MUST render ONLY when `AlarmVM.state='none'` — which is set only after a positive server answer of `activeAlarm: null`. It MUST NEVER be shown while a read is paused/offline/failing (the `MonitoringStatusBanner` covers those states instead).
- `AcknowledgedConfirmationComponent` is a transient feature-local signal (`confirmedInThisSessionId` pattern) — not persisted projection state. It shows briefly then the next read cycle returns to `none` and the Shell navigates back to Home.
- Bloqueia: FE-EVNT-011

## Approach (execution path)

1. `AlarmEmptyStateComponent`: input `visible: boolean`. Renders only when `visible=true` (driven by `AlarmVM.state='none'`). Content: calm "no active emergency right now" message.
2. `AcknowledgedConfirmationComponent`: input `vm: AcknowledgedVM`. Renders "Attendance confirmed at HH:mm by {confirmedByName}" using a time-format pipe. Auto-dismissed on the next projection cycle.
3. Neither component inspects the network state or sets `state='none'` on its own.

## Non-goals

- No monitoring state handling — that is `MonitoringStatusBannerComponent` (FE-EVNT-014).
- No persistent audit display — that is HIST.

## Layer(s)

frontend / feature (`libs/evnt/feature-alarm/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §1
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §2

## Architecture alignment

- Standalone + OnPush
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-alarm/src/lib/alarm-empty-state/alarm-empty-state.component.ts`
- [ ] `libs/evnt/feature-alarm/src/lib/acknowledged-confirmation/acknowledged-confirmation.component.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (empty-state renders only on visible=true; confirmed-confirmation renders vm.confirmedByName and formats time)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P3 / Feature libs

## Labels

type:feature
layer:frontend
scope:evnt
priority:P3

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `AlarmEmptyStateComponent` renders only when `visible=true`
- `AcknowledgedConfirmationComponent` renders `confirmedAt` via a time-format pipe (never raw ISO string)
- Neither component sets any alarm state on its own

## Dependencies

- FE-EVNT-011 (AlarmPageComponent drives these)

## Tenant-context impact

Nenhum.

## Risks / Notes

- SAFETY: the empty state is a POSITIVE server answer — it is NEVER the absence of an answer. AlarmPageComponent is responsible for not passing `visible=true` while the read is degraded.

## Prioridade

P3
