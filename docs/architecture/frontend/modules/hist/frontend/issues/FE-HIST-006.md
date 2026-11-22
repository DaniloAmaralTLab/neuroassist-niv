# FE-HIST-006 -- hist.nav.config.ts — breadcrumb + NavigationService wiring for /history

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-01 §1 (breadcrumb), SPEC-06 §1

## Outcome
Navigating to `/history` sets the breadcrumb state to `[History]` via the shared `NavigationService`; the breadcrumb reads from the module's nav config, not a hardcoded component.

## Approach (execution path)
1. Create `frontend/libs/hist/src/lib/hist.nav.config.ts` with the breadcrumb config for the `/history` route: `[{ label: 'History', route: '/history' }]`.
2. Register this config in `hist.bootstrap.ts` init() with `NavigationService.registerBreadcrumb('history', HIST_BREADCRUMB)`.
3. The `HistoryPageComponent` calls `NavigationService.setBreadcrumb('history')` on init.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/src/lib/hist.nav.config.ts`
- [ ] `HIST_BREADCRUMB` exported: `[{ label: 'History', route: '/history' }]`
- [ ] Breadcrumb registered in hist.bootstrap.ts init()
- [ ] HistoryPageComponent sets breadcrumb on init
- [ ] `npx nx test hist` PASS
- [ ] `npx nx lint hist` PASS

## Acceptance criteria
- [ ] `npx nx test hist` PASS
- [ ] `npx nx lint hist` PASS
- [ ] Breadcrumb shows `[History]` on the /history page (Playwright screenshot in P9)

## Dependencies
FE-HIST-001, FE-HIST-003 (bootstrap).

## Tenant-context impact
Nenhum.

## Prioridade
P1
