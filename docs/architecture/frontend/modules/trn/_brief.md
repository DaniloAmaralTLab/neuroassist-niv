# TRN — Structured Brief (source for Specs / Backlog / Scaffold)

> Module: **TRN — AI-Assisted Training (Speech Tree Authoring)** · Service: `trn-service` · Project: NeuroAssist NIV
> Stack: `java` (Java 21 / Spring Boot, hexagonal) · Multi-tenant (schema-per-tenant) · Messaging: disabled · Content: English-only
> Local HTTP port: **8089** (8086 is EVNT; see §Known deviations).

1. **Canonical name / prefix:** `trn-service` (canonical `trn`) / prefix `TRN` · package `com.neuroassist.trn`.

2. **Problem it solves:** A patient's speech tree is not fixed — their needs, people and
   words change, and the family/clinic must be able to **grow the vocabulary safely**. TRN
   is the **authoring phase**, deliberately **separate from the daily CONV runtime**: an
   LLM (**Anthropic Claude**) converses with the **caregiver and the patient** in a
   collaborative, **dual-authorized** flow to *propose* new categories/phrases; nothing the
   LLM writes is ever auto-published (human-in-the-loop). Only content both parties approve
   is **synthesized** in the patient's cloned voice (**ElevenLabs**), **indexed** in
   **Elasticsearch** (authoring-side assisted search / dedup) and **pushed to CONV** as an
   immutable tree version. TRN **never sits on the patient's live communication path** — a
   TRN or vendor outage must never affect CONV runtime.

3. **Personas:** primary = **Family Caregiver** (`CAREGIVER`) / **Clinic Coordinator**
   (`CLINIC_COORDINATOR`) — the authenticated human who opens a training session, drives the
   assistant and gives the caregiver half of the dual authorization. Secondary = **Patient /
   Legal Guardian** — the patient participates in-session (expressing assent through their own
   GEST/touch channel) and, when the patient is non-verbal and cannot confirm, a **legal
   guardian** confirms on the patient's behalf with the relationship and evidence recorded;
   this is the patient half of the dual authorization. Non-human actors: the **Anthropic Claude
   LLM** (proposal generator, external processor), **ElevenLabs** (voice synthesis, external
   processor), **Elasticsearch** (authoring-side content index), and the **CONV service**
   (recipient of approved tree versions via a TRN service-client token).

4. **MVP scope (minimum viable):**
   - **Open a training session** scoped to one patient (`POST /trn/sessions`, `trn.session.create`,
     caregiver token) and read it (`trn.session.read`).
   - **Assistant dialog** that turns caregiver/patient intent into **proposals** behind an
     `LlmDialogPort` (Anthropic adapter) — the LLM output is a **draft proposal only**, never
     published content (`trn.proposal.update` to refine, `trn.proposal.read`).
   - **Dual-authorization approval** of a proposal: caregiver decision (`trn.proposal.approve`)
     **and** a recorded patient/guardian assent (method + evidence); a proposal becomes
     `approved` only when **both** halves are present (ADR-002).
   - **Voice-cloning consent capture** for the patient **and** their legal representative
     **before any synthesis** (`trn.consent.create` / `trn.consent.read`, ADR-005).
   - **Synthesize** approved phrases in the patient's cloned voice behind a `TtsPort`
     (ElevenLabs adapter) and **index** approved content behind a `SearchIndexPort`
     (Elasticsearch), both tenant-isolated (ADR-005 / ADR-006).
   - **Publish** the approved, fully-synthesized tree version to CONV
     (`POST /conv/trees`, TRN service-client `conv.tree.publish`, idempotency key
     `trn:publish:<approvalId>`) and audit the governance facts to HIST (ADR-007).
   - **Erasure (right-to-be-forgotten):** `trn.content.delete` → delete the ElevenLabs voice
     model, crypto-shred TRN-held voice samples/refs, **retire** affected CONV versions
     (`conv.tree-version.retire`) and request **CONV audio erasure**
     (`DELETE /conv/patients/{patientId}/audio`, `conv.audio.delete`), audited to HIST.

5. **Out of MVP scope:** the patient's **live communication runtime** (serving/playing the tree
   — **CONV**); gesture recognition (**GEST**); event/alarm generation and escalation (**EVNT**);
   caregiver identity, patient-session minting and the JWT blacklist (**ACS**); patient
   registration and the gesture command catalog (**PAT**); device enrollment/pairing (**EDGE**);
   history/audit storage itself (**HIST** owns the ledger; TRN only records facts); an async
   outbox/broker (messaging disabled — all cross-service calls are sync REST, external-provider
   retries are in-service durable jobs); any language beyond English (English-only); automated /
   unattended publishing (every publish is gated by human dual authorization).

6. **Mandatory external integrations:**
   - **Anthropic Claude (LLM)** — external data processor behind `LlmDialogPort`; **data
     minimisation**: only the minimal authoring context leaves the system (draft category/phrase
     text, caregiver prompts); **no patient name, no PHI free text, no direct identifiers** —
     the patient is referenced by `patientId` only; prompt/response policy and a data-processing
     agreement are TRN obligations (ADR-004).
   - **ElevenLabs (TTS)** — external data processor behind `TtsPort`; the **voice samples +
     cloned voice model are biometric-adjacent health-context personal data**; consent-gated,
     region/retention/DPA governed, erasable via crypto-shred + vendor model deletion (ADR-005).
   - **Internal sync REST:** TRN → **CONV** (publish / retire / erase, TRN service-client with
     `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` — ACS/TRN amendment
     **INT-CONV-2**); TRN → **PAT** (`pat.patient.read`, service-client, ETag/304; patient-session
     token is `403` on `/pat`, PAT INV-PAT-7); TRN → **HIST** (`hist.audit.record`, service-client,
     base URL includes `/hist`); TRN → **ACS** (JWKS to validate the caregiver token — TRN is an
     ACS resource server for its own endpoints); TRN → **MIG** (centralized Flyway migrations).
   - **Elasticsearch** — project search engine (`stack.search.engine = elasticsearch`); the
     **approved-content index** behind `SearchIndexPort`, per-tenant isolated (ADR-006).

7. **TechLab AI services depended on:** none via the framework's `techlab-ai` orchestration
   (`ai.hasAi` is not set for this project). The LLM used here is **Anthropic Claude accessed
   directly behind `LlmDialogPort`**, confined to the authoring phase. Messaging is disabled
   (`stack.messaging.enabled = false`), so there is **no event dependency** on other modules;
   every intra-project relationship is **synchronous REST**. TRN references `Patient` (PAT) by
   id only and hands approved versions to CONV; it is upstream of CONV and never a CONV runtime
   dependency.

8. **Anchor domain event:** **ProposalApproved** — a proposed category/phrase has received
   **both** halves of the dual authorization (caregiver + patient/guardian) and becomes eligible
   for synthesis, indexing and publication. It is the pivotal governance moment unique to TRN.
   Foundational: **TrainingSessionStarted** (an authoring session is opened for a patient) and
   **ConsentGranted** (voice-cloning consent captured). Downstream/terminal: **ContentPublished**
   (the approved version is pushed to CONV — CONV owns the published tree thereafter) and
   **ContentErased / VoiceModelDeleted** (right-to-be-forgotten).

## Decisions resolved in this vision (orchestrator defaults — revisable by the owner)

- **ADR-001 — single service, single bounded context (local).** `trn-service` owns the whole
  authoring lifecycle (session, dialog, proposal, consent, voice assets, publication); CONV owns
  the published runtime. No decomposition in v1.
- **ADR-002 — dual-authorization model (SAFETY/COMPLIANCE).** A proposal is `approved` only when
  **both** a caregiver decision (`trn.proposal.approve`) **and** a recorded patient/guardian
  assent are present. Because ACS **INV-3** restricts the patient-session token to `conv.*`/`gest.*`,
  the patient's assent is **not** a `trn.*` OAuth authority: it is captured **in-session** as a
  first-class domain fact (`confirmedBy`, `method`, `evidenceRef`, `occurredAt`), with a **legal
  guardian** substituting for a non-verbal patient (relationship + evidence recorded). Neither
  half alone unlocks synthesis/publish; the caregiver can never self-approve both halves.
- **ADR-003 — proposal lifecycle + human-in-the-loop gate.** States:
  `draft → proposed → caregiver_approved ⟂ patient_approved → approved → synthesizing → indexed → published`,
  with `rejected` and `withdrawn` terminal branches. The LLM may only move a proposal to
  `proposed`; **no automated transition** crosses the `approved` gate. One `approval` yields one
  immutable publication keyed `trn:publish:<approvalId>`.
- **ADR-004 — LLM provider boundary + PII policy.** Anthropic Claude behind `LlmDialogPort`;
  data minimisation (no name/PHI/free-text identifiers leave the system; `patientId` only);
  prompt-injection containment (LLM output is untrusted draft data, never an instruction/authority);
  human-in-the-loop (output is a proposal, never published); vendor DPA/region a TRN obligation.
- **ADR-005 — ElevenLabs TTS boundary, voice consent and erasure (SAFETY/COMPLIANCE).** Confirms
  CONV ADR-005: the `TtsPort` and all synthesis live **only** in TRN. Voice samples + voice model
  id are stored by TRN under a per-subject key; consent (patient + legal representative) is captured
  **before any synthesis**; erasure deletes the vendor model and crypto-shreds TRN refs, aligned
  with HIST **ADR-006** and CONV's `conv.audio.delete`.
- **ADR-006 — indexing approved content in Elasticsearch (tenant isolation).** `SearchIndexPort`
  with an Elasticsearch adapter; **only `approved`/`published` content is indexed** (never drafts
  or LLM scratch); per-tenant isolation (tenant-filtered alias / per-tenant index). Resolves the
  registry's "indexed in Elasticsearch" against CONV ADR-002 (CONV runtime deliberately avoids ES
  on the patient path): the ES index is **authoring-side only**, off the patient's live path, and
  indexing failure never blocks a publish to CONV.
- **ADR-007 — draft storage vs CONV published tree, audit facts and provider failure policy.**
  TRN persists drafts/sessions/proposals/consent/voice-asset refs/publications (schema-per-tenant);
  CONV owns the published tree. Governance facts to HIST classified onto HIST **ADR-005**
  (creation/approval/publish = **hard-502**; erasure = **commit + durable-retry**, never blocked).
  External-provider failures (Claude, ElevenLabs, ES, CONV) are **isolated** and **retried** without
  partial publishes and **never touch CONV runtime**.

## Source ADRs and upstream contracts respected

- **CONV** `ADR-005-patient-voice-tts-boundary-and-consent` (synthesis + consent + voice storage
  are TRN's, CONV plays only) and `ADR-006-persistence-and-audit-facts` (CONV expects TRN to own
  `approvalId`, capture consent upstream, push immutable versions). CONV **api-contract** §5 publish
  (`conv.tree.publish`, idempotency `trn:publish:<approvalId>`, dangling asset ref → `422`), §6
  retire (`conv.tree-version.retire`), §7 erase (`conv.audio.delete`); patient-session token `403`
  on those paths (ACS INV-3).
- **ACS** `ADR-002-identity-and-authority-model` (caregiver vs service-client tokens; INV-3 —
  patient-session restricted to `conv.*`/`gest.*`) — the constraint that shapes ADR-002's dual-auth
  design. TRN holds a **service-client** token for CONV/PAT/HIST (amendment **INT-CONV-2**).
- **HIST** `ADR-005-audit-write-failure-policy` (hard-502 vs commit+durable-retry) and
  `ADR-006-retention-vs-erasure` (crypto-shred) — TRN classifies each of its facts and its erasure
  against these; safety/erasure paths are never blocked by a HIST outage.
- **PAT** api-contract `GET /pat/patients/{patientId}` (`pat.patient.read`, service-client) +
  INV-PAT-7 (patient-session `403` on `/pat`).
- Project shared (referenced, **not** reemitted): `ADR-001-hexagonal-architecture` (java) ·
  `ADR-002-modular-monolith` · `ADR-003-multi-tenancy` (schema-per-tenant).

## Known generator pitfalls applied proactively (Learning Layer, D-611)

- `security:tenant-filter:order-before-spring-security` — register `TenantContextFilter`
  **inside** the `SecurityFilterChain`, after `BearerTokenAuthenticationFilter`, so the tenant is
  extracted only once the caregiver JWT is authenticated.
- `method-security:enable-method-security` (D-642) — `@EnableMethodSecurity(prePostEnabled = true)`
  MUST be present in `SecurityConfig`; without it `@PreAuthorize` is silently inert (403 never
  enforced). The JWT authorities converter must map the `authorities` claim.
- `hexagonal:api-controller:infrastructure-import-rule04` — inbound port signatures must not carry
  `tenantId`; application services call `TenantContextHolder.require()` first; controllers must not
  import `infrastructure.security` (ArchUnit RULE-04).
- `llm:untrusted-output:treat-proposal-as-data` — LLM responses are **data**, never instructions:
  never let model output set an authority, a tenant, an approval flag or a publish trigger (ADR-004).

## Known deviations from the invocation briefing (flagged for the owner)

- **Port:** the briefing suggested `8086` for TRN "unless the registry says otherwise". The peer
  service docs show **8086 is already EVNT's** (`evnt-service` `SERVER_PORT=8086`); real port map is
  GWY 8080, ACS 8081, PAT 8082, HIST 8083, EDGE 8084, CONV 8085, EVNT 8086, GEST 8088, REG 8761
  (DASH not yet assigned). TRN is therefore assigned **8089** to avoid a collision. Open risk: there
  is no central port registry — see 06 §Gaps.
