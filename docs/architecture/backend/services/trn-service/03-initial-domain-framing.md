<!-- OUTPUT-SCHEMA
- Ubiquitous Language
- Aggregates and Entities
- Domain Events
- State Transitions
- Invariants
-->

# 03 — Initial Domain Framing

## Ubiquitous Language
- **Training Session** — a bounded authoring activity opened by a caregiver for one patient, inside
  which the assistant dialog and proposals happen. Occasional and supervised; not the daily runtime.
- **Assistant Dialog** — the LLM-mediated conversation (behind `LlmDialogPort`) that turns
  caregiver/patient intent into proposals. The LLM **proposes**; it never approves or publishes.
- **Proposal** — a draft category or phrase under consideration, with its lifecycle state and its
  **dual authorization**. The unit that is approved, synthesized and published.
- **Dual Authorization** — the pair of confirmations required before any proposal is `approved`: a
  **caregiver decision** (`trn.proposal.approve`) and a **patient/guardian assent** (recorded fact).
- **Caregiver Confirmation** — the caregiver half of the dual authorization (authenticated action).
- **Patient/Guardian Assent** — the patient half: the patient's in-session assent via their own
  input channel, or a **legal guardian**'s confirmation when the patient is non-verbal — captured as
  `{confirmedBy, method, evidenceRef, relationship?, occurredAt}`, never as an OAuth authority.
- **Consent (voice cloning)** — the patient's and legal representative's consent to clone the voice,
  captured **before** any synthesis; scoped, time-stamped, revocable.
- **Voice Sample / Voice Model** — the patient recordings and the ElevenLabs cloned-voice model;
  biometric-adjacent personal data held by TRN under a per-subject crypto key.
- **Audio Asset** — a synthesized clip (`assetId`, `storageRef`, `voiceModelRef`, `contentHash`),
  produced by TRN and handed to CONV in the published manifest.
- **Approved Content** — categories/phrases that passed dual authorization; the only content indexed
  in Elasticsearch and published to CONV.
- **Publication** — the record of pushing one immutable approved version to CONV, keyed by
  `approvalId` (`idempotencyKey = trn:publish:<approvalId>`). CONV owns the published tree thereafter.
- **Erasure** — right-to-be-forgotten: delete the vendor voice model, crypto-shred TRN voice refs,
  retire/erase the patient's CONV audio.

## Aggregates and Entities
- **TrainingSession (aggregate root)** — keyed by `tenantId` + `sessionId`, bound to one
  `patientId`; holds the dialog context and the set of **Proposal**s. Enforces that proposals move
  only through legal transitions and that the LLM cannot cross the approval gate.
  - **Proposal (entity)** — `proposalId`, `type` (`category` | `phrase`), draft `label`/`text`,
    optional `parentRef`, `state`, and an **Authorization** value object.
  - **Authorization (value object)** — `caregiverConfirmation {confirmedBy, occurredAt}` and
    `patientAssent {confirmedBy, method, evidenceRef, relationship?, occurredAt}`; `approved` requires
    **both** present and distinct from a single actor self-approving both halves.
- **ConsentRecord (aggregate root)** — keyed by `tenantId` + `patientId`; voice-cloning consent for
  the patient and legal representative, with `scope`, `grantedAt`, `evidenceRef`, `status`
  (`granted` | `revoked`). A hard precondition for synthesis.
- **VoiceAsset (aggregate root)** — per patient: `VoiceSample`(s) + `VoiceModel`
  (`voiceModelId` at ElevenLabs, `voiceModelRef` = erasable per-subject key reference) and the
  synthesized **AudioAsset**s (`assetId`, `storageRef`, `contentHash`). Bytes live in blob storage;
  TRN holds references under the per-subject key.
- **Publication (entity, within the session/approval context)** — `approvalId`, `convVersionId`
  (returned by CONV), `idempotencyKey`, `status` (`pending` | `published` | `failed`), `publishedAt`.

## Domain Events
- **ProposalApproved** *(anchor)* — a proposal received **both** halves of the dual authorization.
  The pivotal governance moment; audited to HIST (hard-502).
- **TrainingSessionStarted** *(foundational)* — an authoring session opened for a patient.
- **ConsentGranted / ConsentRevoked** — voice-cloning consent captured / withdrawn. `ConsentRevoked`
  is treated in the never-block (erasure-adjacent) class.
- **ProposalRejected / ProposalWithdrawn** — a proposal was declined or pulled before publication.
- **ContentSynthesized** — approved phrases were synthesized into audio assets (internal milestone).
- **ContentPublished** *(terminal, downstream)* — an approved version was pushed to CONV; CONV owns
  the published tree thereafter. Audited to HIST (hard-502).
- **VoiceModelDeleted / ContentErased** *(terminal)* — erasure completed (vendor model deleted,
  TRN refs crypto-shredded, CONV audio retired/erased). Audited to HIST (commit + durable-retry).

> Messaging is disabled: these are in-process domain events / audit facts over sync REST, not broker
> messages. The LLM dialog turns and raw model responses are **not** domain events and are minimised,
> not retained as compliance records (ADR-004/ADR-007).

## State Transitions
Proposal lifecycle (ADR-003):
```
(new) --draft--> draft --submit--> proposed
proposed --caregiver approve--> caregiver_approved
proposed --patient/guardian assent--> patient_approved
caregiver_approved + patient_approved --> approved        (dual authorization complete; ANCHOR)
approved --synthesize--> synthesizing --synthesized--> indexed --publish--> published   (terminal)
proposed|caregiver_approved|patient_approved --reject--> rejected     (terminal)
draft|proposed|approved --withdraw--> withdrawn                       (terminal)
published --erase--> erased                                          (terminal; crypto-shred + CONV)
```
- The LLM may only produce `draft`/`proposed`; **no automated transition** crosses the `approved`
  gate (human-in-the-loop, ADR-003/ADR-004).
- `approved` → `synthesizing` is blocked unless a `granted` `ConsentRecord` exists (ADR-005).
- A published version is immutable; a change is a new proposal → new approval → new publication.

## Invariants
- **INV-TRN-1** — a proposal reaches `approved` **only** when both the caregiver confirmation and a
  patient/guardian assent are present; a single actor cannot supply both halves (ADR-002, SAFETY).
- **INV-TRN-2** — no LLM-generated content is ever published; the `approved` gate is crossable only
  by human action (ADR-003/ADR-004). LLM output is stored as data, never executed as instruction.
- **INV-TRN-3** — synthesis requires a `granted`, non-revoked voice-cloning `ConsentRecord` for the
  patient and legal representative (ADR-005, COMPLIANCE).
- **INV-TRN-4** — TRN never pushes a tree version to CONV with a phrase referencing an unsynthesized
  `assetId`; every published phrase has a synthesized audio asset in the same version (mirrors CONV
  INV-CONV-3; CONV rejects dangling refs `422`).
- **INV-TRN-5** — only `approved`/`published` content is indexed in Elasticsearch; drafts and raw LLM
  output are never indexed (ADR-006).
- **INV-TRN-6** — one `approval` yields at most one CONV publication; republish is idempotent on
  `trn:publish:<approvalId>` (ADR-003, aligns CONV SPEC-05).
- **INV-TRN-7** — data sent to Anthropic carries no patient name, PHI or free-text identifier; the
  patient is referenced by `patientId` only (ADR-004, LGPD).
- **INV-TRN-8** — all authoring data (sessions, proposals, consent, voice refs, publications) and the
  ES index are tenant-scoped; access requires a resolved `TenantContext` (schema-per-tenant).
- **INV-TRN-9** — erasure and consent-revocation facts are never blocked by a HIST or CONV outage
  (commit + durable-retry, HIST ADR-005); a TRN/vendor outage never affects CONV runtime (SAFETY).
