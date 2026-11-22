# FE-HIST-009 -- HistoryMockAdapter — same wire shape as HTTP; explicit mock provider for tests/offline dev

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

**SPEC refs:** SPEC-04 §2 (adapter default), generator-config.yml §adapter_default

## Outcome
`HistoryMockAdapter` serves fixtures in the **same wire shape** as `HistoryHttpAdapter`, is used exclusively under an explicit mock provider for tests and offline dev, and is NEVER the default.

## Approach (execution path)
1. Create `frontend/libs/hist/data-access/src/lib/history.mock-fixtures.ts` with realistic fixtures covering:
   - `EventGenerated` entries with `commandLabel`/`urgency`/`confirmation` (G-HIST-1/2 CLOSED)
   - `EscalationAttempted` with `channel`/`maskedTarget` (G-HIST-3 CLOSED)
   - `DetectionLapseStarted`/`DetectionLapseResolved` (source disambiguated, G-HIST-5 CLOSED)
   - `PeriodSummaryWire` on first page (`scope: 'period'`, G-HIST-4 CLOSED)
2. Create `frontend/libs/hist/data-access/src/lib/history-mock.adapter.ts` implementing `HistoryPort`, returning `of(fixture)`.
3. Export `provideHistMock()` for test usage only — NOT used in `provideHist()` default.
4. Verify that the mock wire shape is identical to `HistoryEntryWire` (SPEC-03 §1) — same fields, no fabricated extras.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history-mock.adapter.ts`
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history.mock-fixtures.ts`
- [ ] Mock fixtures include all entry kinds: event, escalation, detection-lapse
- [ ] Fixtures include PeriodSummaryWire (scope='period') on first page
- [ ] `provideHistMock()` exported for test-only use
- [ ] `npx nx test hist-data-access` PASS
- [ ] `npx nx lint hist-data-access` PASS

## Acceptance criteria
- [ ] `npx nx test hist-data-access` PASS — mock fixtures conform to `HistoryEntryWire` shape (no extra fields)
- [ ] `npx nx lint hist-data-access` PASS
- [ ] `provideHist()` default does NOT use mock adapter

## Dependencies
FE-HIST-007 (HISTORY_PORT), FE-HIST-010 (wire types).

## Tenant-context impact
Fixtures use a single tenant/patient scope consistent with mock data conventions.

## Prioridade
P2
