# FE-CONV-006 -- TreeSnapshotHttpAdapter — GET ${ACCESS_HTTP_BASE}/conv/tree, strong ETag, If-None-Match → 304/200, TreeBundleWire mapper

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-04 §1–2, contracts/backend-api-cross-link.md §1, BE api-contract §2

## Outcome
`TreeSnapshotHttpAdapter` and `TreeBundleWire` record are implemented. The adapter performs `GET ${ACCESS_HTTP_BASE}/conv/tree` (via shared interceptors — correlation + error-normalize); sends `If-None-Match` with the cached ETag on revalidate; handles `304 Not Modified` (return null, cache unchanged) and `200 OK` (return `{ bundle: TreeBundleWire, etag: string }`). Wire type mirrors the BE JSON exactly; `toDomain()` mapper converts to domain model. Never uses `/api/v1/` prefix (carry-forward `http-adapter:wrong-prefix` pitfall).

## Approach (execution path)
1. Create `frontend/libs/conv/data-access/src/lib/api/tree-bundle.wire.ts` — define `TreeBundleWire` record mirroring the BE JSON (treeVersionId, contentHash, structure tree of SpeechTreeNodeWire[], audioManifest map of `{assetId, contentHash, mediaType, durationMs}`). Mirror field names exactly from BE api-contract §2.
2. Create `frontend/libs/conv/data-access/src/lib/api/tree-snapshot-http.adapter.ts` — implement `TreeSnapshotPort`.
3. `fetch(opts?: { etag?: string }): Observable<{ bundle: TreeBundleWire; etag: string } | null>`:
   - Base URL: `${ACCESS_HTTP_BASE}/conv/tree` (token from `@neuroassist/shared/access-http-base`; NEVER hardcode `/api/v1/`).
   - If `opts.etag`, add `If-None-Match: <etag>` header.
   - `304` (HTTP 304): `catchError` → return `of(null)`.
   - `200`: parse body as `TreeBundleWire`; extract `ETag` response header; return `{ bundle, etag }`.
4. Error mapping: use `@neuroassist/shared/error-model` mapping `ProblemDetail.type` slug → `AppError` code (NEVER map by HTTP status alone — pitfall `http-adapter:error-code-by-status-not-problemdetail-type`). `401 unauthenticated` → stop-sync signal; `403 forbidden` → misconfiguration; `404 tree-not-published` → cold-empty.
5. Unit test: 304 → returns null; 200 → returns wire+etag; 401 → maps to unauthenticated error.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/api/tree-bundle.wire.ts` — `TreeBundleWire` mirrors BE JSON record exactly (no invented fields)
- [ ] `frontend/libs/conv/data-access/src/lib/api/tree-snapshot-http.adapter.ts` — implements `TREE_SNAPSHOT_PORT`
- [ ] Base path `${ACCESS_HTTP_BASE}/conv/tree` — NEVER `/api/v1/` prefix
- [ ] `If-None-Match` header sent when cached ETag is available
- [ ] `304 Not Modified` → returns `null` (cache unchanged)
- [ ] Error mapping via `ProblemDetail.type` slug, not HTTP status code (pitfall `http-adapter:error-code-by-status-not-problemdetail-type`)
- [ ] `toDomain()` mapper defined in `tree-bundle.wire.ts`
- [ ] `npx nx test conv-data-access` PASS — 304→null, 200→bundle+etag, 401→unauthenticated AppError
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] 304 response → adapter returns `null` (TreeCacheStore stays unchanged)
- [ ] 200 response → adapter returns `{ bundle: TreeBundleWire, etag: string }` with correct ETag from response header
- [ ] Error code derived from `ProblemDetail.type` slug, not from HTTP status
- [ ] Base path begins with `${ACCESS_HTTP_BASE}/conv` (no `/api/v1/`)
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-003 (TREE_SNAPSHOT_PORT InjectionToken).
INT-FE-CONV-003 (shared/error-model CONV type slugs).

## Tenant-context impact
None — tenant routing is handled by `@neuroassist/shared/access-http-base` interceptor (tenant header attached globally per request).
