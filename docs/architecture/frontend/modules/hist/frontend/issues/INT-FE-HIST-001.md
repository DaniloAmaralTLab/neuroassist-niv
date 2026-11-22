# INT-FE-HIST-001 -- hist-service BE read API availability — GET /hist/patients/{patientId}/history contract parity

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

**SPEC refs:** backend-api-cross-link.md §1, SPEC-04 §1, hist-service api-contract §2

## Outcome
The `GET /hist/patients/{patientId}/history` endpoint is available and returns the full wire shape (all structured fields) so the FE `HistoryHttpAdapter` can be exercised against a real BE response in integration testing.

## Approach (execution path)
1. Confirm `hist-service` api-contract §2 is implemented in the BE scaffold (HIST BE backlog).
2. Run `HistoryHttpAdapter` against the local dev environment and verify the response conforms to `HistoryPageWire`.
3. Contract test (Pact or manual): validate that `commandId`, `commandLabel`, `urgency`, `relatedEventId`, `confirmation`, `channel`, `maskedTarget`, `outcome` are present on the respective entry kinds.
4. Verify BE endpoint responds to `?period=today|week|month` and `?from=&to=` and `?cursor=&size=`.

## Implementation checklist (by layer/file)
- [ ] hist-service endpoint GET /hist/patients/{patientId}/history running locally
- [ ] HistoryHttpAdapter contract smoke test passes against local BE
- [ ] All HistoryEntryWire fields present in BE response for each entry kind

## Acceptance criteria
- [ ] `HistoryHttpAdapter.getHistory()` returns a valid `HistoryPageWire` from local BE (smoke test PASS)
- [ ] BE returns `summary` on first page (cursor absent)

## Dependencies
HIST BE scaffold (hist-service implementation).

## Tenant-context impact
Nenhum.

## Prioridade
P2
