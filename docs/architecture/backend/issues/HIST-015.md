# HIST-015 -- First-page period summary G-HIST-4 — whole-period aggregate (scope=period) via ix_audit_record_patient_time, per-kind counts + confirmed/unconfirmed/feedback-verdict folds; absent on cursor pages; inlined on first page

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Contexto

When no `cursor` is present (first page request), the response includes a `summary` object
aggregated over the **whole** requested window — not just the returned page. The summary carries:
- `scope = "period"` (always; the aggregate spans the full window)
- `window { from, to }`
- `counts` per `kind` (all timeline fact types)
- `events { total, confirmed, unconfirmed, markedReal, falsePositives, notReviewed }` — folds
  over event-kind facts only

The aggregate query uses `ix_audit_record_patient_time` (V0065) for efficiency:
`SELECT action, count(*) ... WHERE tenant_id = :tenant AND payload ->> 'patientId' = :patientId
AND occurred_at IN window GROUP BY action`, plus the feedback-verdict fold.

**Decision (api-contract §2, ratified):** summary is inlined on the first page, not a separate
`GET .../history/summary` endpoint (one authority, one round-trip, one window predicate).

On pages after the first (cursor present), `summary` is **absent** — not recomputed per page.

## Spec de referencia

- SPEC-03 (caregiver history timeline — period summary section)
- api-contract.md §2 (G-HIST-4 summary spec + inline decision)
- data-model.md §7 (ix_audit_record_patient_time query)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/application/usecase/ComputePeriodSummary.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/api/dto/PeriodSummaryResponse.java`
- [ ] unit tests: `backend/services/hist-service/src/test/java/com/neuroassist/hist/application/usecase/ComputePeriodSummaryTest.java`

## Criterios de aceite

- [ ] AC-1 First-page response (no cursor) includes `summary` with `scope="period"` and `window` matching the full requested period
- [ ] AC-2 Subsequent page (cursor present) → `summary` is absent from the response
- [ ] AC-3 `summary.counts` matches per-kind counts over the whole window, not just the returned page
- [ ] AC-4 `summary.events.confirmed` = count of `EventGenerated` entries that have a sibling `AlarmConfirmed` in-window
- [ ] AC-5 Aggregate query hits `ix_audit_record_patient_time` (verify via `EXPLAIN` in IT)
- [ ] AC-6 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-013 (QueryPatientHistory — window is computed here)
- HIST-007 (V0065 index must exist)

## Estimativa

M

## Prioridade
P6
