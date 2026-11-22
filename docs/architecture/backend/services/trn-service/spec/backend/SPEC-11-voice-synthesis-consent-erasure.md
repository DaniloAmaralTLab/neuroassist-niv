# SPEC-11 — Voice Synthesis, Consent and Erasure

> Domain-required (ADR-005/ADR-006/ADR-007). Biometric-adjacent personal data.
> EARS guide: `../../../../standards/ears-notation.md`.

## Objective

Specify consent capture, consent-gated synthesis, the publish manifest TRN hands to CONV, and
right-to-be-forgotten erasure (crypto-shred + CONV propagation), all never-blocked and off the patient
path.

## Scope

**In:** `ConsentRecord`, `TtsPort` synthesis, `audio_asset` manifest, erasure orchestration. **Out:**
CONV audio serving (CONV), the ES index (SPEC-10).

## Technical decisions

- **Consent before synthesis (INV-TRN-3):** a `granted`, non-revoked `consent_record` for the patient
  **and** legal representative is a hard precondition for any `TtsPort` call.
- **Per-subject crypto key (ADR-005):** voice samples, voice-model id and audio refs are stored under a
  per-subject key; relational rows hold only references.
- **Erasure = crypto-shred (ADR-006):** delete the vendor model, delete the per-subject key (refs become
  unreadable), mark rows `erased`, retire CONV versions, erase CONV audio — never hard-delete governance
  records; never blocked by a HIST/CONV outage (INV-TRN-9).

## Implementation

- `CaptureConsentService` writes `consent_record` (both halves true → `granted`), audits `ConsentGranted`
  (hard-502). Revocation audits `ConsentRevoked` (commit + durable-retry) and blocks future synthesis.
- `SynthesizeAndPublishService` (consent verified) calls `TtsPort` per approved phrase → writes
  `audio_asset` (`assetId`, `storageRef`, `voiceModelRef`, `contentHash`, `durationMs`) under the
  per-subject key; raises `ContentSynthesized`. Then indexes approved content (SearchIndexPort) and
  publishes the manifest to CONV (SPEC-10) — no phrase without its asset (INV-TRN-4).
- `EraseContentService` (on `trn.content.delete`): delete ElevenLabs model → delete per-subject key →
  mark `voice_model`/`voice_sample`/`audio_asset` `erased` → enqueue `conv.tree-version.retire` +
  `conv.audio.delete` → audit `VoiceModelDeleted`/`ContentErased` (commit + durable-retry).

## Publish manifest (handed to CONV `POST /conv/trees`)

Each phrase references an `assetId` present in `audioManifest[]` with
`{assetId, storageRef, voiceModelRef, mediaType, durationMs, contentHash}` (CONV api-contract §5);
`sourceVersionRef = trn:approval:<approvalId>`, `idempotencyKey = trn:publish:<approvalId>`.

## Edge cases

- Synthesis requested without consent → `409 consent-required`, no `TtsPort` call.
- Consent revoked mid-authoring → new synthesis refused; already-synthesized assets handled by erasure.
- ElevenLabs down during synthesis → `synthesize` job retried; proposal stays `approved`; no partial
  publish.
- Double erasure → idempotent (`202`, zero counts).

## Acceptance criteria (EARS)

- WHILE no `granted`, non-revoked consent exists for the patient and representative, THE SYSTEM SHALL refuse synthesis `409 consent-required` and SHALL NOT call `TtsPort` (INV-TRN-3, ADR-005).
- WHEN consent is captured with both halves, THE SYSTEM SHALL create a `granted` record and audit `ConsentGranted` (hard-502) before any synthesis.
- THE SYSTEM SHALL store voice samples, the voice-model id and audio refs under a per-subject crypto key and hold only references in relational rows (ADR-005).
- THE SYSTEM SHALL NOT publish a version whose phrase references an `assetId` without an `available` synthesized asset in the same version (INV-TRN-4).
- WHEN erasure is requested, THE SYSTEM SHALL delete the ElevenLabs model, crypto-shred the per-subject key, mark rows `erased`, retire CONV versions and erase CONV audio, and audit the erasure (commit + durable-retry) — never blocked by a HIST/CONV outage (INV-TRN-9, ADR-005/006/007).
- WHEN erasure repeats for an already-erased patient, THE SYSTEM SHALL respond idempotently with zero counts.
