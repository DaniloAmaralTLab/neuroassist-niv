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
TRN (`trn-service`, `com.neuroassist.trn`) is the **authoring phase** that lets a family or
clinic **grow a patient's speech tree safely**. An LLM (Anthropic Claude) converses with the
**caregiver and the patient** in a collaborative, **dual-authorized** flow to *propose* new
categories and phrases; approved content is **synthesized** in the patient's cloned voice
(ElevenLabs), **indexed** in Elasticsearch for authoring-side assisted search, and **published**
to CONV as an immutable tree version. TRN owns **authoring only** — it is deliberately separate
from the daily CONV runtime and **never sits on the patient's live communication path**.

## Problem Statement
A person living with ALS/MND composes meaning from a tree of categories and phrases that CONV
serves and plays. That tree is not static: needs, people and vocabulary change, and the family
or clinic must be able to add to it. Three forces dominate the design. (1) **Safety through
humans, not models:** content that becomes the patient's voice must never be written by an LLM
unattended — every new phrase passes a **dual authorization** by the caregiver *and* the patient
(or a legal guardian when the patient is non-verbal). (2) **Sensitive data leaves the system:**
the cloned voice (biometric-adjacent health data) and any authoring text touch **external
processors** (Anthropic, ElevenLabs), so data minimisation, consent and erasability are
first-class. (3) **Isolation from runtime:** training is an occasional, supervised activity;
a TRN or vendor outage must be invisible to the patient's live speech — CONV keeps serving the
last published tree regardless. TRN must orchestrate LLM dialog, consent, synthesis, indexing
and publication while staying strictly upstream of CONV and strictly behind human approval.

## Personas
- **Family Caregiver (`CAREGIVER`) / Clinic Coordinator (`CLINIC_COORDINATOR`) (primary).**
  The authenticated human who opens a training session for a patient, drives the assistant,
  reviews proposals and gives the **caregiver half** of the dual authorization. Holds `trn.*`
  authorities on a caregiver (tenant-scoped) token.
- **Patient / Legal Guardian (secondary, the patient half of dual authorization).** The patient
  participates **in-session**, expressing assent through their own GEST/touch channel; their
  assent is recorded as a domain fact. When the patient is non-verbal and cannot confirm, a
  **legal guardian** confirms on their behalf, with relationship and evidence recorded. The
  patient does **not** administer TRN and (per ACS INV-3) carries no `trn.*` authority.
- **Anthropic Claude LLM (non-human).** Proposal generator behind `LlmDialogPort`. Its output is
  **untrusted draft data**, never an instruction and never published content.
- **ElevenLabs (non-human).** Voice synthesis behind `TtsPort`, invoked only after consent and
  only for approved phrases.
- **Elasticsearch (non-human).** Authoring-side index of approved content behind `SearchIndexPort`.
- **CONV service (non-human, downstream).** Receives approved, immutable tree versions from a TRN
  service-client token; owns the published tree thereafter.

## MVP Scope
- **Open/read a training session** scoped to one patient (`POST /trn/sessions`,
  `trn.session.create`; `trn.session.read`).
- **Assistant dialog → proposals** behind `LlmDialogPort` (Anthropic); the LLM produces **draft
  proposals only** (`trn.proposal.update` to refine, `trn.proposal.read`).
- **Dual-authorization approval:** caregiver decision (`trn.proposal.approve`) **plus** a recorded
  patient/guardian assent (method + evidence); a proposal becomes `approved` only when **both**
  halves exist (ADR-002/ADR-003).
- **Voice-cloning consent** for the patient **and** legal representative, captured **before any
  synthesis** (`trn.consent.create` / `trn.consent.read`, ADR-005).
- **Synthesize** approved phrases in the patient's cloned voice (`TtsPort`, ElevenLabs) and
  **index** approved content (`SearchIndexPort`, Elasticsearch), tenant-isolated.
- **Publish** to CONV (`POST /conv/trees`, TRN service-client `conv.tree.publish`, idempotency
  `trn:publish:<approvalId>`); audit governance facts to HIST.
- **Erasure (right-to-be-forgotten):** `trn.content.delete` → delete the vendor voice model,
  crypto-shred TRN voice refs, retire affected CONV versions and request CONV audio erasure
  (`conv.tree-version.retire`, `conv.audio.delete`).

## Out of Scope
- The patient's **live communication runtime** — serving/playing the tree is **CONV**.
- Gesture recognition (**GEST**); events/alarms/escalation (**EVNT**); caregiver identity,
  patient-session minting, JWT blacklist (**ACS**); patient registration and the gesture command
  catalog (**PAT**); device enrollment/pairing/heartbeat (**EDGE**).
- The audit ledger itself (**HIST** owns it; TRN only records facts).
- **Automated/unattended publishing** — every publish is gated by human dual authorization; the LLM
  never crosses the `approved` gate.
- Async outbox/broker (messaging disabled — external-provider retries are in-service durable jobs);
  any language beyond English (English-only).

## Architectural Principles
1. **Humans approve, models propose.** No LLM output ever becomes the patient's voice without a
   dual authorization; there is no automated transition across the `approved` gate (SAFETY).
2. **Off the live path, always.** TRN is never a synchronous dependency of CONV runtime; a TRN,
   Anthropic, ElevenLabs or ES outage never affects the patient's ability to speak.
3. **Ports before vendors.** Dialog behind `LlmDialogPort`, synthesis behind `TtsPort`, indexing
   behind `SearchIndexPort`, publication behind a CONV port — swapping a vendor never changes a
   domain contract.
4. **Minimise what leaves the system.** Only the least authoring context reaches Anthropic
   (`patientId`, draft text — no name, no PHI, no free-text identifiers); the voice model and
   samples are consent-gated and erasable (COMPLIANCE/LGPD).
5. **Hexagonal + schema-per-tenant**, sync REST only (messaging disabled), English-only content;
   `@EnableMethodSecurity` + `TenantContextHolder.require()` first (D-642, RULE-04).

## Success Signals
- A caregiver and patient can author a new phrase end-to-end — propose with the assistant,
  dual-authorize, synthesize, and see it appear on the patient's station on CONV's next refresh —
  without any manual data wrangling.
- No phrase ever reaches CONV without both halves of the dual authorization recorded; an audit of
  any published version shows who approved it, how the patient assented, and the consent on file.
- Anthropic, ElevenLabs or Elasticsearch being unavailable degrades authoring gracefully (retry,
  resume) and has **zero** effect on the patient speaking from CONV's cached tree.
- An erasure request deletes the vendor voice model, renders TRN-held voice refs unreadable, and
  withdraws/erases the patient's audio in CONV — never blocked by a HIST outage.
- Nothing the LLM writes is ever treated as an instruction, authority or publish trigger; its
  output is only a draft proposal subject to human review.
