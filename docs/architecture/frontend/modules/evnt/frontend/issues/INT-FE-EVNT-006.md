# INT-FE-EVNT-006 -- Mock PUSH_PORT + stubbed SW for dev/E2E

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`PushSubscriptionMockAdapter` (implements `PushSubscriptionPort`) is available for development and e2e use. It stubs push subscription lifecycle without a real SW. Auto-enroll is OFF in dev mode. `VAPID_PUBLIC_KEY_STUB` is set in `environment.development.ts`.

## Context / Problem statement

- In development and e2e, there is no real service worker or push endpoint. Without a mock, every push-related action throws or hangs (SPEC-04 §5.6, SPEC-08 §5.1).
- `PushSubscriptionMockAdapter` must NOT auto-enroll on startup — the developer or test must explicitly trigger enrollment (carry-forward `fe-push:auto-enroll-dev-noise`).
- The mock adapter records calls for test assertions: `subscribeCallCount`, `lastSubscribeArgs`, `deleteCallCount`.
- `environment.development.ts` includes `vapidPublicKey: 'VAPID_STUB_DO_NOT_USE_IN_PROD'` — a recognizable stub value that fails loudly if used in a real push call.

## Approach (execution path)

1. Create `libs/evnt/data-access/src/lib/push-subscription-mock.adapter.ts`: implements `PushSubscriptionPort`. Methods: `subscribe()` → returns a fake subscription (or returns null to simulate denied). `refresh()` → no-op. `unsubscribe(id)` → records call. `handleSubscriptionChange()` → no-op.
2. `provideEvnt({ mode: 'mock' })` in test/dev environment: `{ provide: PUSH_SUBSCRIPTION_PORT, useClass: PushSubscriptionMockAdapter }`.
3. `environment.development.ts`: `vapidPublicKey: 'VAPID_STUB_DO_NOT_USE_IN_PROD'`.
4. E2e Playwright: import `provideEvnt({ mode: 'mock' })` from the test harness (via `evnt-testing.ts`).
5. Auto-enroll in dev: OFF. Enrollment only on explicit user gesture.

## Non-goals

- No real SW interaction in this adapter.
- No VAPID key used for real crypto (the stub key is intentionally invalid for crypto).

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`) + testing

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §5.6

## Architecture alignment

- Mock adapter for dev/test only
- No auto-enroll in dev
- Tag Nx: `scope:evnt`, `type:testing`

## Implementation checklist (by file)

**Data access / testing**
- [ ] `libs/evnt/data-access/src/lib/push-subscription-mock.adapter.ts`
- [ ] `libs/evnt/data-access/src/lib/evnt-testing.ts` (exports provideEvntTesting())
- [ ] `apps/neuroassist-niv-web/src/environments/environment.development.ts` (vapidPublicKey stub)

**Tests**
- [ ] `npx nx test evnt` PASS (mock records subscribeCallCount; no auto-enroll; stub VAPID is set in dev env)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P2 / Data access

## Labels

type:integration
layer:frontend
scope:evnt
priority:P2

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `PushSubscriptionMockAdapter.subscribeCallCount` increments only on explicit subscribe call
- `provideEvnt({ mode: 'mock' })` wires mock adapter for PUSH_SUBSCRIPTION_PORT
- `environment.development.ts` vapidPublicKey is a recognizable stub string

## Dependencies

- FE-EVNT-010 (PushSubscriptionPort definition)
- FE-EVNT-003 (provideEvnt({ mode }) switch)

## Tenant-context impact

Nenhum (testing only).

## Risks / Notes

- The stub VAPID key MUST NOT contain a real Base64-URL-encoded P-256 key — use a recognizable sentinel value.
- Carry-forward `fe-push:auto-enroll-dev-noise`: auto-enroll on startup floods the notification permission prompt and denies the origin permanently.

## Prioridade

P2
