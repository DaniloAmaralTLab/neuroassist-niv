# 05 — State and Data Flow — conv (CONV)

## 1. State topology

| State | Where | Kind |
|---|---|---|
| Speech-tree snapshot + version | `TreeCacheStore` (IndexedDB) → `SpeechTreeFacade` signals | durable, offline source of truth |
| Audio clips | `AudioCacheStore` (Cache Storage, Blobs keyed by `audioRef`) | durable, offline |
| Current level / selected node / channel | `SpeechTreeFacade` + `navigation/` signals | ephemeral UI |
| Scan cursor + timing | `navigation/` switch-scan model (signals) | ephemeral UI |
| Patient session + `conv.*` authorities | `@neuroassist/shared/auth-session` (global) | global |
| Sync status (offline/stale/version) | `TreeSyncService` signal | ephemeral UI |

CONV holds **no** global module store beyond the shared auth-session; its "big" state is the cache.

## 2. Data access pattern

`HttpClient` lives only in `api/` adapters behind `TREE_SNAPSHOT_PORT` / `AUDIO_ASSET_PORT`
(base `${ACCESS_HTTP_BASE}/conv`, **never** `/api/v1`). Adapters type responses as `<...Wire>`
mirroring the BE record and `.pipe(map(toDomain))`; the Mock adapter serves the same wire shape
through the same mappers; `provideConv` defaults to the **http** adapter (Learning pitfall guard).
**Facades never call HTTP directly** and **never** per navigation step — they read `TreeCacheStore`.
Only `TreeSyncService` touches the ports, out of the daily loop (§Golden path B in 02).

## 3. Cache strategy (DEFAULT — recommended, revisable; ADR-005)

CONV **inverts** the framework default ("call the API every navigation"): the station is offline-first.

- **Tree**: `TreeSyncService` fetches the published snapshot only on (re)connect / periodic check /
  manual `syncNow`; stored in IndexedDB with its `version`. Reads are **cache-first**; navigation is
  served entirely from IndexedDB (0 network). Background **revalidate**: if a newer version exists,
  download fully, then **atomically swap** (old snapshot keeps serving until the new one is complete).
- **Audio**: clips prefetched into Cache Storage on sync (diff by `audioRef`); played as Blobs.
- **Stale behaviour**: while offline, keep serving the last fully-cached snapshot and show a subtle
  "offline — last synced vX" marker. Never block, never spin indefinitely, never silently drop.
- **Cold-empty**: no snapshot yet + offline ⇒ honest empty-state ("not yet synced on this station").
- **Search (if any) is client-side** over the cached tree only — Elastic Stack is disabled at
  bootstrap (`stack.elastic.enabled=false`), so no server kNN/ES retrieval on the station in v1.

## 4. Optimistic updates

None. CONV is a **read-only runtime** over published content — it never writes tree content. Patient
confirmations are owned by the TRN patient-confirmation surface, not CONV.

## 5. Error handling

conv-service `ProblemDetail` → `AppError` via `@neuroassist/shared/error-model` →
`@neuroassist/shared/ui-feedback`. Offline / stale / cold-empty are **states**, not errors. `401`
(session revoked) → stop sync, surface "session ended — ask your caregiver". `403` (missing `conv.*`)
→ surface misconfiguration. Missing audio clip is **not** an error — it triggers the fail-safe
cascade (cached → device TTS → large text).

## 6. Breadcrumbs & navigation state

`navigation/` keeps the level stack (root → category → children) feeding a minimal breadcrumb for the
patient context (large, low-cognitive-load). Because the daily surface is near-single-screen (Screen
06), breadcrumbs are display-light; the `back()` action and active-channel badge carry the primary
orientation. The switch-scan timing model (dwell ms, scan interval) also lives here and is
host/profile-configurable for ALS/MND accessibility.
