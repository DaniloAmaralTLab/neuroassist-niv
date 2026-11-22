# INT-FE-EVNT-001 -- evnt-service HTTP adapter integration

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`EventHttpAdapter` and `PushSubscriptionHttpAdapter` connect to `${ACCESS_HTTP_BASE}/evnt`. `provideEvnt()` defaults to `http` (not `mock`). Integration test proves provider wiring: `EVENT_PORT` token resolves to `EventHttpAdapter` with the `http` provider.

## Context / Problem statement

- The adapter default is `http` — NEVER `mock` (carry-forward `scaffold:mock-adapter-default`, learning pitfall ev=7). A released build that defaults to `mock` is a silent no-op for every alarm read.
- `ACCESS_HTTP_BASE` is injected from `@neuroassist/shared/config`, not hardcoded.
- The integration test must import `provideEvnt()` without overrides and assert that `EVENT_PORT` resolves to an instance of `EventHttpAdapter`.
- Base path: `${ACCESS_HTTP_BASE}/evnt` — not `/api/evnt` or `/evnt`.

## Approach (execution path)

1. `EventHttpAdapter` implements `EventPort` (defined in FE-EVNT-001). Uses `inject(HttpClient)` and `inject(ACCESS_HTTP_BASE)`.
2. `PushSubscriptionHttpAdapter` implements `PushSubscriptionPort`. Same injections.
3. `provideEvnt()` wiring (FE-EVNT-003): `{ provide: EVENT_PORT, useClass: EventHttpAdapter }` by default. The `mode: 'mock'` option swaps to `EventMockAdapter`.
4. Integration test: `TestBed.configureTestingModule({ providers: [provideEvnt()] })` → `TestBed.inject(EVENT_PORT) instanceof EventHttpAdapter` → true.
5. Confirm base URL is `${ACCESS_HTTP_BASE}/evnt` (interceptor or snapshot test on the first URL built).

## Non-goals

- No end-to-end BE test here (that is `be-evnt-e2e`).
- No mock adapter logic (INT-FE-EVNT-006).

## Layer(s)

frontend / data-access (`libs/evnt/data-access/`) + integration

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §2–§3
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-05-tool-contract.md` §3

## Architecture alignment

- Hexagonal port/adapter
- Default=http (carry-forward `scaffold:mock-adapter-default`)
- `ACCESS_HTTP_BASE` injected from config
- Tag Nx: `scope:evnt`, `type:data-access`

## Implementation checklist (by file)

**Data access**
- [ ] `libs/evnt/data-access/src/lib/event-http.adapter.ts`
- [ ] `libs/evnt/data-access/src/lib/push-subscription-http.adapter.ts`

**Tests**
- [ ] `npx nx test evnt` PASS (provideEvnt() defaults to http; ACCESS_HTTP_BASE used in URL; no hardcoded /api prefix)
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
- `provideEvnt()` without args → `EVENT_PORT` resolves to `EventHttpAdapter`
- `EventHttpAdapter` builds URLs using `${ACCESS_HTTP_BASE}/evnt/...`

## Dependencies

- FE-EVNT-001 (evnt.contract.ts — EventPort definition)
- FE-EVNT-003 (provideEvnt())
- FE-EVNT-007 (EventApiService)

## Tenant-context impact

Tenant-scoped via JWT claim — no extra URL param needed.

## Risks / Notes

- Carry-forward `scaffold:mock-adapter-default` (ev=7): the most common FE scaffold defect. Default MUST be `http`.

## Prioridade

P2
