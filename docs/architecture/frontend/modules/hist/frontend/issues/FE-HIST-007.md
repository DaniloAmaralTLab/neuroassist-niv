# FE-HIST-007 -- HISTORY_PORT interface — zero-write read-only port seam (InjectionToken)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-04 §1–3

## Outcome
`HISTORY_PORT` interface and `InjectionToken` are defined with exactly three read-only operations (`getHistory`, `getHistoryPage`, `refresh`) and **zero write methods**. No POST/PUT/PATCH/DELETE is reachable from this interface.

## Approach (execution path)
1. Create `frontend/libs/hist/data-access/src/lib/history.port.ts`.
2. Define the `HistoryPort` interface:
   - `getHistory(patientId: string, params: HistoryQueryParams): Observable<HistoryPageWire>`
   - `getHistoryPage(patientId: string, cursor: string, size?: number): Observable<HistoryPageWire>`
3. `HistoryQueryParams`: `{ period?: PeriodFilter } | { from: string; to: string }` — mutually exclusive (SPEC-04 §3).
4. Create `HISTORY_PORT = new InjectionToken<HistoryPort>('HISTORY_PORT')`.
5. ZERO write methods in the interface (ADR-005 — HIST binds zero write endpoints).
6. Export from `frontend/libs/hist/data-access/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history.port.ts`
- [ ] `HistoryPort` interface with exactly `getHistory`, `getHistoryPage` — no POST/PUT/PATCH/DELETE
- [ ] `HISTORY_PORT = new InjectionToken<HistoryPort>('HISTORY_PORT')`
- [ ] `HistoryQueryParams` type (period xor from+to)
- [ ] `npx nx test hist-data-access` PASS
- [ ] `npx nx lint hist-data-access` PASS

## Acceptance criteria
- [ ] `npx nx test hist-data-access` PASS
- [ ] `npx nx lint hist-data-access` PASS
- [ ] Interface file contains zero occurrences of 'post'|'put'|'patch'|'delete' method signatures

## Dependencies
FE-HIST-010 (Wire types — HistoryPageWire, HistoryQueryParams).

## Tenant-context impact
Nenhum — tenant é derivado do JWT no servidor; patientId é o único escopo de recurso do FE.

## Prioridade
P2
