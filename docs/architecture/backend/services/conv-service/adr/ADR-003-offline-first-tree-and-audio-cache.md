<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-003 — Offline-first tree + audio cache (SAFETY)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY.**

## Contexto
CONV is the patient's voice. If `conv-service` or the network is down, the patient must still be
able to communicate. A phrase must never wait on a server round-trip. The platform is already
offline-first for detection: **EDGE ADR-004** distributes the command catalog to the station behind
an ETag, serves the last good copy, and **never hard-fails on an upstream outage**. CONV faces the
same shape for the speech tree + audio.

Options: **(A) online-only** (station fetches per session/phrase) — rejected, a single outage
silences the patient; **(B) offline-first bundle cache** mirroring EDGE ADR-004; **(C) full
peer-to-peer sync** — over-engineered for MVP.

## Decisão
**Adopt Option B — an offline-first, versioned bundle cache modeled on EDGE ADR-004.**
- CONV serves an **immutable, versioned per-patient bundle** (tree + audio manifest) at
  `GET /conv/tree` (`conv.tree.read`) behind a **strong ETag** derived from the version
  `contentHash`; audio assets are served/streamed at `GET /conv/audio/{assetId}`
  (`conv.audio.read`).
- The **station persists the last good bundle + audio locally** and runs it. Navigation and
  playback are served **entirely from the local cache** — **no server round-trip per phrase**.
- Refresh is **opportunistic**: the station sends `If-None-Match`; `304` = cache valid, `200` =
  download and **atomically swap** the cache. The old bundle serves continuously until the swap.
- A tree read **never hard-fails on a CONV/network outage** — the station keeps the last bundle
  (**stale-but-usable**) and shows a "last synced" indicator. Staleness is the accepted offline-
  first cost; a vocabulary published during a long offline window appears only on the next refresh.

## Consequências
- Positive: the patient can always speak, even fully offline; latency is bounded by local I/O.
- Positive: ETag/304 keeps refresh cheap — the station re-downloads only a changed bundle.
- Positive: consistent with EDGE ADR-004, so stations reuse one caching pattern.
- Negative: a published change is invisible until the next successful refresh (R1); made observable
  via `version`/"last synced".
- Negative: the station holds patient voice audio locally — device-side protection (encryption at
  rest, wipe on unpair) is a station/FE obligation (COMPLIANCE, see ADR-005).
