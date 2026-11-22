# FE-CONV-007 -- TreeCacheStore (IndexedDB) + TreeSyncService — version-keyed cache, check(), atomic swap, diff-audio-prefetch trigger

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/10 itens

**SPEC refs:** SPEC-04 §3, ADR-005, generator-config.yml §data_access TreeBundle, contracts/backend-api-cross-link.md §1

## Outcome
`TreeCacheStore` persists the versioned tree bundle in IndexedDB (version-keyed; `get()`, `put()`, `atomicSwap()`). `TreeSyncService` orchestrates `check()`: sends `If-None-Match`; on `304` keeps cache unchanged; on `200` downloads bundle, computes audio manifest diff, triggers audio prefetch for new assetIds, then atomically swaps the cache (previous bundle serves until swap completes). The `offline` and `snapshotVersion` signals are updated. A tree read **never hard-fails** on CONV or network outage — the last good cache always serves.

## Approach (execution path)
1. Create `frontend/libs/conv/data-access/src/lib/cache/tree-cache.store.ts`:
   - IndexedDB via the platform's IndexedDB API (or a thin wrapper).
   - `get(): Observable<{ bundle: TreeBundleWire; etag: string } | null>` — reads current snapshot.
   - `put(bundle: TreeBundleWire, etag: string): Observable<void>` — writes (non-atomic; for direct writes).
   - `atomicSwap(bundle: TreeBundleWire, etag: string): Observable<void>` — write to a staging entry, then atomically rename (the previous bundle keeps serving during the write).
   - Signals: `offline = signal(false)`, `snapshotVersion = signal('')`.
2. Create `frontend/libs/conv/data-access/src/lib/tree-sync.service.ts`:
   - `check(): void` (fire-and-forget, non-blocking) — reads cached ETag from `TreeCacheStore`, calls `TreeSnapshotHttpAdapter.fetch({ etag })`:
     - `null` (304) → cache valid, update `offline=false`.
     - `{ bundle, etag }` (200) → compute audio diff (new assetIds), call `AudioAssetHttpAdapter.prefetch(assetId)` for each new assetId, then `TreeCacheStore.atomicSwap()`.
   - `syncNow(): Observable<void>` — manual user-triggered sync (same as `check()` but returns Observable so the UI can show a toast on failure).
   - On 401/403 → emit signal to stop further retries (session-ended / setup-issue path).
   - On network failure → `offline=true`, cache stays valid (never hard-fail).
3. Unit tests: `304` → no swap; `200` new assetIds → prefetch called; network fail → offline=true.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/data-access/src/lib/cache/tree-cache.store.ts` — IndexedDB, get/put/atomicSwap, offline signal, snapshotVersion signal
- [ ] `atomicSwap()` — previous bundle serves until swap completes (never partial write)
- [ ] `frontend/libs/conv/data-access/src/lib/tree-sync.service.ts` — check(), syncNow()
- [ ] `check()` is fire-and-forget (void return), non-blocking
- [ ] 304 → no swap, offline=false
- [ ] 200 → compute diff, prefetch new audio assetIds, then atomicSwap
- [ ] Network failure → offline=true; cache continues serving (never hard-fail)
- [ ] 401/403 → emit stop-sync signal
- [ ] `npx nx test conv-data-access` PASS — 304, 200+diff+swap, network-fail cases
- [ ] `npx nx lint conv-data-access` PASS

## Acceptance criteria
- [ ] `check()` returns void immediately; cache continues serving while sync is in flight
- [ ] On 200 with new assetIds, audio prefetch is triggered before the atomic swap
- [ ] On network failure, `offline=true` and the last good bundle keeps serving
- [ ] On 401, further retries are stopped (session-ended path, not retried forever)
- [ ] `atomicSwap()` leaves the old bundle readable until the new one is fully committed
- [ ] `npx nx test conv-data-access` PASS; `npx nx lint conv-data-access` PASS

## Dependencies
FE-CONV-006 (TreeSnapshotHttpAdapter for the fetch call).
FE-CONV-008 (AudioAssetHttpAdapter for prefetch trigger).

## Tenant-context impact
IndexedDB is per-origin; patient-session is per-patient. If multiple patients use the same station, the cache should be keyed or cleared on session change — flag for the provisioning flow (INT-FE-CONV-2 is the upstream dependency).
