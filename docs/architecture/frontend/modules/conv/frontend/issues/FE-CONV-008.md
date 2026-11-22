# FE-CONV-008 -- AudioAssetHttpAdapter + AudioCacheStore — GET /conv/audio/{assetId}, 206 range, immutable, 410 erased → evict, Blob keyed by assetId

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

**SPEC refs:** SPEC-04 §1–3, SPEC-07 §2 (audio-erased), generator-config.yml §data_access AudioClip, contracts/backend-api-cross-link.md §1

## Outcome
`AudioAssetHttpAdapter` fetches audio Blobs from `GET ${ACCESS_HTTP_BASE}/conv/audio/{assetId}` (206 range-serveable; immutable `Cache-Control`). `AudioCacheStore` stores Blobs in Cache Storage keyed by `assetId`. `410 audio-erased` → evicts the cached Blob; `404 not-found` → Blob absent (fail-safe cascade in FE-CONV-009 handles both). Prefetch is called by `TreeSyncService` for new assetIds after a successful tree sync (diff-based, FE-CONV-007).

## Approach (execution path)
1. Create `frontend/libs/conv/data-access/src/lib/api/audio-asset-http.adapter.ts` — implement `AUDIO_ASSET_PORT`:
   - `prefetch(assetId: string): Observable<void>` — `GET ${ACCESS_HTTP_BASE}/conv/audio/{assetId}`; on 200: store Blob in `AudioCacheStore`; on 410 `audio-erased`: evict from cache; on 404 `not-found`: no-op (not an error at this layer — fail-safe handles it).
   - `getBlob(assetId: string): Observable<Blob | null>` — first checks `AudioCacheStore`; if absent, falls back to fetch and cache.
2. Create `frontend/libs/conv/data-access/src/lib/cache/audio-cache.store.ts`:
   - Cache Storage API (`caches.open('conv-audio-v1')`).
   - `get(assetId: string): Observable<Blob | null>`.
   - `put(assetId: string, blob: Blob): Observable<void>`.
   - `evict(assetId: string): Observable<void>` — called on 410 erased.
   - Quota management: on evict, also remove from the Cache Storage entry for that assetId.
3. `AudioAssetMockAdapter` serves the same Blob interface via same path (offline dev).
4. Error mapping by `ProblemDetail.type` slug (`audio-erased` → `AppError.code='audio-erased'`), not HTTP status.
5. Unit tests: 200 → Blob stored; 410 → evict called; 404 → returns null (no AppError thrown at this layer).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/api/audio-asset-http.adapter.ts` — prefetch(), getBlob()
- [ ] Base path `${ACCESS_HTTP_BASE}/conv/audio/{assetId}` (never `/api/v1/`)
- [ ] 410 `audio-erased` → evict from AudioCacheStore (NEVER replay evicted audio)
- [ ] 404 `not-found` → returns null (not thrown; fail-safe cascade handles)
- [ ] `frontend/libs/conv/data-access/src/lib/cache/audio-cache.store.ts` — Cache Storage, get/put/evict
- [ ] `AudioAssetMockAdapter` with same Blob interface
- [ ] Error mapping via ProblemDetail.type slug (not HTTP status)
- [ ] `npx nx test conv-data-access` PASS — 200+store, 410+evict, 404+null
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] `prefetch('id')` on 200 stores a Blob in Cache Storage under 'id'
- [ ] `prefetch('id')` on 410 calls `evict('id')` and does NOT replay the erased audio (SPEC-07 §2)
- [ ] `getBlob('id')` returns null (not throws) when clip is absent or 404
- [ ] Error code is derived from `ProblemDetail.type` slug, not HTTP status
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-003 (AUDIO_ASSET_PORT InjectionToken).
INT-FE-CONV-003 (shared/error-model CONV type slugs for audio-erased mapping).

## Tenant-context impact
Cache Storage is per-origin; Blobs are patient-specific (assetId is globally unique per patient's voice). Provisioning must clear or scope the cache on patient change (INT-FE-CONV-2).
