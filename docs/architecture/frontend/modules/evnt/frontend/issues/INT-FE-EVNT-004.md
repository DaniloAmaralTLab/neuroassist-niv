# INT-FE-EVNT-004 -- Shared layer integration — access-http-base, auth-session, tenant-context, access-decision, error-model

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`provideEvnt()` correctly wires all shared-layer tokens: `ACCESS_HTTP_BASE`, `AuthSession`, `TenantContext`, `AccessDecisionService`, and `SharedErrorModel`. Integration test proves http default and that all shared tokens are resolved correctly.

## Context / Problem statement

- EVNT depends on several shared tokens from `@neuroassist/shared`: `ACCESS_HTTP_BASE` (injected into HTTP adapters), `AuthSession` (injected by HTTP interceptor), `TenantContext` (injected for subscription scoping), `AccessDecisionService` (injected for RBAC guards and smart components), and `SharedErrorModel` (ProblemDetail type definitions).
- `provideEvnt()` must NOT re-declare providers already declared by the shell's `@neuroassist/shared/providers` — it only declares EVNT-specific ones and assumes the shared providers are already in scope.
- This issue proves that wiring is correct and no token is missing (carry-forward `scaffold:mock-adapter-default`: the same test that checks adapter=http also checks shared tokens resolve).

## Approach (execution path)

1. In the integration test: `TestBed.configureTestingModule({ providers: [provideShared(testConfig), provideEvnt()] })`.
2. Assert: `TestBed.inject(EVENT_PORT) instanceof EventHttpAdapter` (adapter default=http).
3. Assert: `EventHttpAdapter.baseUrl` matches `testConfig.accessHttpBase + '/evnt'`.
4. Assert: `TestBed.inject(AccessDecisionService)` resolves (no missing provider error).
5. Assert: `TestBed.inject(TENANT_CONTEXT)` resolves.
6. No `provideEvnt()` calls `provideShared()` internally — it relies on the shell to have called it first.

## Non-goals

- No business logic tests here — only provider wiring.
- No mock of shared tokens for this integration test (use real token factories from `@neuroassist/shared/testing`).

## Layer(s)

frontend / module (`apps/neuroassist-niv/src/app/evnt-module/`) + data-access

## Bounded context

evnt (integration with shared)

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-04-data-access.md` §2
- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-05-tool-contract.md` §3–§4

## Architecture alignment

- provideEvnt() does NOT re-declare shared providers
- Hexagonal: shared tokens injected into adapters, not hardcoded
- Tag Nx: `scope:evnt`, `type:integration`

## Implementation checklist (by file)

**Module entry**
- [ ] `apps/neuroassist-niv/src/app/evnt-module/evnt-module.ts` (provideEvnt() wiring verified)

**Tests**
- [ ] `npx nx test evnt` PASS (adapter=http; ACCESS_HTTP_BASE used; AccessDecisionService resolves; TenantContext resolves)
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
- `provideEvnt()` without overrides → `EVENT_PORT` resolves to `EventHttpAdapter`
- `AccessDecisionService` resolves when `provideEvnt()` + `provideShared()` are both in scope
- No `NullInjectorError` for any EVNT-required token

## Dependencies

- FE-EVNT-001 (evnt.contract.ts)
- FE-EVNT-003 (provideEvnt())
- INT-FE-EVNT-001 (HTTP adapter)

## Tenant-context impact

TenantContext token must be in scope (provided by shell).

## Risks / Notes

- If `provideEvnt()` accidentally re-provides a shared token with wrong scope, shared state can leak between tests.

## Prioridade

P2
