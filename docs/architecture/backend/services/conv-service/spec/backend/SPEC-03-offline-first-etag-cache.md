# SPEC-03 — Offline-First Bundle, Strong ETag & Conditional Refresh

> Critical sub-feature (ADR-003, SAFETY). EARS guide: `../../../../standards/ears-notation.md`.

## Objective
Make the patient's voice survive any CONV/network outage: an immutable versioned bundle behind a
strong ETag, opportunistic `If-None-Match`/`304` refresh, stale-but-usable station cache, and a
publish that never breaks a station still holding the previous version.

## Scope
- **In:** strong ETag derivation (`= contentHash`); `304` on matching `If-None-Match`; atomic
  station-side cache swap contract; audio URL immutability; the first-sync-at-provisioning requirement
  (stated as an INT item for EDGE/provisioning).
- **Out:** the station's local storage mechanics (FE: IndexedDB + Cache Storage + Service Worker).

## Technical decisions
- Mirrors EDGE ADR-004 offline-catalog pattern. INV-CONV-4 (ETag purity), INV-CONV-5 (no live call).

## Implementation
- ETag = strong validator built from the version `content_hash`; equal ETag ⇒ byte-identical bundle.
- Audio clips are immutable: a given `assetId` always byte-identical; a new recording is a new
  `assetId` in a new version, so audio URLs are long-cacheable (`max-age=31536000, immutable`).
- Publish makes a new version active without mutating the old one; the old ETag keeps serving `200`
  to any station that still asks for it until that station refreshes.

## Edge cases
- Cold-empty station offline = patient **mute** (no cache). Requires a successful first sync while
  online at provisioning (INT-CONV-1, SPEC-10 §4; EDGE/provisioning obligation).
- Long offline window → station serves a stale bundle; a version published meanwhile appears only on
  the next successful refresh (accepted offline-first cost, ADR-003).

## Acceptance criteria (EARS)
- THE SYSTEM SHALL compute a strong `ETag` as a pure function of `content_hash`; equal `ETag` ⇒ byte-identical bundle (INV-CONV-4).
- WHEN `GET /conv/tree` carries `If-None-Match` equal to the current ETag, THE SYSTEM SHALL respond `304 Not Modified` with no body.
- THE SYSTEM NEVER hard-fails the station on a CONV/network outage — the station keeps its last good bundle (stale-but-usable, ADR-003); the server-side guarantee is that a successful read is always the current `active` version with a correct ETag.
- WHEN a newer version is published, THE SYSTEM SHALL keep serving correct `200`/`304` responses to a station still presenting the previous ETag until it refreshes (publish never breaks a holding station).
- WHERE a station has never completed a first sync, THE SYSTEM REQUIRES provisioning to perform one while online before patient handover (INT-CONV-1 — EDGE/provisioning, not a CONV endpoint).
