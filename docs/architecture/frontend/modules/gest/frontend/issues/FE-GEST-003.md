# FE-GEST-003 -- gest.module.ts + gest.providers.ts — provideGest() with HTTP adapter default (never mock default)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`libs/gest/src/lib/gest.providers.ts` exports `provideGest({ adapter? })` where `adapter` defaults to `'http'` — a spec proves this resolves to the HTTP adapters, NOT the mock adapters (carry-forward `scaffold:mock-adapter-default:shell-provider-not-switched-to-http`, 7 prior occurrences). `evnt-service` and `gest-service` both exist (api-contracts published); `'http'` is the honest default.

## Approach (execution path)
1. Define `GestAdapterConfig = { adapter?: 'http' | 'mock' }` defaulting `adapter = 'http'`.
2. `provideGest({ adapter = 'http' } = {})` returns Angular `Provider[]`:
   - `'http'` → provides `GestureReportHttpAdapter`, `CapabilityHttpAdapter`, `EdgeCatalogHttpAdapter`.
   - `'mock'` → provides `GestureReportMockAdapter`, `CapabilityMockAdapter`, `EdgeCatalogMockAdapter`.
3. Both branches provide adapters under the same injection tokens (`GESTURE_REPORT_PORT`, `CAPABILITY_PORT`, `CATALOG_PORT`).
4. Write `gest.providers.spec.ts`: call `provideGest()` (no args), inject `GESTURE_REPORT_PORT`, assert instance is `GestureReportHttpAdapter`.
5. Export `GestModule` as an optional NgModule wrapper calling `provideGest()`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/src/lib/gest.providers.ts`
- [ ] `provideGest()` with no args resolves to HTTP adapters (spec proves this)
- [ ] `provideGest({ adapter: 'mock' })` resolves to mock adapters
- [ ] All three port tokens injected in both branches
- [ ] `frontend/libs/gest/src/lib/gest.providers.spec.ts` asserting HTTP default
- [ ] `frontend/libs/gest/src/lib/gest.module.ts` (optional NgModule wrapper)
- [ ] `npx nx test gest` PASS
- [ ] `npx nx build gest` PASS

## Acceptance criteria
- [ ] `provideGest()` with no arguments provides `GestureReportHttpAdapter` — spec proves this (carry-forward `scaffold:mock-adapter-default`)
- [ ] `provideGest({ adapter: 'mock' })` provides mock adapters only under explicit mock provider
- [ ] `npx nx test gest` PASS

## Dependencies
- FE-GEST-006, FE-GEST-007, FE-GEST-008 (adapter classes must be defined before the providers spec can inject them)

## Tenant-context impact
None — station-level adapter selection, no tenant session.

## Prioridade
P1
