# FE-EVNT-010 -- PushSubscriptionApiService + PushChannelFacade

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/api/` contains `PushSubscriptionHttpAdapter` and `PushSubscriptionMockAdapter` (PUSH_PORT). `libs/evnt/data-access/` contains `PushChannelFacade` with `pushChannelVm(): Signal<PushChannelVM>`. `pushEnrolled=true` only after a `201`/`200` response from the BE.

## Context / Problem statement

- SAFETY-1 (CLOSED): the FE registers the browser as Tier 0 Web Push channel via `POST /evnt/push-subscriptions` (SPEC-04 §5.6).
- Carry-forward `scaffold:mock-adapter-default`: PUSH_PORT also defaults to `http` (evnt-service §6 is published).
- Write bodies send exactly `{endpoint, keys:{p256dh,auth}, userAgent?}` — NEVER `caregiverId`/`tenantId` (INV-EVNT-1, `http-adapter:request-body-field-whitelist`).
- `pushEnrolled=true` is set ONLY after a successful `201`/`200`; a local `pushManager.subscribe` without the registered BE row is NOT enrolled (SPEC-03 §4a invariant).
- Bloqueia: FE-EVNT-017, FE-EVNT-018, FE-EVNT-019

## Approach (execution path)

1. Create `push-subscription.wire.ts` with `PushSubscriptionRequestWire` and `PushSubscriptionResultWire`.
2. Create `push-subscription.port.ts` with `PUSH_PORT: InjectionToken<PushSubscriptionPort>`.
3. Create `PushSubscriptionHttpAdapter` at `${ACCESS_HTTP_BASE}/evnt` — `create(req)` → `POST /evnt/push-subscriptions`; `delete(id)` → `DELETE /evnt/push-subscriptions/{id}`.
4. Create `PushSubscriptionMockAdapter` for tests (same interface, in-memory).
5. Create `PushChannelFacade`: holds `signal<PushChannelVM>` with `permission`, `pushEnrolled`, `subscriptionId`, `sms`, `voice`, `canManage`. `sms`/`voice` = `contact-missing` WHILE `INT-EVNT-ACS-001` is OPEN.
6. `pushEnrolled` is set `true` only on `201`/`200` from `createPushSubscription` — not from browser `subscribe()` alone.

## Non-goals

- Browser `pushManager.subscribe()` lifecycle — that is FE-EVNT-019.
- Permission UX / prompt — that is FE-EVNT-018.
- Channel-status UI — that is FE-EVNT-017.

## Layer(s)

frontend / data-access (`libs/evnt/api/` + `libs/evnt/data-access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §1 (PushSubscription row), §5.6

## Architecture alignment

- PUSH_PORT default = http (carry-forward)
- Pessimistic writes (await BE before marking enrolled)
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access layer**
- [ ] `libs/evnt/api/src/lib/push-subscription.wire.ts`
- [ ] `libs/evnt/api/src/lib/push-subscription.port.ts`
- [ ] `libs/evnt/api/src/lib/push-subscription-http.adapter.ts`
- [ ] `libs/evnt/api/src/lib/push-subscription-mock.adapter.ts`
- [ ] `libs/evnt/data-access/src/lib/push-channel.facade.ts`
- [ ] `libs/evnt/data-access/src/lib/push-channel.vm.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (pushEnrolled only after 201/200; body has no caregiverId; sms/voice = contact-missing default)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P2 / Data access

## Labels

type:data-access
layer:frontend
scope:evnt
priority:P2
safety:push

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- Create request body = `{endpoint, keys:{p256dh, auth}}` — no `caregiverId`/`tenantId` field
- `pushEnrolled` is false until a successful `201`/`200` from BE
- `sms` and `voice` default to `contact-missing` (INT-EVNT-ACS-001)

## Dependencies

- FE-EVNT-007 (access-http-base pattern)
- INT-FE-EVNT-004 (shared layer wiring)

## Tenant-context impact

Tenant-scoped subscription on the BE side (tenantId from JWT).

## Risks / Notes

- SAFETY: a local subscribe without BE registration is NOT enrolled. The two steps must both succeed.

## Prioridade

P2
