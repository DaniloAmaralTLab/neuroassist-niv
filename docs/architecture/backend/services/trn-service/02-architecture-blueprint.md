<!-- OUTPUT-SCHEMA
- System Boundary
- External Actors and Systems
- End-to-End Flows
- Internal Boundaries
- Cross-cutting Concerns
-->

# 02 — Architecture Blueprint

## System Boundary
TRN is a **single service, single bounded context** (local ADR-001). It owns the **authoring
lifecycle** of speech-tree content for a patient: the training session, the LLM-assisted dialog,
the draft **Proposal** and its **dual authorization**, the voice-cloning **Consent**, the
**voice samples / voice model** references, the **synthesized audio assets**, the **approved-content
index**, and the **Publication** record that pushes an immutable version to CONV. It does **not**
own the published runtime tree or its playback (**CONV**), gesture recognition (**GEST**),
events/alarms (**EVNT**), identity/sessions (**ACS**), patient or command data (**PAT**), device
identity (**EDGE**), or the audit ledger (**HIST**). Those stay outside and are referenced by id.
TRN is an **ACS resource server** on its own `/trn` endpoints (caregiver token) and a
**service-client** when it calls CONV, PAT and HIST.

## External Actors and Systems
| Actor / System | Direction | Interaction |
|---|---|---|
| **Caregiver / Clinic Coordinator** (caregiver token) | → TRN | Open/read session, drive dialog, review and **approve** proposals, capture consent, trigger publish/erasure (`trn.*` authorities). |
| **Patient / Legal Guardian** | → TRN (in-session) | Expresses **assent** (patient half of dual authorization) via GEST/touch within the caregiver-driven session; recorded as a domain fact (no `trn.*` authority — ACS INV-3). |
| **Anthropic Claude (LLM)** | TRN → | `LlmDialogPort` — generate **draft** category/phrase proposals from minimised authoring context (ADR-004). External processor; output is untrusted data. |
| **ElevenLabs (TTS)** | TRN → | `TtsPort` — synthesize approved phrases in the patient's cloned voice; store sample/model under a per-subject key (ADR-005). External processor. |
| **Elasticsearch** | TRN → | `SearchIndexPort` — index **approved** content, per-tenant isolated, for authoring-side assisted search/dedup (ADR-006). |
| **CONV** (TRN service-client) | TRN → | `POST /conv/trees` publish (`conv.tree.publish`), `POST /conv/tree-versions/{id}:retire` (`conv.tree-version.retire`), `DELETE /conv/patients/{patientId}/audio` (`conv.audio.delete`). Idempotency `trn:publish:<approvalId>`; dangling asset → `422`. |
| **PAT** | TRN → | `GET /pat/patients/{patientId}` (`pat.patient.read`, service-client, ETag/304) — patient reference only; patient-session token is `403` on `/pat` (PAT INV-PAT-7). |
| **HIST** | TRN → | `POST /hist/audit` (`hist.audit.record`, service-client, base includes `/hist`) — consent/approval/publish/erasure facts (ADR-007). |
| **ACS** | TRN → | JWKS to validate the caregiver token; TRN is an ACS resource server. TRN holds a service-client token (amendment INT-CONV-2). |
| **MIG** | TRN → | Centralized Flyway schema migrations (TRN owns no runner). |

## End-to-End Flows
**Golden path — author and publish a new phrase:**
1. Caregiver opens a training session for a patient (`POST /trn/sessions`, `trn.session.create`);
   TRN reads the patient reference from PAT (`pat.patient.read`).
2. Caregiver (with the patient present) converses with the assistant; TRN calls `LlmDialogPort`
   (Anthropic) with **minimised** context and records **draft Proposals** (`proposed`). LLM output
   is stored as data, never executed (ADR-004).
3. Voice-cloning **consent** is captured for the patient **and** legal representative if not already
   on file (`trn.consent.create`, ADR-005) — a hard precondition for synthesis.
4. **Dual authorization:** the caregiver makes an approval decision (`trn.proposal.approve`) and the
   patient/guardian assent is recorded (method + evidence). Only with **both** halves does the
   proposal become `approved`; `ProposalApproved` is audited to HIST (hard-502).
5. TRN **synthesizes** each approved phrase (`TtsPort`, ElevenLabs) → audio assets with
   `contentHash`/`voiceModelRef`; **indexes** the approved content (`SearchIndexPort`, ES).
6. TRN **publishes** the immutable version to CONV (`POST /conv/trees`, `conv.tree.publish`,
   `idempotencyKey = trn:publish:<approvalId>`); CONV creates the active `TreeVersion` and audits
   `TreePublished`. TRN records `ContentPublished` (hard-502). The patient's station picks up the
   new vocabulary on CONV's next refresh.

**Erasure path — right-to-be-forgotten:**
1. Caregiver/guardian requests erasure (`trn.content.delete`).
2. TRN deletes the ElevenLabs **voice model**, **crypto-shreds** TRN-held voice samples/refs, and
   calls CONV `conv.tree-version.retire` + `conv.audio.delete` for the affected patient.
3. TRN audits `VoiceModelDeleted` / `ContentErased` to HIST with the **commit + durable-retry**
   class — **erasure is never blocked** by a HIST (or CONV) outage; it is retried idempotently.

**Degraded paths (never affect CONV runtime):**
- **Anthropic down:** no new proposals; the session is resumable; existing approvals/publishes
  unaffected. The patient keeps speaking from CONV cache.
- **ElevenLabs down:** synthesis fails; the proposal stays `approved` (not yet `synthesizing`→
  `published`); retried; **no partial publish** (TRN never pushes a version with an unsynthesized
  asset — CONV would reject it `422`).
- **Elasticsearch down:** indexing is **non-blocking** and retried; a publish to CONV still proceeds
  (the ES index is authoring-side, not on the patient path — ADR-006).
- **CONV down:** publish is retried with the same `idempotencyKey` (CONV publish is idempotent); the
  approval is retained until accepted.

## Internal Boundaries
Hexagonal layers (shared ADR-001 hexagonal, Java):
- **api/** — `@RestController` for `/trn/sessions`, `/trn/proposals`, `/trn/consents`,
  `/trn/publications`, erasure; request/response records; `@RestControllerAdvice` (ProblemDetail,
  RFC 7807).
- **application/** — use-case services (`@Transactional`, `TenantContextHolder.require()` first):
  open-session, converse/refine-proposal, capture-consent, approve-proposal (dual-auth gate),
  synthesize-and-publish, erase-content. Inbound ports (`port/in`) and outbound ports (`port/out`):
  `LlmDialogPort`, `TtsPort`, `SearchIndexPort`, `TreePublicationPort` (→ CONV),
  `PatientReferencePort` (→ PAT), `AuditPort` (→ HIST), and repositories
  (`TrainingSessionRepositoryPort`, `ProposalRepositoryPort`, `ConsentRepositoryPort`,
  `VoiceAssetRepositoryPort`, `PublicationRepositoryPort`).
- **domain/** — pure model: `TrainingSession`, `Proposal` (+ `Authorization` value object with the
  two halves), `ConsentRecord`, `VoiceSample`, `VoiceModel`, `AudioAsset`, `Publication`; the
  lifecycle state machine and dual-auth invariants. Zero Spring, zero JPA, **zero vendor SDK**.
- **infrastructure/** — JPA persistence + adapters: Anthropic SDK adapter (`LlmDialogPort`),
  ElevenLabs adapter (`TtsPort`), Elasticsearch adapter (`SearchIndexPort`), Feign clients (CONV,
  PAT, HIST), blob/object storage + crypto-key manager for voice assets, security filters
  (`TenantContextFilter`, JWKS validation, `CorrelationIdInterceptor`), durable-retry jobs.
Dependency rule: `domain` imports nothing outward; `application` depends on `domain`; `api` and
`infrastructure` depend inward (ArchUnit RULE-04).

## Cross-cutting Concerns
- **Security.** Caregiver token (ACS JWKS) authorizes `trn.*`; **no** `trn.*` authority is ever in a
  patient-session token (ACS INV-3) — the patient half of dual authorization is a domain fact, not an
  OAuth scope (ADR-002). TRN calls CONV/PAT/HIST with its own **service-client** identity (INT-CONV-2).
  `@EnableMethodSecurity(prePostEnabled = true)` is mandatory or `@PreAuthorize` is inert (D-642);
  register `TenantContextFilter` inside the `SecurityFilterChain` after bearer authentication.
- **Multi-tenancy.** Schema-per-tenant (shared ADR-003); `TenantContextHolder.require()` is the first
  line of every application service; all authoring data and the ES index are tenant-scoped.
- **Privacy / data minimisation (LGPD).** Only minimised context reaches Anthropic (no name/PHI/
  free-text identifiers; `patientId` only, ADR-004); the voice model/samples are biometric-adjacent
  personal data — consent-gated, per-subject-keyed, erasable (ADR-005); LLM output is untrusted data.
- **Observability.** `X-Correlation-Id` propagated to CONV/PAT/HIST and echoed on every HIST audit;
  vendor calls (Anthropic/ElevenLabs/ES) are traced with latency/error metrics; no patient free text
  in logs.
- **Availability (SAFETY).** TRN has **no path** that CONV runtime depends on synchronously; every
  external-provider failure is isolated and retried; erasure and safety facts are never blocked by a
  downstream outage (HIST ADR-005 commit + durable-retry).
