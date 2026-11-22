# FE-HIST-002 -- HIST_ROUTES + hist entry-lib — lazy /history route, loadComponent

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-01 §1–2, generator-config.yml §shell_route

## Outcome
`HIST_ROUTES` is defined and exported: a single lazy route `/history` → `loadComponent(() => HistoryPageComponent)` guarded by `[authGuard, canReadHistoryGuard]`. The shell merges these routes via `loadChildren`. No write route is added.

## Approach (execution path)
1. Create `frontend/libs/hist/src/lib/hist.routes.ts` with `HIST_ROUTES: Routes`.
2. Single route: `path: 'history'`, `loadComponent` pointing to `feature-history/HistoryPageComponent`, guards `[authGuard, canReadHistoryGuard]`, title `'History'`.
3. The escalation/detection-lapse trail is a **page section** (EscalationTrailSectionComponent), not a child route — SPEC-01 §1.
4. No write route under `/history` — SPEC-01 §4.
5. Export `HIST_ROUTES` from `frontend/libs/hist/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/src/lib/hist.routes.ts`
- [ ] implementar `frontend/libs/hist/src/index.ts`
- [ ] Single route `/history` with `loadComponent` + guards `[authGuard, canReadHistoryGuard]`
- [ ] No child route for escalation trail (section, not route)
- [ ] No create/edit/delete route
- [ ] `npx nx test hist` PASS
- [ ] `npx nx lint hist` PASS

## Acceptance criteria
- [ ] `npx nx test hist` PASS — route definition has exactly one entry at path 'history'; no write path exists
- [ ] `npx nx lint hist` PASS
- [ ] `npx nx build neuroassist-niv-web` PASS (no dangling import)

## Dependencies
FE-HIST-001 (hist.contract.ts — MODULE_KEY), FE-HIST-004 (canReadHistoryGuard).

## Tenant-context impact
Nenhum — tenant scope é derivado do JWT no servidor.

## Prioridade
P1
