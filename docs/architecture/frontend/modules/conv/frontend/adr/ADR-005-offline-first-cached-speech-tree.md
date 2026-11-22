# ADR-005 (CONV-local) — Offline-first cached speech-tree runtime

- **Status:** proposed — 2026-11-20 (orchestrator default; revisable at Specs/M1.5)
- **Scope:** `libs/conv` runtime on the patient station (Patient Mode). Does not bind other modules.

## Context

CONV is the daily communication channel for a locked-in patient. The station may have no network, or
an unreliable one. A server round-trip **per navigation step** or **per spoken phrase** is
unacceptable: it would make the patient mute exactly when connectivity drops, and add latency to a
life-critical interaction. The published tree is small (one patient's dual-authorized nodes) and the
audio is **pre-synthesized** in the TRN phase (ElevenLabs, the patient's own voice, ADR-017). Elastic
Stack is **disabled at bootstrap** (`stack.elastic.enabled=false`), so server-side retrieval
(ES/kNN) is not available for the station in v1. The prototype simulates TTS and has no caching.

## Decision

The station runtime is **offline-first with the local cache as the source of truth**:

1. **Storage.** Tree snapshot + version in **IndexedDB** (`TreeCacheStore`); audio clips as **Blobs
   in Cache Storage** (`AudioCacheStore`, keyed by `audioRef`); a **Service Worker** backs the
   offline shell.
2. **Reads are cache-first.** Navigation and playback read only from cache — **zero** network calls
   in the daily loop. Facades never hit HTTP; only `TreeSyncService` does.
3. **Version-aware sync, out of the loop.** `TreeSyncService` fetches the published snapshot on
   (re)connect / periodic check / manual `syncNow`, compares `version`, and on a newer version
   downloads fully then **atomically swaps** (the old snapshot keeps serving until the new one is
   complete — never a half-written tree).
4. **Stale behaviour.** While offline, keep serving the last fully-cached snapshot and show a subtle
   "offline — last synced vX" marker. Never block, never spin forever, never silently drop content.
5. **Fail-safe audio.** Playback resolves **cached clip → device TTS (`SpeechSynthesis`, OPS-004) →
   large on-screen text**, in that order, with an honest "cached vs fallback" indicator. Audio is
   never silently absent.
6. **Search (if any) is client-side** over the cached tree only; no server kNN/ES in v1.

Concrete conv-service endpoints for snapshot + audio are **BE-owned (M1.5)** and consumed via `api/`
ports (`TREE_SNAPSHOT_PORT`, `AUDIO_ASSET_PORT`, base `${ACCESS_HTTP_BASE}/conv`); this ADR does not
invent URLs.

## Alternatives considered

- **Call the API per navigation/phrase (framework default).** Rejected: fails offline, adds latency,
  couples a life-critical path to connectivity.
- **In-memory cache only (no persistence).** Rejected: lost on reload/power-cycle; cold-empty on
  every boot.
- **Server-side ES/kNN retrieval on the station.** Rejected for v1: Elastic Stack disabled at
  bootstrap; also a network dependency on the hot path.
- **Synthesize audio on-device at runtime (live TTS as primary).** Rejected: not the patient's voice;
  TTS is the *fallback*, not the primary. Pre-synthesized ElevenLabs clips are the product promise.

## Consequences

- (+) Patient can communicate with the network fully down, at local-read latency.
- (+) Clear, honest degradation; no fake "spoken" state.
- (−) **Hard first-sync dependency**: a never-synced + offline station is cold-empty (risk R1 —
  mitigated by mandatory first sync at provisioning/onboarding).
- (−) Storage-quota management for audio Blobs (risk R4 — diff prefetch + eviction of superseded refs).
- (−) Stale content possible while offline until the next reconnect+swap (risk R5).

## References

- 02 §3 (golden paths A/B), 05 §3 (cache strategy), 06 R1/R2/R4/R5.
- Prototype `conv-tree.component.ts` (audioRef → cached vs Web Speech fallback, OPS-004).
- ADR-015 (ES indexing of reviewed content), ADR-017 (ElevenLabs audio), ADR-018 (English-only).
- Project context: `stack.elastic.enabled=false` (bootstrap conflict, M0).
