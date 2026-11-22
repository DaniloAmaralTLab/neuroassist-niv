# ADR-016 — TRAINING phase: conversational LLM to generate/propose the speech tree

> **Date:** 2026-08-31 (Amendment 4)
> **Status:** accepted
> **Decision maker:** Danilo Amaral (architect, combined role — see ORG-001 in constraints.md) — decision closed in this conversation.

> NIV note: English-only product; pt-BR locale removed (see ADR-018-english-only-product).

---

## Context

ADR-015 fixed that the CONV runtime is pure retrieval (no LLM generating text at the moment the patient communicates). This shifts all responsibility for **creating and expanding** the speech tree to a separate moment: the **TRAINING phase**. In it, an LLM converses to propose new categories/phrases which — once approved — are indexed in Elasticsearch (ADR-015) and have audio synthesized via ElevenLabs (ADR-017). All conversation, proposed phrases and the resulting catalog are in English.

Who drives this conversation was decided to be **collaborative**: caregiver and patient participate together — the caregiver starts/assists the training session and the patient confirms or adjusts when residual capacity allows, instead of a flow exclusive to one of the two profiles.

## Options considered

### Option 1 — TRAINING as a collaborative flow (caregiver starts/assists + patient confirms/adjusts)

- **Advantages:**
  - Does not depend only on the patient's residual capacity (which may be limited and vary as the disease progresses) to start a session;
  - Keeps the patient's voice/intent in the final result (the patient confirms/adjusts, it is not just the caregiver deciding for them);
  - Reuses the two existing UI shells (`patient-shell` from ADR-012/Amendment 3 and the caregiver shell in DASH), with no need for a third access profile.
- **Disadvantages:**
  - More complex flow to design (the UI must support handoff between the two profiles within the same training session);
  - RBAC must cover an action involving two identities (`acs` caregiver + patient session from ADR-012) in the same approval transaction for a new node.
- **Cost:** medium-high — the most complete option, but also the most laborious to design and implement.

### Option 2 — Caregiver only drives (patient does not take part in authoring)

- **Advantages:** simpler to implement; does not depend on the patient's residual capacity.
- **Disadvantages:** loses fidelity to the patient's real voice — the product's goal (LBC) is precisely to preserve the patient's autonomy/expression, not to replace it with the caregiver's interpretation.
- **Cost:** low, but further from the product's core value.

### Option 3 — Patient only drives (residual capacity)

- **Advantages:** maximum fidelity to the patient's voice.
- **Disadvantages:** the disease is progressive (ALS/MND) — residual capacity may not sustain a full authoring conversation alone, creating a single point of failure in the training process.
- **Cost:** low to implement, but high risk of the flow becoming unusable as the disease advances.

## Decision

**Option 1 — collaborative flow.** The TRAINING session is started/assisted by the caregiver and the patient confirms or adjusts when able. The result (approved proposed categories/phrases) feeds indexing in Elasticsearch (ADR-015) and audio synthesis (ADR-017).

## Rationale

Balances fidelity to the patient's voice with robustness of the process in the face of disease progression — it does not block the product if the patient's capacity varies, without giving up on giving the patient the final word on what enters their own speech tree.

## How to reverse if the decision proves wrong

Simplifying to Option 2 (caregiver only) is a direct scope cut, with no schema change — the collaborative UI can degrade to "caregiver only" without breaking the `SpeechTreeNode` data model or the indexing.

## Signals that it is wrong

- The handoff between the two profiles within the same session proves confusing or frustrating in practice (real pilot with Márcio/Jamilly Amaral);
- Training sessions rarely manage to actually involve the patient, drifting the flow toward "caregiver decides alone" in practice, despite the collaborative design — a sign that Option 2 already reflects reality and the collaborative design is unused overhead.

## Related constraints

- `TECH-007` — TRAINING is the only phase with LLM-assisted content generation; the CONV runtime remains pure retrieval (ADR-015).
- `SEC-002` — content generated in TRAINING (tree text) has the same health-data sensitivity as the rest of CONV.

## Relationship with existing modules

TRAINING is neither an extension of pure `CONV` (which today is only navigation/presentation, see ADR-013) nor does it fit in `DASH` (a query dashboard, not AI-assisted authoring). See the registration of the new module `TRN` in `technical-framing.md §11.3`.

## Complementary decisions closed on 2026-08-31

- **RBAC — real dual authorization:** a `SpeechTreeNode` proposed by the LLM is only indexed (ADR-015) after **two distinct, mandatory RBAC actions**: `training.node.approve.caregiver` (via ACS, in the caregiver shell/DASH) **and** `training.node.approve.patient` (via the patient session from ADR-012, in the patient-shell). The node has two independent boolean fields (`caregiverConfirmed`, `patientConfirmed`); only when both are `true` does the indexing pipeline (embedding + ElevenLabs TTS) fire. It is not a simultaneous transaction — the two confirmations can happen at different times (asynchronously), which solves the UI handoff problem: each profile confirms in its own shell, without needing the same screen at the same time.
- **UI handoff:** a direct consequence of the decision above — there is no screen handoff within a single session. The caregiver starts the conversation with the LLM and sees the proposals in DASH; the patient sees the same pending proposals (`caregiverConfirmed=true, patientConfirmed=false`) in the patient-shell, at their own pace, and confirms or adjusts when able.
- **LLM provider:** Claude/Anthropic API. Use is occasional (only in training sessions, not continuous) — low and predictable cost given the volume, good conversation quality in English.
- **Proposed and unconfirmed node:** stays in `draft` (draft/pending) state **indefinitely**, with no automatic expiry — given ORG-001 (small team, no need for expiry complexity), the caregiver can discard it manually at any time from the TRAINING screen.

## TODO[architect]

- Implementation detail of the asynchronous indexing pipeline (fire embedding+TTS only when `caregiverConfirmed AND patientConfirmed` become `true`, possibly via event/outbox) — no longer an architecture decision, it is construction work.
