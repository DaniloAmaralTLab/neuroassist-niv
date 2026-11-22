# FE-HIST-003 -- hist.bootstrap.ts — provideHist(http) + init/destroy lifecycle

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-06 §5, SPEC-04 §2, generator-config.yml §adapter_default

## Outcome
`provideHist({ adapter: 'http' })` is the default provider (never mock), `hist.bootstrap.ts` registers module metadata on init and cleans up on destroy. No polling timer is started.

## Approach (execution path)
1. Create `frontend/libs/hist/src/lib/hist.providers.ts` with `provideHist(opts: { adapter?: 'http' | 'mock' } = {})` defaulting `adapter` to `'http'`.
2. Provider registers `HISTORY_PORT` with either `HistoryHttpAdapter` (default) or `HistoryMockAdapter` (explicit mock only).
3. Create `frontend/libs/hist/src/lib/hist.bootstrap.ts` with `HistBootstrap` service:
   - `init()` — registers `MODULE_MENU_METADATA`, `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS` with the shell; calls `provideHist({ adapter: 'http' })`; NO timer started.
   - `destroy()` — releases `HistoryFacade` window signal and integration subscription.
4. Write a providers spec test proving the default is `http`, not mock (`scaffold:mock-adapter-default:shell-provider-not-switched-to-http`).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/src/lib/hist.bootstrap.ts`
- [ ] implementar `frontend/libs/hist/src/lib/hist.providers.ts`
- [ ] `provideHist()` defaults to `adapter: 'http'`
- [ ] Mock adapter is NOT the default
- [ ] No polling timer started in init()
- [ ] destroy() releases facade window signal
- [ ] Providers spec test proves http is the default
- [ ] `npx nx test hist` PASS
- [ ] `npx nx lint hist` PASS

## Acceptance criteria
- [ ] `npx nx test hist` PASS — providers spec confirms `provideHist()` registers `HistoryHttpAdapter`, not `HistoryMockAdapter`
- [ ] `npx nx lint hist` PASS
- [ ] No `setInterval`/`setTimeout` call in bootstrap

## Dependencies
FE-HIST-001 (hist.contract.ts), FE-HIST-007 (HISTORY_PORT), FE-HIST-008 (HistoryHttpAdapter), FE-HIST-009 (HistoryMockAdapter).

## Tenant-context impact
Nenhum — tenant scope é derivado do JWT no servidor.

## Prioridade
P1
