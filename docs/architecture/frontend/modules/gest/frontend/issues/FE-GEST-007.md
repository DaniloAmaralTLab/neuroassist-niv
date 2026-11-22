# FE-GEST-007 -- CapabilityApiService + CapabilityMockAdapter — POST /gest/capabilities/support-check + GET /gest/engines, ETag cache by engineVersion

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

## Outcome
`CapabilityHttpAdapter` and `CapabilityMockAdapter` implement `CapabilityPort`; support-check result is cached by `engineVersion` via `ETag`/`If-None-Match`; on `304` returns the cached result; on `403` (token lacks `gest.capability.read` — INT-GEST-ACS-1) marks every command's gate `detectable=false, supportStatus='unknown'` and surfaces the warning — NEVER silently treats commands as detectable (INV-GEST-7).

## Approach (execution path)
1. `CapabilityPort.checkSupport(req: SupportCheckRequestWire, etag?: string): Observable<SupportCheckResultWire | 304>`.
2. `CapabilityPort.listEngines(): Observable<EngineListWire>`.
3. `CapabilityHttpAdapter.checkSupport()`: `POST ${ACCESS_HTTP_BASE}/gest/capabilities/support-check`; include `If-None-Match` if etag present; `304` → return sentinel (caller uses cache); `200` → cache ETag; unknown code in result → resolve `{detectable:false, supportStatus:'unknown'}`.
4. `CapabilityHttpAdapter.listEngines()`: `GET ${ACCESS_HTTP_BASE}/gest/engines`; ETag header; device-token interceptor.
5. `403` on support-check → map to `AppError('forbidden')` with detail preserved; `CatalogFacade` observes this and sets all gates to unverified.
6. `CapabilityMockAdapter`: returns fixture `SupportCheckResultWire` with same wire shape; never hardcodes `detectable=true` for all codes.
7. Spec: (a) ETag roundtrip — `If-None-Match` sent on second call; (b) `304` → cached result returned; (c) `403` → `AppError('forbidden')`; (d) unknown code → `detectable=false`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/api/capability-http.adapter.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/api/capability-mock.adapter.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/dto/capability-support.wire.ts`
- [ ] ETag/If-None-Match roundtrip implemented and spec-verified
- [ ] `304` returns cached result without re-mapping
- [ ] `403` → `AppError('forbidden')` with detail preserved
- [ ] Unknown code → `{detectable:false, supportStatus:'unknown'}`
- [ ] `ACCESS_HTTP_BASE` constant used (not hardcoded path)
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS

## Acceptance criteria
- [ ] `403` on support-check produces `AppError('forbidden')` — `CatalogFacade` marks all commands unverified (INV-GEST-7)
- [ ] ETag roundtrip spec: `If-None-Match` header sent on second call; `304` returns cache
- [ ] `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-003 (providers register under `CAPABILITY_PORT` token)
- FE-GEST-025 (GestErrorMapper)
- INT-FE-GEST-001 (token must carry `gest.capability.read` and `gest.engine.read` — OPEN)

## Tenant-context impact
None — station machine token; global GEST registry (neuroassist_global schema).

## Prioridade
P2
