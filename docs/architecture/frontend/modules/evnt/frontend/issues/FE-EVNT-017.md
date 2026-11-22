# FE-EVNT-017 -- [SAFETY] PushEnrollmentComponent + EscalationChannelStatusComponent

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/feature-push/` contains `PushEnrollmentComponent` (smart) and `EscalationChannelStatusComponent` (presentational). The status renders an honest `PushChannelVM` tri-state per channel: Push on/off/blocked/unsupported; SMS/Voice available/contact-missing. NEVER a "covered" message it cannot back. `canManage` from `AccessDecisionService`.

## Context / Problem statement

- SAFETY mandate: the channel-status indicator is the caregiver's honest answer to "if I close this window, how do I get reached?" — it must NEVER show green "covered" for a channel that is not actually armed (SPEC-04 §5.7, SPEC-02 §2a).
- WHILE `INT-EVNT-ACS-001` is OPEN: SMS and Voice channels render `contact-missing` (not "covered") because the caregiver phone is not yet exposed by ACS (SPEC-03 §4a invariant).
- Push tri-state: `granted` + `pushEnrolled=true` → on; `granted` + `!pushEnrolled` → off; `denied` → blocked; `unsupported` → unsupported.
- `canManage = accessDecision.can('evnt.subscription.create')` gates the enable affordance.
- `EscalationChannelStatusComponent` is always reachable from the escalation-status surface / settings slot.

## Approach (execution path)

1. `PushEnrollmentComponent`: smart, OnPush. Reads `pushChannelFacade.pushChannelVm()`. `canManage = accessDecision.can('evnt.subscription.create')`. Hosts `EscalationChannelStatusComponent`. Hosts `NotificationPermissionPromptComponent` (FE-EVNT-018). Handles `enableRequested` / `disableRequested` outputs.
2. `EscalationChannelStatusComponent`: presentational. Input `vm: PushChannelVM`. Outputs `enableRequested`, `disableRequested`, `reauthHelpRequested`. Renders per-channel honest state. WHILE `permission='denied'`: show how to re-enable in site settings (output `reauthHelpRequested`).
3. WHILE `sms='contact-missing'` or `voice='contact-missing'`: render "Add a phone number to enable" (never "covered").
4. The `EscalationChannelStatus` surface is declared in `EVNT_MODULE_DESCRIPTOR.shellSurfaces`.

## Non-goals

- No `Notification.requestPermission()` call here — that is FE-EVNT-018.
- No push lifecycle (subscribe/unsubscribe) — that is FE-EVNT-019.

## Layer(s)

frontend / feature (`libs/evnt/feature-push/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-02-component-hierarchy.md` §2a
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4a

## Architecture alignment

- Standalone + OnPush + Signals
- Honest channel status — never fabricated "covered" (SAFETY mandate)
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-push/src/lib/push-enrollment/push-enrollment.component.ts`
- [ ] `libs/evnt/feature-push/src/lib/push-enrollment/push-enrollment.component.html`
- [ ] `libs/evnt/feature-push/src/lib/escalation-channel-status/escalation-channel-status.component.ts`
- [ ] `libs/evnt/feature-push/src/lib/escalation-channel-status/escalation-channel-status.component.html`
- [ ] `libs/evnt/feature-push/src/index.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (contact-missing renders when sms/voice='contact-missing'; push off when !pushEnrolled; blocked when permission='denied'; enable affordance hidden when !canManage)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P3 / Feature libs

## Labels

type:feature
layer:frontend
scope:evnt
priority:P3
safety:push-channel

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- No "covered" / "protected" text when `sms='contact-missing'` or `voice='contact-missing'`
- Push shows "off" when `pushEnrolled=false` (even if permission=granted)
- Push shows "blocked" when `permission='denied'`
- Enable affordance hidden when `canManage=false`

## Dependencies

- FE-EVNT-010 (PushChannelFacade)
- INT-FE-EVNT-003 (ACS phone channel dependency tracking)

## Tenant-context impact

Nenhum.

## Risks / Notes

- SAFETY: the most critical invariant is "never claim covered for an unarmed channel". This is an assistive product.

## Prioridade

P3
