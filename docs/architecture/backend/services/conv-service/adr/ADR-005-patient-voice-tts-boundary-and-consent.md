<!-- OUTPUT-SCHEMA
- Status
- Contexto
- Decisão
- Consequências
-->

# ADR-005 — Patient-voice TTS: runtime/authoring boundary and consent (SAFETY/COMPLIANCE)

## Status
aceita

> orchestrator default (recommendation) — revisable by the owner. **SAFETY/COMPLIANCE.**

## Contexto
CONV plays phrases in the patient's **own cloned voice**, synthesized with ElevenLabs. A cloned
voice derived from a patient's recordings is **biometric-adjacent, health-context personal data**:
it needs consent, careful storage, deletion/erasure, and a vendor data-processing agreement. M0 and
the registry place **synthesis in TRN's authoring phase** (LLM dialog + dual authorization → index
content → synthesize audio), and state **CONV is the runtime only**. The boundary must be confirmed
and the data-protection obligations placed.

Options: **(A) CONV synthesizes on demand** (calls ElevenLabs at runtime) — rejected: puts a vendor
call on the patient's speaking path (breaks ADR-003), and spreads biometric handling into the
runtime; **(B) CONV plays only pre-synthesized cached audio**, synthesis + consent + sample storage
+ vendor DPA all in TRN authoring.

## Decisão
**Adopt Option B and confirm the boundary: CONV runtime never synthesizes or calls ElevenLabs.**
- CONV depends only on an **`AudioAssetPort`** to fetch **pre-synthesized, cached** audio by stable
  `assetId` from the published bundle. The **`TtsPort`** (ElevenLabs behind it) exists **only in
  TRN authoring**, never in CONV.
- **Consent (SAFETY/COMPLIANCE):** the patient **and their legal representative** consent to voice
  cloning **before any synthesis**, captured at authoring (TRN). CONV serves audio only for versions
  TRN published as consented.
- **Storage:** voice **samples** and the **voice model id** are stored by **TRN/authoring**, not
  CONV. CONV persists only a `storageRef` + an **erasable per-subject key reference**
  (`voiceModelRef`) to the synthesized audio.
- **Deletion/erasure:** aligned with HIST **ADR-006 crypto-shred** — on an erasure request
  (patient/representative), the per-subject key is deleted so cached audio and the model reference
  become unreadable; the affected tree version transitions to `withdrawn` and the fact is audited
  (see local ADR-006). The station must drop the patient's cached audio on unpair/erasure (ADR-003
  device-side obligation).
- **Vendor:** the ElevenLabs data-processing agreement, region and retention of samples/model are
  **TRN/authoring** obligations; CONV introduces no new vendor relationship.

## Consequências
- Positive: no vendor call and no biometric handling on the patient's speaking path; blast radius
  of the TTS vendor is confined to TRN.
- Positive: erasure is honorable end-to-end (crypto-shred) without breaking audit immutability.
- Positive: consent is enforced upstream; CONV can assume every served version is consented.
- Negative: CONV depends on TRN having captured consent and stored assets correctly — a cross-
  module contract to pin in Specs (G1/G2).
- Negative: device-side cached audio must be protected and wiped by the station (COMPLIANCE
  obligation outside CONV's backend).
