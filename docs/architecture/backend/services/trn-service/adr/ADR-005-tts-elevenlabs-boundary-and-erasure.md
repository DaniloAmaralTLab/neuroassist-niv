<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-005 — ElevenLabs TTS boundary, voice consent and erasure (SAFETY/COMPLIANCE)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY/COMPLIANCE.**

## Contexto
Approved phrases are synthesized in the patient's **own cloned voice** (ElevenLabs). A cloned voice
derived from a patient's recordings is **biometric-adjacent, health-context personal data**: it needs
consent, careful storage, a vendor data-processing agreement, and a real erasure path. CONV **ADR-005**
already fixes the boundary from the runtime side: CONV never synthesizes or calls ElevenLabs; the
`TtsPort`, consent capture, voice-sample storage and vendor DPA are **TRN's**. TRN must realise that
obligation and define how synthesis, consent and erasure work on the authoring side.

## Decisão
**TRN owns synthesis and all voice-data handling behind `TtsPort` (ElevenLabs adapter in
`infrastructure/` only):**
- **Consent before synthesis:** a `granted`, non-revoked voice-cloning `ConsentRecord` for the patient
  **and** legal representative is a hard precondition for any `TtsPort` call (INV-TRN-3).
- **Storage:** voice **samples** and the **voice model id** are stored by TRN under a **per-subject
  crypto key**; relational rows hold only references (`voice_model_ref`, `storage_ref`), bytes live in
  blob storage. Synthesized `AudioAsset`s carry a stable `assetId`, `contentHash` and `voiceModelRef`
  and are handed to CONV in the published manifest (CONV persists only the reference, CONV ADR-005).
- **Erasure (crypto-shred):** on `trn.content.delete`, TRN deletes the **ElevenLabs voice model**,
  deletes the per-subject key (rendering samples, audio and `voice_model_ref` unreadable), marks the
  rows `erased`, and calls CONV `conv.tree-version.retire` + `conv.audio.delete`. Immutable records are
  retained with payload unreadable, aligned with HIST **ADR-006**. Erasure is audited **commit +
  durable-retry** and is **never blocked** by a HIST/CONV outage (ADR-007, INV-TRN-9).
- **Vendor:** the ElevenLabs DPA, region and sample/model retention are TRN obligations; synthesis is
  off the patient live path, so an ElevenLabs outage halts only the `synthesizing` step (retry; no
  partial publish — INV-TRN-4).
Alternative rejected: synthesizing on demand at runtime (in CONV) — already rejected by CONV ADR-005
(puts a vendor call and biometric handling on the patient's speaking path).

## Consequências
- Positive: biometric handling and the TTS vendor are confined to TRN; CONV runtime stays vendor-free.
- Positive: erasure is honorable end-to-end (vendor model + crypto-shred + CONV), never blocked.
- Positive: consent is enforced upstream, so every version CONV receives is consented (CONV ADR-005 G1/G2).
- Negative / trade-off: TRN carries the full compliance weight of voice data (key management, DPA,
  erasure orchestration); accepted as the correct home for it.
