# FE-EVNT-011 -- AlarmPageComponent (smart, OnPush) + feature-alarm routes

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/feature-alarm/src/lib/alarm-page/` has `AlarmPageComponent`: standalone, OnPush, reads `alarmFacade.alarmVm()` and `monitoringVm()` signals, gates the acknowledge action via `accessDecision.can('evnt.event.confirm')`, is an ARIA `alertdialog`, and focuses on takeover / restores focus after acknowledge.

## Context / Problem statement

- The alarm page is a takeover, not a standard navigable page — it is an ARIA `alertdialog` with an accessible name, announced on appearance (carry-forward `fe-component:a11y-live-region`).
- Acknowledge button receives focus on takeover render; focus returns to prior context after confirm (carry-forward `fe-component:modal-focus-return`).
- The component reads `alarmVm()` and `monitoringVm()` from AlarmFacade — never derives urgency or confirmed-state from a timer.
- `canConfirm` is derived from `accessDecision.can('evnt.event.confirm')` at the component level (not only from the route guard) — a caregiver may read but not confirm (SPEC-01 §1).
- Bloqueia: FE-EVNT-012, FE-EVNT-013, FE-EVNT-014

## Approach (execution path)

1. Create `feature-alarm/src/lib/alarm.routes.ts` with `ALARM_ROUTES` for `loadComponent`.
2. Create `AlarmPageComponent`: standalone, OnPush, inject `AlarmFacade` and `AccessDecisionService`. Expose `alarmVm = alarmFacade.alarmVm()` and `monitoringVm = alarmFacade.monitoringVm()` as component-level signals.
3. `canConfirm = computed(() => accessDecisionService.can('evnt.event.confirm'))`.
4. Template: render `EmergencyAlarmComponent` WHILE `state='active'`; `AlarmEmptyStateComponent` WHILE `state='none'`; `AcknowledgedConfirmationComponent` WHILE `state='acknowledged'`; `MonitoringStatusBannerComponent` always.
5. Set `role="alertdialog"` and `aria-label` on the host. Announce on appearance via `LiveAnnouncer` or `aria-live` region.
6. On takeover: focus the acknowledge button. After successful confirm: return focus to prior element.
7. No breadcrumb config (SPEC-01 §1).

## Non-goals

- No inline role checks — only `accessDecision.can()` signals.
- No inference from timer — alarm state is read-only from facade.

## Layer(s)

frontend / feature (`libs/evnt/feature-alarm/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §1
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §1

## Architecture alignment

- Standalone + OnPush + Signals
- ARIA alertdialog + focus management (carry-forward a11y)
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-alarm/src/lib/alarm.routes.ts`
- [ ] `libs/evnt/feature-alarm/src/lib/alarm-page/alarm-page.component.ts`
- [ ] `libs/evnt/feature-alarm/src/lib/alarm-page/alarm-page.component.html`
- [ ] `libs/evnt/feature-alarm/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (renders correct child for each AlarmState; canConfirm hidden when missing; MonitoringBanner always present)
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
- Component has `role="alertdialog"` (or equivalent ARIA role)
- `canConfirm` is derived from `accessDecisionService.can('evnt.event.confirm')`, not from route guard
- AlarmEmptyStateComponent renders only when `alarmVm.state='none'`

## Dependencies

- FE-EVNT-009 (AlarmFacade)
- FE-EVNT-006 (canConfirmEventGuard concept)
- FE-EVNT-012, FE-EVNT-013, FE-EVNT-014 (sub-components)

## Tenant-context impact

Nenhum direto.

## Risks / Notes

- Carry-forward a11y: ARIA alertdialog must be announced on appearance (assistive tech product).
- Focus management is critical for keyboard/assistive-device users.

## Prioridade

P3
