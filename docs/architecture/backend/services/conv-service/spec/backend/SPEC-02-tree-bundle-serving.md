# SPEC-02 — Core Orchestration: Serve the Published Tree Bundle

> Core verb+noun from the brief: **serve the published per-patient speech-tree bundle**.
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective
Serve the active, immutable per-patient bundle (tree + audio manifest) and its cached audio so the
station can run the patient's voice entirely from a local copy.

## Scope
- **In:** resolve the single `active` TreeVersion for the session's patient; serialize tree +
  audioManifest; compute the strong ETag; stream audio clips; the publish intake that makes a version
  active (summarized; full in SPEC-03/`api-contract` §5).
- **Out:** authoring, synthesis, navigation (client-side), escalation (EVNT).

## Technical decisions
- ADR-003 offline-first bundle; ADR-005 play-only audio; INV-CONV-2/3/4/5.

## Implementation
- `TreeService.read()` → `TenantContextHolder.require()` → `PublishedTreeRepositoryPort.findActive(patientId)`
  → serialize categories/phrases + manifest → set `ETag = contentHash`.
- `AudioService.read(assetId)` → `AudioAssetPort.fetch(storageRef)` → stream (range-aware).
- Bundle serialization includes, per phrase, a manifest entry whose `assetId` resolves in-version.

## Edge cases
- No active version (cold patient) → `404 tree-not-published` (first-sync INT item, SPEC-10 §4).
- Asset crypto-shredded → `410 audio-erased`.
- Active version withdrawn and no newer publish → patient has no active version; station keeps cache.

## Acceptance criteria (EARS)
- WHEN a station with `conv.tree.read` requests the tree, THE SYSTEM SHALL return the single `active` version with a strong `ETag` equal to its `contentHash` (INV-CONV-2, INV-CONV-4).
- THE SYSTEM SHALL guarantee every phrase in the served version references an existing manifest `assetId` (INV-CONV-3).
- WHEN a station with `conv.audio.read` requests a manifest `assetId`, THE SYSTEM SHALL stream the cached clip with `Cache-Control: immutable` and SHALL NOT call any TTS vendor (ADR-005, INV-CONV-5).
- THE SYSTEM SHALL perform no synchronous server call on the patient's navigation/playback path (INV-CONV-5) — reads are the station's opportunistic refresh only.
