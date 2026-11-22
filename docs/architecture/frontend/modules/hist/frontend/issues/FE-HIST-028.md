# FE-HIST-028 -- E2E — caregiver-history.feature (prototype parity, 3 features coverage)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-08 §caregiver-history.feature, e2e/caregiver-history.feature

## Outcome
Playwright spec `caregiver-history.spec.ts` covers all scenarios in `caregiver-history.feature`: loading state, empty state, error+stale, summary scope, in-memory period switch, keyset loadMore, explicit range, delegated feedback refresh, and feedback RBAC.

## Approach (execution path)
1. Create `frontend/apps/hist-e2e/src/caregiver-history.spec.ts` mapping each Gherkin scenario from `docs/architecture/frontend/modules/hist/frontend/e2e/caregiver-history.feature` to a Playwright test.
2. Use `HistoryMockAdapter` fixture responses to control the wire.
3. Cover scenarios:
   - Loading → list transition (skeleton shown, then list replaces it; CLS<0.1)
   - Empty state: mock returns zero entries → empty state shown, NOT skeleton or banner
   - Error+stale: mock returns 5xx → banner shown, stale entries visible, NOT empty state
   - Period summary scope: first-page summary → 'period' label; loadMore then no summary → 'loaded' label
   - Period switch within loaded window: narrow period → in-memory re-filter, no extra API call
   - LoadMore: mock returns `nextCursor` → "Load more" button appears; click → new entries appended
   - Delegated feedback: click "Was it real?" → EVNT mock called; on success → `HistoryFacade.refresh()` triggered
   - Feedback RBAC: session lacking `evnt.event.record` → "Was it real?" button hidden

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/apps/hist-e2e/src/caregiver-history.spec.ts`
- [ ] Loading → list transition (CLS<0.1)
- [ ] Empty state: success + zero entries
- [ ] Error + stale: failed read → banner + stale timeline, NOT empty
- [ ] Period summary scope ('period' vs 'loaded')
- [ ] In-memory narrow period switch (no extra call)
- [ ] LoadMore keyset pagination
- [ ] Delegated feedback EVNT call + refresh
- [ ] Feedback RBAC: "Was it real?" hidden when lacking evnt.event.record

## Acceptance criteria
- [ ] `npx nx e2e hist-e2e --spec caregiver-history.spec.ts` PASS

## Dependencies
FE-HIST-012..017 (feature-history), FE-HIST-011 (HistoryFacade), FE-HIST-023 (delegated feedback), INT-FE-HIST-004 (shell wiring).

## Tenant-context impact
Tests use a single-tenant/patient fixture scope.

## Prioridade
P9
