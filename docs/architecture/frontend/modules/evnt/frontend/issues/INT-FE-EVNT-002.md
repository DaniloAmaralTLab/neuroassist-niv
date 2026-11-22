# INT-FE-EVNT-002 -- Shell app SW ownership — ngsw-worker.js / sw-push.js, notificationclick handler, push relay

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`apps/neuroassist-niv-web` owns the service worker registration. `sw-push.js` (or the `@angular/pwa` ngsw) handles `notificationclick` and relays push events to `EvntShellIntegrationService`. Browser allows only one SW per origin — EVNT lib does NOT register a SW.

## Context / Problem statement

- One SW per origin: the shell app registers it; `libs/evnt` cannot register its own SW (SPEC-06 §5, D-493 prototype-to-production).
- The SW receives `notificationclick` → posts a message to the main thread → `EvntShellIntegrationService.bindPushBridge()` relays it to `AlarmFacade.pollNow()` + `Router.navigate(['/alarm'])`.
- The SW receives `push` events → posts a message to main thread for in-app delivery (when app is in foreground, suppress the native notification to avoid double-alert).
- `pushsubscriptionchange` from the browser → SW posts message → `EvntShellIntegrationService` relays to `PushChannelFacade.handleSubscriptionChange()`.
- In development/test, the MOCK SW (`INT-FE-EVNT-006`) replaces the real SW.

## Approach (execution path)

1. `apps/neuroassist-niv-web/src/sw-push.js` (or `ngsw-worker.js` override): handle `notificationclick`, `push`, `pushsubscriptionchange`.
2. `notificationclick`: `self.clients.openWindow('/alarm')` + postMessage `{ type: 'evnt:notification-click' }`.
3. Shell `AppComponent` or `evntBootstrap.ts`: `navigator.serviceWorker.addEventListener('message', handlePushMessage)` → relay to `EvntShellIntegrationService.bindPushBridge()`.
4. `EvntShellIntegrationService.bindPushBridge(registration)` wires up subscription change and click handlers (FE-EVNT-021).
5. `angular.json` for `neuroassist-niv-web`: set `"serviceWorker": true`, reference `sw-push.js` as augment.

## Non-goals

- No SW logic in `libs/evnt`.
- No standalone push delivery (the SW only relays — EVNT owns enrollment and routing).

## Layer(s)

frontend / shell (`apps/neuroassist-niv-web/`)

## Bounded context

evnt (integration with shell)

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-06-shell-integration.md` §5

## Architecture alignment

- One SW per origin (shell-only registration)
- Push relay to EvntShellIntegrationService
- Tag Nx: `scope:shell`, `type:integration`

## Implementation checklist (by file)

**Shell app**
- [ ] `apps/neuroassist-niv-web/src/sw-push.js` (notificationclick + push + pushsubscriptionchange handlers)
- [ ] `apps/neuroassist-niv-web/src/app/app.component.ts` (serviceWorker message listener → bindPushBridge)
- [ ] `apps/neuroassist-niv-web/angular.json` (serviceWorker: true, sw script ref)

**Tests**
- [ ] `npx nx test neuroassist-niv-web` PASS (message relay; notificationclick → route /alarm; pushsubscriptionchange relayed)
- [ ] `npx nx lint neuroassist-niv-web` PASS

## Milestone

Wave P4 / Hub integrations

## Labels

type:integration
layer:frontend
scope:shell
priority:P4

## Acceptance criteria

- `npx nx test neuroassist-niv-web` PASS
- `npx nx lint neuroassist-niv-web` PASS
- `notificationclick` SW event → `evnt:notification-click` message → router navigates to `/alarm`
- `pushsubscriptionchange` SW event → relay reaches `PushChannelFacade.handleSubscriptionChange()`

## Dependencies

- FE-EVNT-020 (EvntShellIntegrationService.bindPushBridge)
- FE-EVNT-021 (push relay bridge)
- INT-FE-EVNT-006 (mock SW for dev/test)

## Tenant-context impact

SW is per-origin, shared across tenant sessions on the same device.

## Risks / Notes

- If EVNT ever registers its own SW in a future feature, it will conflict with the shell SW. The shell SW must be the single registration point.

## Prioridade

P4
