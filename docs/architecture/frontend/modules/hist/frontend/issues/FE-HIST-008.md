# FE-HIST-008 -- HistoryHttpAdapter — ${ACCESS_HTTP_BASE}/hist; ProblemDetail type-slug error mapping

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-04 §2–3, SPEC-07 §1–2, backend-api-cross-link.md §1

## Outcome
`HistoryHttpAdapter` implements `HistoryPort` with base path `${ACCESS_HTTP_BASE}/hist` (never `/api/v1`), maps `HistoryEntryWire` correctly, and translates BE `ProblemDetail` `type` slugs to `AppError` (never parses HTTP status alone).

## Approach (execution path)
1. Create `frontend/libs/hist/data-access/src/lib/history-http.adapter.ts` implementing `HistoryPort`.
2. Inject `HttpClient` via `@neuroassist/shared/access-http-base` (the interceptor chain provides bearer token + correlation-id).
3. Base URL: `${ACCESS_HTTP_BASE}/hist/patients/{patientId}/history` — NEVER `/api/v1`.
4. `getHistory`: `GET /hist/patients/{patientId}/history?period=today|week|month` or `?from=&to=`.
5. `getHistoryPage`: `GET .../history?cursor={opaque}&size={1..100}`.
6. Error mapping: catch `HttpErrorResponse`, read `error.type` slug (not `status`), map to `AppError` (carry-forward `http-adapter:error-code-by-status-not-problemdetail-type`).
7. Map response to `HistoryPageWire` using the shared mappers from FE-HIST-010.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/data-access/src/lib/history-http.adapter.ts`
- [ ] Base path `${ACCESS_HTTP_BASE}/hist` — never `/api/v1`
- [ ] Error mapping reads `error.type` slug, not HTTP status code alone
- [ ] `AppError` preserves `detail` and `correlationId` from ProblemDetail
- [ ] No `HttpClient` import in components — only in adapter
- [ ] `npx nx test hist-data-access` PASS
- [ ] `npx nx lint hist-data-access` PASS

## Acceptance criteria
- [ ] `npx nx test hist-data-access` PASS — test proves base URL is `${ACCESS_HTTP_BASE}/hist`, not `/api/v1`
- [ ] `npx nx lint hist-data-access` PASS
- [ ] Zero POST/PUT/PATCH/DELETE calls in the adapter

## Dependencies
FE-HIST-007 (HISTORY_PORT), FE-HIST-010 (wire types + mappers).

## Tenant-context impact
Nenhum — tenant e link-scope derivados do JWT; adapter nunca envia X-Tenant-Id.

## Prioridade
P2
