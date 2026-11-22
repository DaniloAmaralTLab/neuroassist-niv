# FE-EVNT-019 -- [SAFETY] Web Push enrollment lifecycle in PushChannelFacade

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`PushChannelFacade` implements the full Web Push subscription lifecycle: subscribe (explicit gesture + VAPID from APP_CONFIG), refresh on shell start (idempotent re-POST), `410 Gone`/`pushsubscriptionchange` → resubscribe (not an error toast), unsubscribe local + DELETE from BE. `pushEnrolled=true` only after a `201`/`200` from the BE.

## Context / Problem statement

- SAFETY-1 (CLOSED): the FE registers the browser as Tier 0 Web Push channel. This is the client side of BE SPEC-11 §6 (ADR-005).
- VAPID public key is read from `APP_CONFIG.vapidPublicKey` — NOT from an EVNT endpoint (api-contract §6 note).
- Refresh on shell start: if `pushManager.getSubscription()` returns a subscription and permission is `granted`, re-POST it (idempotent — keeps BE row fresh and re-binds to current caregiver/tenant).
- `410 Gone`/`pushsubscriptionchange` → resubscribe + re-POST new subscription. NOT shown as a backend error toast (SPEC-07 §2.3).
- `denied` or `default-dismissed` → push channel degrades VISIBLY — `pushEnrolled=false`, no fabricated subscription.
- Unsubscribe: `sub.unsubscribe()` locally AND `DELETE /evnt/push-subscriptions/{id}` to the BE.

## Approach (execution path)

1. In `PushChannelFacade.subscribe(registration)`: get VAPID from `inject(APP_CONFIG).vapidPublicKey`; call `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → POST to BE with `{endpoint, keys, userAgent}`. On success: set `pushEnrolled=true`. On failure: set `pushEnrolled=false`, show no silent error.
2. `refresh(registration)`: call `pushManager.getSubscription()` → if present, re-POST (idempotent). If absent, call `subscribe(registration)`.
3. `handleSubscriptionChange(newSub, oldId)`: re-POST new subscription, then `DELETE` old id if known. NOT a toast.
4. `unsubscribe(subscriptionId)`: `sub.unsubscribe()` locally + `DELETE /evnt/push-subscriptions/{id}`.
5. Wire these calls into `evntBootstrap.init()` (refresh, pushsubscriptionchange relay) and `evntBootstrap.destroy()` (detach relays, do NOT unsubscribe push).
6. `410 Gone` from DELETE: treat as success (idempotent for owned rows, SPEC-07 §2.3).

## Non-goals

- No SW registration — that is INT-FE-EVNT-002 (Shell owns the SW).
- No permission prompt — that is FE-EVNT-018.
- No channel-status UI — that is FE-EVNT-017.

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §5.6

## Architecture alignment

- VAPID from APP_CONFIG (never from EVNT endpoint)
- Idempotent re-POST on start
- 410 Gone → resubscribe (not error toast)
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access layer**
- [ ] `libs/evnt/data-access/src/lib/push-channel.facade.ts` (subscribe, refresh, handleSubscriptionChange, unsubscribe)
- [ ] `libs/evnt/data-access/src/lib/push-subscription-lifecycle.service.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (refresh re-POSTs if subscription exists; 410 on DELETE treated as success; pushsubscriptionchange triggers resubscribe + re-POST, no toast; pushEnrolled only after 201/200)
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P4 / Hub integrations

## Labels

type:data-access
layer:frontend
scope:evnt
priority:P4
safety:push-lifecycle

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `410 Gone` on DELETE does not trigger error toast (treated as success)
- `pushsubscriptionchange` triggers resubscribe + re-POST (not an error)
- `pushEnrolled` remains false if BE POST fails
- `refresh()` re-POSTs existing subscription idempotently (no duplicate BE row)

## Dependencies

- FE-EVNT-010 (PushChannelFacade + PushSubscriptionApiService)
- INT-FE-EVNT-002 (Shell SW registration passed to PushChannelFacade)

## Tenant-context impact

Subscription is tenant-scoped on the BE side (JWT claim).

## Risks / Notes

- SAFETY: the subscription must survive the dashboard being closed — `evntBootstrap.destroy()` must NOT call `sub.unsubscribe()`.

## Prioridade

P4
