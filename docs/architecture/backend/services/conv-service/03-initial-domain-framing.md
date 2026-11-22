<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

## Ubiquitous Language
- **Speech Tree** — the navigable structure of categories and phrases a patient uses to compose
  speech.
- **Category** — a grouping node in the tree (e.g. "Needs", "Feelings"). Holds child categories
  and/or phrases.
- **Phrase** — a leaf the patient can play: an English text plus a reference to its audio asset.
- **Audio Asset** — a pre-synthesized audio clip in the patient's cloned voice, identified by a
  stable `assetId`; authored and synthesized by TRN, served (not created) by CONV.
- **Published Tree / Tree Version** — an **immutable, versioned** snapshot of the whole tree +
  audio manifest for one patient, with a strong ETag; the unit the station caches.
- **Published Bundle** — the serialized Tree Version (tree + audio manifest) the station downloads
  and runs offline.
- **Navigation** — moving through the tree on the station; input-channel-agnostic, client-side.
- **Usage Signal** — an optional, opt-in, minimal record that a phrase was spoken (`phraseId` +
  timestamp, no free text).
- **Patient-with-session** — the patient actor whose station bears the ACS `conv.*`/`gest.*` token.

## Aggregates and Entities
- **PublishedTree (aggregate root)** — keyed by `tenantId` + `patientId`; holds the ordered set of
  **TreeVersion**s and a pointer to the **active** version. Enforces version immutability and
  ETag/active-pointer invariants.
  - **TreeVersion (entity)** — `version`, `etag`, `contentHash`, `audioManifest`, `publishedAt`,
    `publishedBy` (TRN actor), `status` (`active` | `superseded` | `withdrawn`).
  - **Category / Phrase (value objects within a version)** — immutable once the version is
    published.
  - **AudioAsset (reference/manifest entry)** — `assetId`, `storageRef`, `voiceModelRef`,
    `durationMs`, `contentHash`. The bytes live in blob storage; CONV holds the reference.
- **UsageSignal (separate, opt-in entity)** — `tenantId`, `patientId`, `phraseId`, `occurredAt`.
  No free text. Not part of the PublishedTree aggregate.

## Domain Events
- **PhraseSpoken** *(anchor)* — the patient selected and played a phrase. The reason CONV exists.
  Realized client-side; persisted only as an opt-in `UsageSignal`; **not** a HIST audit fact.
- **TreePublished** *(foundational)* — a new approved TreeVersion became the active vocabulary for
  a patient (via TRN publish). Audited to HIST.
- **TreeVersionSuperseded** — the previously active version was replaced by a newer one.
- **TreeVersionWithdrawn / AudioAssetsErased** *(terminal)* — a version (or a patient's voice
  assets) was withdrawn/erased; crypto-shred alignment with HIST ADR-006. Audited to HIST.

> Messaging is disabled: these are in-process domain events / audit facts over sync REST, not
> broker messages.

## State Transitions
TreeVersion lifecycle:
```
(none) --publish(TRN)--> active
active --publish(newer version)--> superseded   (the newer one becomes active)
active|superseded --withdraw/erase--> withdrawn  (terminal; audio crypto-shredded)
```
- Exactly one `active` version per (tenant, patient) at any time.
- The station's cached bundle is an eventually-consistent copy of the `active` version; staleness
  is bounded only by the next successful refresh (accepted offline-first cost, ADR-003).

## Invariants
- **INV-CONV-1** — a published TreeVersion is **immutable**; a change produces a new version, never
  an in-place edit.
- **INV-CONV-2** — exactly one `active` TreeVersion per (tenant, patient).
- **INV-CONV-3** — every Phrase in an `active` version references an existing AudioAsset in the same
  version's manifest (no dangling audio; the patient can always play what they can see).
- **INV-CONV-4** — the ETag is a pure function of the version's `contentHash`; equal ETag ⇒ byte-
  identical bundle (enables safe `304`).
- **INV-CONV-5** — the live speaking path performs **no** synchronous server call; a server/network
  outage never prevents navigation or playback from cache (SAFETY).
- **INV-CONV-6** — a `UsageSignal` carries no free text and is written only when usage logging is
  opted in; it is never on the critical path of playback and never a HIST audit fact.
- **INV-CONV-7** — all tree/audio/usage data is tenant-scoped; access requires a resolved
  `TenantContext` (schema-per-tenant).
