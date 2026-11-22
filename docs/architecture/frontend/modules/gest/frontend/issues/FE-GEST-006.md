# FE-GEST-006 -- GestureReportApiService + GestureReportMockAdapter — POST /evnt/gesture-reports, wire types, mappers, device-token interceptor

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

## Outcome
`libs/gest/data-access` has `GestureReportHttpAdapter` and `GestureReportMockAdapter` both implementing `GestureReportPort`; `GestureReportWire` mirrors EVNT §2.1 exactly; `toRecognitionReport()` whitelists the request body to `{commandId, reportId, occurredAt, confidence?, recognitionWindowMs?}` — NEVER includes `deviceId`, `patientId`, or `tenantId` (EVNT takes them from the `edge.device` token claims — carry-forward `http-adapter:request-body-field-whitelist`).

## Approach (execution path)
1. Define `GestureReportPort` interface: `report(wire: GestureReportWire): Observable<EventWire>`.
2. Define `GestureReportWire` and `EventWire` mirroring EVNT §2.1 record shapes exactly (no invented fields).
3. `GestureReportHttpAdapter.report()`: `POST ${ACCESS_HTTP_BASE}/evnt/gesture-reports` via device-token interceptor; map 201/200 to `EventWire`; map errors via `GestErrorMapper` by `type` slug (not HTTP status).
4. `toRecognitionReport(recognition: RecognitionVM): GestureReportWire`: only `{commandId, reportId, occurredAt}` required; `{confidence?, recognitionWindowMs?}` optional — NEVER `deviceId/patientId/tenantId`.
5. `GestureReportMockAdapter`: returns `of(mockEvent)` with same `EventWire` shape, identical mappers.
6. Spec: (a) `toRecognitionReport` body toEqual whitelisted fields — missing `deviceId`/`patientId`/`tenantId`; (b) 201 → `EventWire`; (c) 200 replay → same `EventWire` (exactly-once, INV-GEST-1); (d) 401 → `AppError` with code from `type` slug; (e) 503+`catalog-unavailable` → `AppError('catalog-unavailable')` not raw HTTP 503.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/api/gesture-report-http.adapter.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/api/gesture-report-mock.adapter.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/dto/gesture-report.wire.ts`
- [ ] `toRecognitionReport()` body whitelist spec: `deviceId`/`patientId`/`tenantId` NOT present
- [ ] Error mapped by `type` slug, never by HTTP status alone (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`)
- [ ] `ACCESS_HTTP_BASE` constant used, never a hardcoded `/api/v1` path
- [ ] Mock adapter serves same wire shape through same mapper
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx lint gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS

## Acceptance criteria
- [ ] `toRecognitionReport()` spec proves `deviceId`, `patientId`, `tenantId` absent from request body
- [ ] 503 error code = `'catalog-unavailable'` (from `type` slug), not `'server-error'` or HTTP 503
- [ ] `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-003 (providers register this adapter under `GESTURE_REPORT_PORT` token)
- FE-GEST-025 (GestErrorMapper — shared error mapping)
- INT-FE-GEST-001 (edge.device token must carry `evnt.event.ingest`)

## Tenant-context impact
None — station uses edge.device token; EVNT derives tenant context from token claims.

## Prioridade
P2
