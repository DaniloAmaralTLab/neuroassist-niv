# FE-EVNT-026 -- [SAFETY-1] E2E stubs — push-escalation.feature (11 scenarios, Web Push + escalation)

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`apps/evnt-e2e/src/e2e/push-escalation.spec.ts` contains 11 scenarios covering the full Web Push enrollment and escalation flows: grant/deny/block permission, subscribe, 410 Gone idempotent, `pushsubscriptionchange`, `notificationclick` → /alarm + poll, channel-status contact-missing, and escalation-trail read.

## Context / Problem statement

- SAFETY-1 (ADR-005): Tier 0 Web Push is the first escalation channel. The e2e scenarios prove enrollment, failure modes, and channel-status accuracy (SPEC-08 §5, `contracts/backend-api-cross-link.md` §SAFETY-1).
- Playwright requires `context.grantPermissions(['notifications'])` or `browser.newContext({ permissions: [] })` to simulate denied/blocked scenarios (SPEC-08 §5.1).
- Mock `PUSH_PORT`: the SW is not real in e2e — `INT-FE-EVNT-006` provides a `PushSubscriptionMockAdapter` that the Shell uses in `Cypress/Playwright` test mode.
- 11 scenarios: (1) enroll success; (2) permission denied → channel blocked; (3) permission default → prompt shown; (4) 410 on DELETE → no toast; (5) pushsubscriptionchange → resubscribe + no toast; (6) notificationclick → route /alarm + immediate poll; (7) SMS contact-missing (INT-EVNT-ACS-001 open); (8) Voice contact-missing; (9) escalation trail read; (10) escalation trail HTTP error → inline retry; (11) push-disable success.

## Approach (execution path)

1. Create `apps/evnt-e2e/src/e2e/push-escalation.spec.ts` with 11 scenarios.
2. Use `browserContext.grantPermissions(['notifications'])` for granted scenarios.
3. Use `browserContext.overridePermissions(origin, [])` or `browser.newContext({ permissions: [] })` for denied/default.
4. Mock PUSH_PORT via `PushSubscriptionMockAdapter` from INT-FE-EVNT-006 (no real SW).
5. `notificationclick` scenario: dispatch a custom `notification-click` event that the shell relay handles.
6. Contact-missing scenarios: seed `PushChannelVM` with `sms='contact-missing'`, `voice='contact-missing'`.

## Non-goals

- No real Notification push dispatch (browser cannot receive actual push in Playwright).
- No real SW registration (mock only).

## Layer(s)

frontend / e2e (`apps/evnt-e2e/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-08-e2e-scenarios.md` §5
- `docs/architecture/frontend/modules/evnt/frontend/contracts/backend-api-cross-link.md` §SAFETY-1

## Architecture alignment

- Playwright grantPermissions + mock PUSH_PORT
- Stub-integrity rule
- Tag Nx: `scope:evnt`, `type:e2e`

## Implementation checklist (by file)

**e2e layer**
- [ ] `apps/evnt-e2e/src/e2e/push-escalation.spec.ts` (11 scenarios)
- [ ] `apps/evnt-e2e/src/support/push-stubs.ts` (mock push dispatch helpers)

**Tests**
- [ ] `npx nx e2e evnt-e2e` PASS for all 11 scenarios
- [ ] `npx nx lint evnt-e2e` PASS

## Milestone

Wave P9 / e2e + Hardening

## Labels

type:e2e
layer:frontend
scope:evnt
priority:P9
safety:push-e2e

## Acceptance criteria

- `npx nx e2e evnt-e2e` PASS for all 11 scenarios
- Denied permission → channel shows "blocked" (not "off")
- 410 on DELETE → no error toast (scenario 4)
- `notificationclick` → routes to `/alarm` and calls `pollNow` (scenario 6)
- Contact-missing shown for SMS and Voice (scenarios 7–8)

## Dependencies

- FE-EVNT-017 (EscalationChannelStatusComponent)
- FE-EVNT-018 (NotificationPermissionPromptComponent)
- FE-EVNT-019 (Push lifecycle)
- INT-FE-EVNT-006 (mock PUSH_PORT + stub SW)

## Tenant-context impact

Nenhum (e2e test tenant stub).

## Risks / Notes

- SAFETY: these scenarios are the contractual proof of SAFETY-1 (Web Push enrollment). Must NEVER be skipped or marked `.skip`.
- Playwright cannot receive real browser push — only the enrollment and channel-status scenarios are verifiable here; actual delivery is a BE integration test concern.

## Prioridade

P9
