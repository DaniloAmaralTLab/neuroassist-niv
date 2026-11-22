# FE-EVNT-018 -- [SAFETY] NotificationPermissionPromptComponent + permission UX

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`NotificationPermissionPromptComponent` renders a one-line "why" explanation and an "Enable alarm notifications" affordance. `Notification.requestPermission()` is called ONLY from an explicit caregiver gesture — NEVER on first paint and NEVER in a retry loop. A denied origin shows how to re-enable in site settings.

## Context / Problem statement

- SAFETY: a first-paint permission prompt is likely to be dismissed by caregivers → hard-`denied` → Tier 0 Web Push silently lost (SPEC-04 §5.7 carry-forward `fe-push:no-permission-prompt-on-first-paint`).
- After a `default` dismiss the FE keeps a visible "Enable alarm notifications" re-ask affordance.
- After a `denied` the FE CANNOT re-prompt (browser hard-block) — it shows how to re-enable in site settings and NEVER pretends push is on (carry-forward `fe-push:permission-denied-must-degrade-visibly-not-loop`).
- The one-line explanation: "so we can still reach you when this window isn't in front".

## Approach (execution path)

1. Create `NotificationPermissionPromptComponent`: standalone, OnPush. Input `permission: PushPermission`. Output `enableRequested` (emits only from button click — the browser `requestPermission` is called from the parent `PushEnrollmentComponent` on this output).
2. WHILE `permission='default'`: render a one-line explanation + "Enable alarm notifications" button.
3. WHILE `permission='denied'`: render "Push is blocked" + "How to re-enable in browser settings" link (output `reauthHelpRequested`). NEVER shows a re-prompt button (the browser will silently ignore it).
4. WHILE `permission='granted'`: render nothing (the enrollment status is shown in `EscalationChannelStatusComponent`).
5. `PushEnrollmentComponent` calls `Notification.requestPermission()` on `enableRequested` and handles the result — NEVER on paint / NEVER on a silent load.

## Non-goals

- No `Notification.requestPermission()` in this component — it emits `enableRequested`.
- No push subscribe — that is FE-EVNT-019.

## Layer(s)

frontend / feature (`libs/evnt/feature-push/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §5.7

## Architecture alignment

- Standalone + OnPush
- Carry-forward `fe-push:no-permission-prompt-on-first-paint`
- Carry-forward `fe-push:permission-denied-must-degrade-visibly-not-loop`
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Feature lib**
- [ ] `libs/evnt/feature-push/src/lib/notification-permission-prompt/notification-permission-prompt.component.ts`
- [ ] `libs/evnt/feature-push/src/lib/notification-permission-prompt/notification-permission-prompt.component.html`

**Tests**
- [ ] `npx nx test evnt` PASS (enableRequested emits on button click, not on ngOnInit; denied → shows re-enable instructions, not re-prompt button; granted → renders nothing)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P3 / Feature libs

## Labels

type:feature
layer:frontend
scope:evnt
priority:P3
safety:push-permission

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- Component does NOT call `Notification.requestPermission()` on `ngOnInit` or any lifecycle hook
- WHILE `permission='denied'`: renders re-enable instructions, no re-prompt button
- WHILE `permission='granted'`: renders nothing

## Dependencies

- FE-EVNT-017 (PushEnrollmentComponent hosts this)

## Tenant-context impact

Nenhum.

## Risks / Notes

- Carry-forward: a first-paint prompt causes browsers to hard-deny the origin, silently killing Tier 0 Web Push.

## Prioridade

P3
