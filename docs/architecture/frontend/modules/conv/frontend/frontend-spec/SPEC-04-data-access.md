# SPEC-04 — Data Access — conv (CONV) Frontend

> CONV's network boundary is deliberately tiny and **non-blocking**: it syncs the published tree bundle and
> prefetches audio **out of the daily loop**, and reads navigation/playback **entirely from the local
> cache** (BE INV-CONV-5; ADR-005). `HttpClient` lives only in `api/` adapters behind the two ports; facades
> never touch HTTP. Endpoints are consumed **exactly as published** in BE `contracts/api-contract.md` — no
> URL is invented. Authorities equal the BE authority constants verbatim (D-639).

## 1. Master resource table

| Resource | Endpoint (BE api-contract) | Service / Port | Facade | Operations | Cache? |
|---|---|---|---|---|---|
| Tree bundle | `GET /conv/tree` (strong `ETag`, `If-None-Match`→`304`) | `TreeSnapshotHttpAdapter` behind `TREE_SNAPSHOT_PORT` | `SpeechTreeFacade` (reads `TreeCacheStore`) | `fetch(etag?)` → `304`/`200` | **IndexedDB** (`TreeCacheStore`), version-keyed, cache-first |
| Audio clip | `GET /conv/audio/{assetId}` (`206` range, immutable `Cache-Control`, `410` erased) | `AudioAssetHttpAdapter` behind `AUDIO_ASSET_PORT` | `AudioPlaybackService` (reads `AudioCacheStore`) | `prefetch(assetId)`, `getBlob(assetId)` | **Cache Storage** (Blobs keyed by `assetId`), immutable |
| Usage signal (opt-in) | `POST /conv/usage-signals` (`202`/`200` idempotent) | `UsageSignalHttpAdapter` behind `USAGE_SIGNAL_PORT` | `UsageSignalService` (outbound queue) | `enqueue(phraseId, occurredAt)`, `flush()` | outbound queue (IndexedDB), opportunistic flush |

- **Base path** `${ACCESS_HTTP_BASE}/conv` (via `@neuroassist/shared/access-http-base` interceptors —
  correlation + error-normalize); **never** `/api/v1` (carry-forward pitfall).
- Only `TreeSyncService` and `UsageSignalService` touch the ports. `SpeechTreeFacade` /
  `AudioPlaybackService` read **cache only** — **zero** network per navigation step or per phrase (INV-CONV-5).
- Audio-delivery shape is **resolved** by the BE contract: the tree response carries an `audioManifest`
  (`assetId` → `/conv/audio/{assetId}`, `contentHash`, `mediaType`, `durationMs`); clips are immutable and
  range-serveable (closes vision Q3; cross-link §2).

## 2. Adapter + mapper convention (Learning pitfall `scaffold:mock-adapter-default`, 7 occurrences)

- `provideConv()` ships **default `adapter:'http'`** — conv-service is published (BE M1.5). A providers spec
  proves the default resolves to the HTTP adapters, not the mock.
- HTTP adapters type responses as `<...Wire>` records **mirroring the BE JSON** (`TreeBundleWire`,
  `AudioManifestEntryWire`, `UsageSignalAckWire`) and `.pipe(map(toDomain))` into the VMs. The **Mock**
  adapter serves the **same wire shape** through the **same mappers** (offline dev / e2e), so switching the
  default never bypasses a mapper.
- `ETag` is carried end-to-end: the adapter returns the bundle **with** its `ETag`; `TreeSyncService` stores
  it and replays it as `If-None-Match`.

## 3. Sync & cache behaviour (ADR-005; doc 05 §3)

- **Cache-first reads.** Navigation and playback are served from `TreeCacheStore` / `AudioCacheStore`; a read
  **never hard-fails** on a CONV or network outage — the station keeps speaking from the last good bundle.
- **Version-aware revalidate (out of the loop).** `TreeSyncService.check()` runs on (re)connect / periodic
  check / manual `syncNow`. It sends `If-None-Match` with the cached `ETag`:
  - `304 Not Modified` → up-to-date; keep serving the cache.
  - `200` newer version → download the full bundle **and** diff-prefetch its audio, then **atomically swap**
    the cache (the previous snapshot keeps serving until the new one is fully cached — never a half-written
    tree).
- **Audio prefetch.** On sync, clips new to the manifest (diff by `assetId`) are fetched into Cache Storage
  as Blobs; superseded `assetId`s are evicted (quota management — R4).
- **Opt-in usage.** `UsageSignalService` enqueues `{phraseId, occurredAt, idempotencyKey}` (**no free text**,
  INV-CONV-6) and flushes opportunistically; the client-supplied `idempotencyKey` is
  `<phraseId>:<occurredAt>` scoped by the session's patient. Playback is **never** blocked on the flush.

## 4. Optimistic updates

**None.** CONV is a **read-only runtime** over published content — it writes no tree content and performs no
optimistic UI mutation (doc 05 §4). The only write is the fire-and-forget opt-in usage signal, which is
advisory, idempotent, and off the playback path. Patient confirmations are owned by TRN, not CONV.

## 5. INT items — upstream dependencies (see cross-link §3 for the full list)

| INT id | Needed by | Owner | What is needed | Blocking? |
|---|---|---|---|---|
| **INT-FE-CONV-1** | gesture navigation (ADR-007 seam) | **GEST** (`@neuroassist/gest` integration) | GEST must **publish** navigation intents in-process to CONV's `NAVIGATION_INTENT_PORT` (mirror of `STATION_LIVENESS_PORT`, direction reversed); GEST never HTTP-calls CONV | no — touch + switch-scan work without it (no-op default) |
| **INT-FE-CONV-2** | cold-empty mitigation (R1) | **EDGE / provisioning** (BE SPEC-10 INT-CONV-1) | first sync at provisioning must cache the **tree + audio** (not only a `200` tree read) under the patient-session token before patient handover | no — but a never-synced offline station is mute by construction |

## Acceptance criteria (EARS)

- WHEN the station syncs the tree with `If-None-Match` equal to the cached ETag, THE SYSTEM SHALL treat a 304 Not Modified as up-to-date and SHALL keep serving the cached bundle.
- WHEN the tree sync returns a newer version, THE SYSTEM SHALL download the full bundle and diff-prefetch its audio and then atomically swap the cache, and SHALL keep serving the previous bundle until the swap completes.
- THE SYSTEM SHALL serve navigation and playback entirely from the local cache and SHALL issue zero network calls on the patient's navigation and playback path.
- WHEN an opted-in phrase is spoken, THE SYSTEM SHALL enqueue a minimal usage signal of phrase id and timestamp with no free text and SHALL NOT block playback on its delivery.
- IF a usage-signal flush fails, THEN THE SYSTEM SHALL retain the queued signal for a later opportunistic flush and SHALL NOT surface an error to the patient.
- WHERE conv-service is published, THE SYSTEM SHALL bind the HTTP adapter as the default for the tree, audio and usage ports and SHALL map every response through the shared wire mappers.
