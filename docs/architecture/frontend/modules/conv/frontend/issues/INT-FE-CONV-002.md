# INT-FE-CONV-002 -- EDGE provisioning first-sync must PREFETCH AUDIO — amend BE INT-CONV-1, EDGE owner, CONV unblocked by default cache-is-truth

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-04 §4, contracts/backend-api-cross-link.md §3 INT-FE-CONV-2

**Owner:** EDGE team (implements the prefetch in the provisioning flow); this issue is a coordination signal to EDGE, not a CONV implementation task.

## Outcome
EDGE's station provisioning flow (first-sync via `edge.device` token) must, after completing the tree snapshot fetch (`GET /conv/tree`), **immediately prefetch all audio assets** from the audio manifest before returning the provisioning success state. CONV's `cache-is-truth` design means the first patient session should never encounter a cold `treeState='cold'` because EDGE already pre-warmed the caches. This amends BE `INT-CONV-1` (the EDGE provisioning spec) to include the audio prefetch step.

**CONV is not blocked:** CONV's `AudioAssetHttpAdapter` and `AudioCacheStore` handle cache misses at runtime (TTS fallback, text-only). The EDGE prefetch is a UX optimisation. If EDGE does not implement it, patients experience TTS fallback on first use — that is functional but not ideal.

## EDGE must do
1. Amend `edge-provisioning.service.ts` or `edge-first-sync.service.ts`:
   - After fetching tree snapshot and writing it to IndexedDB (`cache[conv.tree]`):
   - Parse the `AudioManifestEntryWire[]` from the tree bundle.
   - For each audio entry, `GET /conv/audio/{assetId}` with the `edge.device` token and store the Blob in Cache Storage under the conv audio cache key.
   - Prefetch failures are non-fatal (the entry is left un-cached; CONV runtime falls back to TTS).
   - Report prefetch progress to the provisioning status surface (e.g., "Downloading audio: N/total").
2. Confirm that the final provisioning event emitted to CONV's `TreeCacheStore` includes `audioManifestPrefetchComplete: boolean`.
3. EDGE-side implementation in `libs/edge/data-access/src/lib/edge-provisioning.service.ts`.

## CONV-side (no code change)
CONV's `TreeSyncService` and `AudioCacheStore` already handle the case where audio is pre-warmed (they check the cache before fetching). No code change is needed in CONV for EDGE to implement this optimisation.

## Implementation checklist (by layer/file — EDGE owner)
- [ ] `libs/edge/data-access/src/lib/edge-provisioning.service.ts` — audio prefetch step after tree snapshot
- [ ] Prefetch iterates `AudioManifestEntryWire[]` from the tree bundle
- [ ] `GET /conv/audio/{assetId}` uses `edge.device` token
- [ ] Prefetch failures are non-fatal — missing audio entries stay un-cached (CONV TTS fallback covers it)
- [ ] Provisioning status surface shows "Downloading audio: N/total" progress
- [ ] BE `INT-CONV-1` amended (backend-api-cross-link.md updated to reflect EDGE now prefetches audio)
- [ ] `npx nx test edge-data-access` PASS — prefetch step + non-fatal failure handling
- [ ] `npx nx lint edge-data-access` PASS

## Acceptance criteria
- [ ] After provisioning, all audio entries from the tree manifest are present in Cache Storage
- [ ] A prefetch failure for one asset does not abort provisioning
- [ ] `npx nx test edge-data-access` PASS; `npx nx lint edge-data-access` PASS

## Dependencies
FE-CONV-008 (AudioCacheStore — defines the cache key structure EDGE must use to store Blobs pre-warmed).
BE INT-CONV-1 (the backend provisioning flow that EDGE calls — this issue amends its scope).

## Tenant-context impact
Audio assets are tenant/patient-scoped via the patient-session (`edge.device` acts on behalf of a station assigned to a tenant). EDGE must not cross-contaminate audio caches across tenants.
