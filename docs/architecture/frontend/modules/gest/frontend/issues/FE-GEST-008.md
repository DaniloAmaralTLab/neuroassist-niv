# FE-GEST-008 -- EdgeCatalogApiService + CatalogMockAdapter — GET /edge/catalog, ETag/If-None-Match, 304 handling

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`EdgeCatalogHttpAdapter` and `CatalogMockAdapter` implement `CatalogPort`; the catalog is read with EDGE's `ETag`/`If-None-Match` cache; on `304` the caller keeps the cached catalog; `503 catalog-unavailable` surfaces as `AppError('catalog-unavailable')` without dropping pending reports; `401`/`403` trigger the station-unpaired state.

## Approach (execution path)
1. `CatalogPort.read(etag?: string): Observable<CatalogCommandWire[] | '304-not-modified'>`.
2. `EdgeCatalogHttpAdapter.read()`: `GET ${ACCESS_HTTP_BASE}/edge/catalog`; include `If-None-Match` if etag present; `304` → return sentinel; `200` → map `CatalogCommandWire[]`; cache response ETag.
3. Map `CatalogCommandWire` exactly from EDGE §4.1 wire shape (minGestureTimeMs, maxGestureTimeMs, primaryPrimitive.code, etc.) — no invented fields (carry-forward `http-adapter:fe-dto-drift:be-record-shape-not-mirrored`).
4. `503` → `AppError('catalog-unavailable')` with `Retry-After` header value (ReportFacade uses it to reschedule).
5. `401` → `AppError('unauthenticated')`; `403` → `AppError('forbidden')`.
6. `CatalogMockAdapter`: returns fixture `CatalogCommandWire[]` with accurate field names.
7. Spec: (a) `200` → array of `CatalogCommandWire`; (b) `If-None-Match` sent on second call; (c) `304` returns sentinel; (d) `503` → `AppError('catalog-unavailable')` with retry delay; (e) `401` → `AppError('unauthenticated')`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/api/edge-catalog-http.adapter.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/api/edge-catalog-mock.adapter.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/dto/catalog-command.wire.ts`
- [ ] `CatalogCommandWire` mirrors EDGE §4.1 wire shape exactly (minGestureTimeMs not minGestureDurationMs)
- [ ] ETag/If-None-Match roundtrip spec
- [ ] `503` → `AppError('catalog-unavailable')` not throw
- [ ] `ACCESS_HTTP_BASE` constant (not hardcoded path)
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS

## Acceptance criteria
- [ ] `CatalogCommandWire` field names match EDGE §4.1 exactly (no drift)
- [ ] ETag roundtrip proven in spec
- [ ] `503` produces `AppError('catalog-unavailable')` — `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-003 (providers register under `CATALOG_PORT` token)
- FE-GEST-025 (GestErrorMapper)
- INT-FE-GEST-001 (token must carry `edge.catalog.read`)

## Tenant-context impact
None — EDGE catalog is per-station (edge.device identity); no tenant schema.

## Prioridade
P2
