# FE-HIST-004 -- canReadHistoryGuard — AccessDecisionService.can('hist.history.read'), never hardcode true

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-01 §1, SPEC-05 §4, generator-config.yml §guards

## Outcome
`canReadHistoryGuard` is implemented via `AccessDecisionService.can('hist.history.read')`, never returning a hardcoded `true`. The route `/history` is effectively denied to sessions without the authority.

## Approach (execution path)
1. Create `frontend/libs/hist/access/src/lib/can-read-history.guard.ts` as an `inject`-based functional guard.
2. Inject `AccessDecisionService` from `@neuroassist/shared/access-decision`.
3. Return `AccessDecisionService.can('hist.history.read')` — no hardcoded `true` (carry-forward `guard:stub-permissive`).
4. On false: redirect to the shell's unauthorized/home route (consistent with `authGuard` pattern in EVNT).
5. Export from `frontend/libs/hist/access/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/access/src/lib/can-read-history.guard.ts`
- [ ] implementar `frontend/libs/hist/access/src/index.ts`
- [ ] Guard uses `AccessDecisionService.can('hist.history.read')` — no hardcode true
- [ ] Authority string is exactly `'hist.history.read'` (not 'view')
- [ ] `npx nx test hist-access` PASS
- [ ] `npx nx lint hist-access` PASS

## Acceptance criteria
- [ ] `npx nx test hist-access` PASS — test proves guard denies when `AccessDecisionService.can()` returns false
- [ ] `npx nx lint hist-access` PASS
- [ ] Guard does NOT contain `return true` or `return of(true)` unconditionally

## Dependencies
FE-HIST-001 (hist.contract.ts — authority constant).

## Tenant-context impact
Nenhum — acesso é avaliado por autoridade JWT, não por tenant explícito.

## Prioridade
P1
