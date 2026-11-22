<!-- OUTPUT-SCHEMA
- Intent
- Problem Statement
- Personas
- MVP Scope
- Out of Scope
- Architectural Principles
- Success Signals
-->

# 01 — Architectural Vision

## Intent
CONV (`conv-service`, `com.neuroassist.conv`) is the **runtime that gives a patient back
their voice**. It serves an approved, versioned **speech tree** (category → phrase) and the
**pre-synthesized audio in the patient's own cloned voice**, and lets the patient navigate it
by any input channel to play a phrase. CONV is the consumer end of the patient-with-session
actor (ACS INV-3): the station carries a patient-session token restricted to `conv.*`/`gest.*`.
CONV owns the *runtime only* — authoring and synthesis belong to TRN.

## Problem Statement
A person living with ALS/MND loses speech while retaining the will to communicate. The platform
already turns residual micro-movements into help requests (GEST → EVNT). CONV adds the
**conversational** channel: the patient composes meaning by walking a tree of categories and
phrases and plays the chosen phrase aloud in a voice that is recognizably *theirs*. Three
constraints dominate the design: (1) this is often the patient's **only** channel, so it must
keep working when the network or the server is down; (2) a phrase must play **without a server
round-trip** — latency and connectivity cannot stand between a patient and their words; (3) the
patient's voice (a cloned biometric-adjacent asset) and any record of what they said are
**sensitive** and must be handled with consent and erasability. CONV must satisfy all three
while staying a thin runtime over content that TRN authors.

## Personas
- **Patient-with-session (primary).** The person who communicates. Drives the station with the
  ACS-minted patient-session token (`conv.*`/`gest.*` only, no expiry, revocable). Reads the
  tree and audio; never administers anything.
- **Family Caregiver (`CAREGIVER`) / Clinic Coordinator (`CLINIC_COORDINATOR`) (secondary).**
  Set up Patient Mode on the station and review opt-in usage on the dashboard (DASH). They do
  not drive the speech tree themselves.
- **Patient station (non-human).** Browser/edge runtime that mounts the tree, holds the offline
  cache, and maps input events to navigation locally.
- **TRN service-client (non-human).** Hands CONV an approved, immutable tree version to publish.
  TRN's authoring dialog and synthesis are upstream, not a CONV runtime persona.

## MVP Scope
- Serve the **published per-patient speech-tree bundle** (tree + audio manifest) behind a strong
  **ETag/version** (`GET /conv/tree`, `conv.tree.read`).
- Serve/stream the **cached audio assets** in the patient's voice (`conv.audio.read`).
- **Offline-first station cache:** the station runs the last good bundle; a read never
  hard-fails on a CONV/network outage; opportunistic refresh via `If-None-Match`/`304`
  (EDGE ADR-004 pattern).
- **Input-channel-agnostic navigation** resolved **entirely client-side over the cached tree**
  (gesture via the in-process GEST station seam, or touch/mouse) — **no per-step network call**.
- **Publish intake** of an approved tree version from TRN (`POST /conv/trees:publish`,
  `conv.tree.publish`) with an audited **TreePublished** fact to HIST.
- Optional **opt-in minimal usage signal** (`conv.usage.record` — `phraseId` + timestamp, no
  free text).

## Out of Scope
- Tree-content authoring, the LLM dialog and dual authorization (**TRN**).
- **Audio synthesis / any ElevenLabs call** — TRN's authoring phase; CONV runtime never calls
  the TTS vendor.
- Gesture recognition engine (**GEST**); event/alarm generation, routing and escalation
  (**EVNT** — CONV is not wired for escalation, superseded by EVNT ADR-005).
- Caregiver identity, session provisioning, JWT blacklist (**ACS**); patient registration and
  the gesture command catalog (**PAT**); device enrollment/pairing/heartbeat (**EDGE**).
- Async outbox/broker (messaging disabled); any language beyond English (English-only).

## Architectural Principles
1. **The patient is never blocked on the network.** Navigation and playback run from the local
   cache; a phrase never waits on a server round-trip (SAFETY).
2. **Runtime, not authoring.** CONV serves and plays approved content; it never authors or
   synthesizes. The TTS vendor seam lives in TRN.
3. **Ports before vendors.** Retrieval sits behind a `SearchPort` (ES disabled → Postgres v1),
   audio behind an `AudioAssetPort`; swapping an implementation never changes a contract.
4. **Minimal data about speech.** What the patient says is sensitive — persist the least
   possible, opt-in, never free text, and keep live speaking out of the audit path.
5. **Hexagonal + schema-per-tenant**, sync REST only (messaging disabled), English-only content.

## Success Signals
- A patient can open the station with no connectivity and still browse every category and play
  every phrase from the last published bundle.
- Time from phrase selection to audio playback is bounded by local I/O, independent of server or
  network state.
- A new vocabulary published by TRN reaches the station on the next successful refresh, with the
  old bundle serving continuously until then (no gap in the patient's voice).
- No free-text record of patient speech exists unless usage logging is explicitly opted in; an
  erasure request renders a patient's voice assets unreadable (ADR-006 crypto-shred alignment).
