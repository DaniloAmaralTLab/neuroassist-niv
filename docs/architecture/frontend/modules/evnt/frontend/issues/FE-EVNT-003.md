# FE-EVNT-003 -- EvntModule barrel entry + provideEvnt() with http as default adapter

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/src/index.ts` is the public barrel for `@neuroassist/evnt`. `libs/evnt/src/lib/evnt.module.ts` declares `EvntModule` and `provideEvnt()`. The default adapter is `http` (evnt-service api-contract exists); a spec proves this default.

## Context / Problem statement

- The entry lib `@neuroassist/evnt` needs a public API (barrel) and a providers function used by the shell.
- Learning pitfall `scaffold:mock-adapter-default:shell-provider-not-switched-to-http` (ev=7): `provideEvnt()` MUST default to `http`, never `mock`. A providers spec MUST prove it (SPEC-04 §2).
- G-EVNT-3 is resolved: evnt-service api-contract exists, so the mock default from the vision phase is superseded.
- Bloqueia: INT-FE-EVNT-004

## Approach (execution path)

1. Create `libs/evnt/src/lib/evnt.module.ts` with `EvntModule` standalone/NgModule class (if needed for compatibility) and `provideEvnt(options?: {adapter?: 'http'|'mock'})` factory.
2. `provideEvnt()` default: `adapter: 'http'`. It calls `provideEventApi('http')` and `providePushApi('http')`.
3. `provideEvnt({ adapter: 'mock' })` is explicitly available for tests only.
4. Export `provideEvnt`, `EvntModule`, and `EVNT_ROUTES` from `libs/evnt/src/index.ts`.
5. Write a unit spec that calls `provideEvnt()` without arguments and asserts the injected `EVENT_PORT` is `EventHttpAdapter` (not mock).

## Non-goals

- No adapter implementations — those are FE-EVNT-007 and FE-EVNT-010.
- No bootstrap lifecycle — that is FE-EVNT-005.

## Layer(s)

frontend / tool entry (`libs/evnt/src/lib/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §2

## Architecture alignment

- Standalone + OnPush
- Adapter default = http (carry-forward `scaffold:mock-adapter-default`)
- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Lib path**
- [ ] `libs/evnt/src/lib/evnt.module.ts`
- [ ] `libs/evnt/src/lib/evnt.providers.ts`
- [ ] `libs/evnt/src/index.ts`
- [ ] `libs/evnt/src/lib/evnt.providers.spec.ts` (proves http default)

**Tests**
- [ ] `npx nx test evnt` PASS
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P1 / Foundation

## Labels

type:domain
layer:frontend
scope:evnt
priority:P1

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build evnt` PASS
- `provideEvnt()` without arguments provides `EventHttpAdapter` as `EVENT_PORT` (spec assertion)
- `provideEvnt({ adapter: 'mock' })` provides `EventMockAdapter` (spec assertion)

## Dependencies

- FE-EVNT-007 (EventApiService + adapters)
- FE-EVNT-010 (PushSubscriptionApiService + adapters)

## Tenant-context impact

Nenhum.

## Risks / Notes

- Learning pitfall (ev=7): default to http, never mock. The spec is mandatory.

## Prioridade

P1
