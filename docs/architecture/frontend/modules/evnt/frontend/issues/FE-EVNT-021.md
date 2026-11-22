# FE-EVNT-021 -- [SAFETY] Channel-status indicator integration — PushChannelVM contact-missing, SW push bridge

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`EvntShellIntegrationService` passes the shell's ready SW registration to `PushChannelFacade`. `PushChannelVM.sms` and `.voice` are `contact-missing` WHILE `INT-EVNT-ACS-001` is OPEN. The channel-status indicator is always reachable. Phone channels flip to available without a FE release when ACS exposes the phone.

## Context / Problem statement

- SAFETY: ACS does not yet expose the caregiver phone → Tiers 1/2 record `no-contact` BE-side. FE MUST render `contact-missing`, never "covered" (SPEC-04 §5.7, SPEC-03 §4a invariant, `INT-EVNT-ACS-001`).
- When ACS lands the contact capability, the phone channels flip to available from a BE signal — the FE never guesses from data absence.
- The SW registration is a Shell concern (one SW per origin). The shell passes `navigator.serviceWorker.ready` / `SwPush` to `PushChannelFacade` via `EvntShellIntegrationService.bindPushBridge(registration)` (SPEC-06 §5).
- notificationclick and pushsubscriptionchange are relayed into the facade from the shell's SW handlers.

## Approach (execution path)

1. In `EvntShellIntegrationService.bindPushBridge(registration)`: pass the SW ready registration to `PushChannelFacade`. Relay `pushsubscriptionchange` → `pushChannelFacade.handleSubscriptionChange(...)`.
2. In `EvntShellIntegrationService`: relay `notificationclick` (or `SwPush.notificationClicks`) → `router.navigate(['/alarm'])` + `alarmFacade.pollNow()`.
3. `PushChannelFacade`: derives `sms`/`voice` availability from a BE/ACS capability endpoint or a default of `contact-missing`. WHILE the ACS capability is not signalled: both are `contact-missing`.
4. The `EscalationChannelStatus` surface is included in `EVNT_MODULE_DESCRIPTOR.shellSurfaces` and always accessible from the settings/escalation slot.

## Non-goals

- No SW registration (INT-FE-EVNT-002).
- No push subscribe (FE-EVNT-019).
- No phone number display (ACS does not expose it; masked by design).

## Layer(s)

frontend / integration (`libs/evnt/integration/`) + data-access (`libs/evnt/data-access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-06-shell-integration.md` §5
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-03-view-models.md` §4a
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §5.7

## Architecture alignment

- SW push bridge from shell to EVNT lib
- contact-missing default while ACS capability absent
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Integration / data-access**
- [ ] `libs/evnt/integration/src/lib/evnt-shell-integration.service.ts` (bindPushBridge, notificationclick relay)
- [ ] `libs/evnt/data-access/src/lib/push-channel.facade.ts` (sms/voice from ACS capability; default contact-missing)
- [ ] `libs/evnt/data-access/src/lib/push-channel.vm.ts` (PhoneChannelState types)
- [ ] `apps/neuroassist-niv-web/src/app/evnt-module/evnt-module.ts` (bindPushBridge called in shell with SW registration)

**Tests**
- [ ] `npx nx test evnt` PASS (sms=contact-missing default; notificationclick → route /alarm + pollNow; pushsubscriptionchange relayed to facade)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P4 / Hub integrations

## Labels

type:domain
layer:frontend
scope:evnt
priority:P4
safety:push-channel

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `PushChannelVM.sms` = `contact-missing` when ACS capability absent
- `PushChannelVM.voice` = `contact-missing` when ACS capability absent
- notificationclick handler routes to `/alarm` and calls `alarmFacade.pollNow()`

## Dependencies

- FE-EVNT-010 (PushChannelFacade)
- FE-EVNT-019 (push lifecycle)
- FE-EVNT-020 (EvntShellIntegrationService.wireVisibility)
- INT-FE-EVNT-002 (SW registration)
- INT-FE-EVNT-003 (ACS phone channel tracking)

## Tenant-context impact

Subscription is tenant-scoped on the BE side.

## Risks / Notes

- INT-EVNT-ACS-001 is OPEN: plan for the ACS capability signal to arrive WITHOUT a FE release (feature flag or BE response field toggle).

## Prioridade

P4
