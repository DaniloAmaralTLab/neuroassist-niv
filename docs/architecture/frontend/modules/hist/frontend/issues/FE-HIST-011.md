# FE-HIST-011 -- HistoryFacade — signals + .asReadonly(), computed, load/loadMore/setPeriod/refresh, PeriodSummaryVM binding

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-03 §3–4, SPEC-04 §3–5, SPEC-07 §2.1

## Outcome
`HistoryFacade` exposes a read-only signal window (`historyPageVm()`, `periodSummaryVm()`, `period()`) with `load`, `loadMore`, `setPeriod`, and `refresh` methods. It does NOT poll, owns no write path, and correctly manages the stale-window state on failure.

## Approach (execution path)
1. Create `frontend/libs/hist/data-access/src/lib/history.facade.ts`.
2. Private signals: `_entries = signal<HistoryEntryVM[]>([])`, `_state = signal<HistoryViewState>('loading')`, `_nextCursor = signal<string|null>(null)`, `_period = signal<PeriodFilter>('week')` (prototype default), `_summary = signal<PeriodSummaryVM|null>(null)`, `_stale = signal(false)`, `_trailDegraded = signal(false)`.
3. Computed: `period = this._period.asReadonly()`, `historyPageVm = computed(() => {...})`, `periodSummaryVm = computed(() => ...)`.
4. `load(patientId, period?)` — `GET /hist/patients/{id}/history?period=`; on success: update signals + bind `PeriodSummaryVM` from first-page `summary` (scope='period') if present, else `deriveLoadedSummaryVM` (scope='loaded'); on error: set state='error', `_stale.set(true)` — NEVER clear entries.
5. `loadMore(patientId)` — keyset pagination via `nextCursor`; appends entries.
6. `setPeriod(p)` — if p is narrower than current window → re-filter in memory; if wider → call `load()`.
7. `refresh(patientId)` — explicit refresh, no poll.
8. No `setInterval`/`setTimeout` anywhere.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history.facade.ts`
- [ ] All signals `.asReadonly()` exposed
- [ ] `load()` sets stale=true on failure, keeps last entries
- [ ] `load()` binds PeriodSummaryVM from wire.summary (scope='period') when present
- [ ] `loadMore()` appends entries, keeps first-page summary
- [ ] `setPeriod()` re-filters in-memory for narrower period; refetches for wider
- [ ] No polling — zero `setInterval`/`setTimeout`
- [ ] `trailDegraded` signal exposed (SPEC-07 §2.1)
- [ ] `npx nx test hist-data-access` PASS
- [ ] `npx nx lint hist-data-access` PASS

## Acceptance criteria
- [ ] `npx nx test hist-data-access` PASS — tests cover: load success, load failure (stale), setPeriod narrow re-filter, setPeriod wider refetch, loadMore append, PeriodSummaryVM scope binding
- [ ] `npx nx lint hist-data-access` PASS
- [ ] Facade never calls any write endpoint

## Dependencies
FE-HIST-007 (HISTORY_PORT), FE-HIST-010 (wire types + mappers).

## Tenant-context impact
Nenhum — patientId é passado como parâmetro de recurso, tenant é derivado do JWT.

## Prioridade
P2
