# FE-EVNT-015 -- RoutineNoticeListComponent + RoutineNoticeCardComponent + RoutineNoticeIndicatorComponent

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/feature-notifications/` contains three components: `RoutineNoticeListComponent` (smart, Home notice slot), `RoutineNoticeCardComponent` (presentational, dismissal + markNotReal), and `RoutineNoticeIndicatorComponent` (presentational, topbar). Routine notices are NEVER promoted to the full-screen alarm.

## Context / Problem statement

- Routine events are discreet, non-blocking — they reach the caregiver in the Home notice slot and the topbar indicator, never via the `/alarm` takeover (ADR-005 §Decision 4, SPEC-02 §2).
- An unknown urgency degrades conservatively to routine (NEVER to alarm), never silently dropped (SPEC-03 §3 invariant).
- Dismiss is feature-local (`seen=true`) — it does not write to the server and does not re-pop within the session (SPEC-04 §1 "not a data cache").
- `markNotReal` sends `evnt.event.record` (never the superseded `evnt.event.feedback` — G-EVNT-1) — RBAC gated by `canRecordFeedback = accessDecision.can('evnt.event.record')`.
- The indicator shows a count/affordance — opening reveals the RoutineNoticeList (never an alarm takeover).

## Approach (execution path)

1. `RoutineNoticeListComponent`: reads `alarmFacade.routineNoticesVm()` and `accessDecision.can('evnt.event.record')`. Hosts `RoutineNoticeCard` for each notice.
2. `RoutineNoticeCardComponent`: inputs `vm: RoutineNoticeVM`, `canRecordFeedback: boolean`. Outputs `dismissRequested` (sets `seen=true` locally), `markNotRealRequested` (emits `{eventId, verdict: 'false_positive'}`). `markNotReal` action hidden WHILE `!canRecordFeedback`.
3. `RoutineNoticeIndicatorComponent`: inputs `count: number`, `hasUnseen: boolean`. Discreet badge; opening action is a topbar affordance (never the takeover route).
4. Use `evnt.event.record` for the feedback write authority string — not `evnt.event.feedback`.

## Non-goals

- No full event history (HIST owns that).
- No cross-patient aggregation (DASH owns that).
- Dismiss does not make a server call.

## Layer(s)

frontend / feature (`libs/evnt/feature-notifications/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §2
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §3

## Architecture alignment

- Standalone + OnPush + Signals
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-notifications/src/lib/routine-notice-list/routine-notice-list.component.ts`
- [ ] `libs/evnt/feature-notifications/src/lib/routine-notice-list/routine-notice-list.component.html`
- [ ] `libs/evnt/feature-notifications/src/lib/routine-notice-card/routine-notice-card.component.ts`
- [ ] `libs/evnt/feature-notifications/src/lib/routine-notice-indicator/routine-notice-indicator.component.ts`
- [ ] `libs/evnt/feature-notifications/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (markNotReal hidden when !canRecordFeedback; dismiss is local only; unknown urgency stays routine; indicator shows count)
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
- `npx nx build evnt` PASS
- `markNotReal` uses authority `evnt.event.record` (not `evnt.event.feedback`)
- Dismiss does not trigger an HTTP call
- Unknown urgency notice is NOT promoted to alarm (stays in routine list)
- `markNotReal` action hidden WHILE `canRecordFeedback=false`

## Dependencies

- FE-EVNT-009 (AlarmFacade.routineNoticesVm())

## Tenant-context impact

Nenhum direto.

## Risks / Notes

- Authority key: use `evnt.event.record` exactly — the superseded `evnt.event.feedback` is a reconciliation error (G-EVNT-1).

## Prioridade

P3
