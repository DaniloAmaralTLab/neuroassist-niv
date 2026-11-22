# ADR-017 — TTS via ElevenLabs (patient's voice): synthesis in the TRAINING phase, audio cache

> **Date:** 2026-08-31 (Amendment 4)
> **Status:** accepted
> **Decision maker:** Danilo Amaral (architect, combined role — see ORG-001 in constraints.md) — decision closed in this conversation.
> **Partially supersedes:** ADR-013, "Complementary decision" section — the passage "TTS is a presentation responsibility... the CONV module does not persist audio" no longer holds (see Decision below).

> NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

---

## Context

The synthesized voice for the patient already exists as a voice clone in ElevenLabs (a product decision, outside Stage 0 — the voice itself was not created by this process). The original ADR-013 assumed synchronous TTS with no persistence ("synthesized at selection time"). Amendment 4 changes that premise: so as not to depend on calling the ElevenLabs API on every phrase selection (cost, latency, internet dependency in continuous use — see OPS-002), synthesis now happens **once, in the TRAINING phase** (ADR-016), with the resulting audio cached for reuse throughout the runtime. Synthesis uses the patient's cloned voice speaking English.

## Options considered

### Option 1 — Synthesis only in the TRAINING phase, audio cached (reference indexed in Elasticsearch, file in separate storage)

- **Advantages:**
  - The CONV runtime does not depend on an API call per interaction — no per-use cost, no network latency, no dependence on the internet at the moment of the patient's real communication;
  - Elasticsearch stores the text + embedding (ADR-015) + a reference to the audio file — not the binary itself, avoiding overloading the index with media blobs;
  - Aligned with FIN-001 (no budget) — ElevenLabs cost becomes predictable (1 synthesis per new/edited phrase, not per use).
- **Disadvantages:**
  - A new phrase proposed at runtime (outside TRAINING) has no audio available until the next training session — mitigated by the fallback (see constraint OPS-004);
  - Needs file storage in addition to Elasticsearch (filesystem or lightweight object storage).
- **Cost:** low to medium — reuses the same indexing as ADR-015, adds only a reference field + simple storage.

### Option 2 — Real-time synthesis on every phrase selection (original ADR-013 model)

- **Advantages:** simple, no additional storage.
- **Disadvantages:** per-use cost (violates the spirit of FIN-001), network latency on every interaction, the patient's communication comes to depend on the internet + ElevenLabs availability even for phrases already used hundreds of times.
- **Cost:** high in accumulated daily continuous use.

## Decision

**Option 1.** Voice synthesis via ElevenLabs happens exclusively in the TRAINING phase (ADR-016), when approving a new or edited tree node. The resulting audio is stored in simple file storage (filesystem or lightweight object storage, given the volume — 1 patient, a few dozen phrases); Elasticsearch stores the text, the embedding (ADR-015) and the **reference** to the file — not the binary. The CONV runtime only plays the audio already cached.

This **supersedes** the passage of ADR-013 that said CONV does not persist audio — it now does, as a direct consequence of separating TRAINING (synthesis) from USE (playback).

## Rationale

Avoids cost and network dependence on the critical path of the patient's daily communication; keeps Elasticsearch in the role it does well (search), delegating media storage to appropriate storage.

## How to reverse if the decision proves wrong

Reverting to real-time synthesis is a cache removal, not a structural change — the ElevenLabs call pipeline would still exist (today it only runs in the TRAINING phase); it would just be called at runtime too.

## Signals that it is wrong

- The frequency of new phrases outside training sessions proves high enough that the fallback (Web Speech API, without the patient's real voice) is used often enough to be annoying;
- Audio storage cost (unlikely given the volume) proves disproportionate.

## Fallback (degraded mode)

If the cached audio does not exist (new phrase, not yet through TRAINING) or ElevenLabs/storage is unavailable at synthesis time: the runtime uses the **browser's native TTS (Web Speech API)**, with a generic English voice — worse fidelity, but communication does not stop. Same degradation pattern adopted for Elasticsearch (ADR-015 / constraint OPS-003).

## Related constraints

- `TECH-008` — ElevenLabs synthesis only in the TRAINING phase; the runtime does not call the API.
- `OPS-004` — fallback to Web Speech API if cached audio is missing or ElevenLabs is unavailable.
- `FIN-002` — ElevenLabs cost is per synthesis in TRAINING, not per daily use.
- `SEC-002` — the patient's cloned voice and the generated audio are sensitive data (voice biometrics + health content); storage follows the same safeguards as REG-001/OPS-002.

## Complementary decisions closed on 2026-08-31

- **File storage:** simple local filesystem on the single server itself (consistent with OPS-002 — internal network, no public exposure). Volume is low (dozens of files for 1 patient); MinIO-style object storage would be disproportionate overhead for the pilot — revisit only if the product expands to multiple institutional tenants.
- **Audio format/quality:** MP3 (or Opus) at standard voice bitrate (64-96kbps) — sufficient fidelity for short spoken phrases, small files, no need for studio quality.

## ElevenLabs terms-of-use research (2026-08-31)

Survey against `elevenlabs.io/terms-of-use` and `elevenlabs.io/use-policy` (sources below), to inform the sponsor's decision:

- **Cloning consent (ToS §4g):** the user must own or have explicit authorization over the cloned voice. Cloning the **patient's own voice**, with their authorization (or the family's, given the progressive-illness context) satisfies this requirement — but **who authorized it and when is not formally documented**. Recommendation: record the consent of Márcio Amaral himself for the voice clone in writing (even informally, e.g. email/message), while he still has the capacity to consent.
- **PHI/HIPAA (ToS §4h) — a real point of attention:** the ToS **explicitly prohibits** sending any protected health information (PHI, HIPAA definition) as "Input", except with an executed BAA (Business Associate Agreement) — not feasible for a family pilot with no budget (FIN-001). HIPAA is a US law (it does not legally apply to a Brazilian family project under LGPD, the Brazilian data-protection law), but the prohibition is a **contractual term of ElevenLabs**, valid regardless of jurisdiction — violating it may lead to account suspension.
  - **Mitigation:** the real content of the speech tree (e.g. "I want water with ice", "reposition me", "call Danilo" — see Screen 06/08 of the wireframe) is everyday communication, not clinical/diagnostic information — it should not be treated as PHI in practice. Even so, **never** enter text that describes a diagnosis, specific clinical symptoms or medical records as phrase content — always keep the vocabulary in the register of everyday needs.
- **Use in a health context (Use Policy):** requires clear disclosure that the user is interacting with AI, not a human — this applies to the LLM conversation in the TRAINING phase (Screen 08), not to TTS playback itself. A badge is already suggested in the wireframe ("Training — this is not the patient app"); it is recommended to make explicit that it is AI.
- **Use of audio to train ElevenLabs models:** it is possible to opt out ("Data use" in the account) — recommended given REG-001/SEC-002 (sensitive data), so the voice clone + the patient's content are not made available to train third-party models.

**Sources:** [ElevenLabs Terms of Service](https://elevenlabs.io/terms-of-use) · [ElevenLabs Prohibited Use Policy](https://elevenlabs.io/use-policy)

## TODO[sponsor]

- **Final decision still with the sponsor (Márcio Amaral), with the findings above as input:** confirm/document formal consent for the voice clone; confirm that the speech-tree vocabulary stays in an everyday (non-clinical) register so as not to run into the ToS PHI prohibition; and authorize (or not) disabling the use of audio for ElevenLabs model training (disabling recommended).
