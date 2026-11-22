<!-- OUTPUT-SCHEMA
- Stack
- Service Boundary
- Package Organization
- Hub Service Dependencies
- External Integrations
- Async vs Sync Decisions
-->

# 04 — Backend Architecture Direction

## Stack
Java 21 · Spring Boot · hexagonal (ports & adapters, shared
`../../../adr/ADR-001-hexagonal-architecture.md`, key `hexagonal_java`) · Gradle (Kotlin DSL) ·
Flyway (centralized via MIG) · multi-tenant **schema-per-tenant** (shared
`ADR-003-multi-tenancy`) · messaging **disabled** (sync REST only) · English-only content.
Security: Spring Security resource server validating the ACS caregiver JWT via JWKS;
`@EnableMethodSecurity(prePostEnabled = true)` is **mandatory** (D-642 — without it `@PreAuthorize`
is silently inert) and a JWT authorities converter maps the `authorities` claim. Local HTTP port
**8089** (8086 is EVNT; see 06 §Gaps). External SDKs (Anthropic, ElevenLabs, Elasticsearch client)
live **only** in `infrastructure/`, never in `domain`/`application`.

## Service Boundary
**Single service, single bounded context** (local ADR-001). `trn-service` owns the complete
authoring lifecycle — session, assistant dialog, proposal + dual authorization, voice-cloning
consent, voice samples/model, synthesized audio assets, approved-content index, and the publication
to CONV. It does **not** own the published runtime tree (CONV), gestures (GEST), events/alarms
(EVNT), identity/sessions (ACS), patient/command data (PAT), devices (EDGE), or the audit ledger
(HIST). No decomposition in v1: the vendor seams are isolated **behind ports inside the one service**
(`LlmDialogPort`, `TtsPort`, `SearchIndexPort`, `TreePublicationPort`), which keeps the blast radius
of each external processor contained without a premature service split.

## Package Organization
Java — root package `com.neuroassist.trn`:

```
src/main/java/com/neuroassist/trn/
+-- api/              REST controllers (/trn/sessions, /trn/proposals, /trn/consents,
|                     /trn/publications, erasure), request/response records, mappers,
|                     @RestControllerAdvice (ProblemDetail / RFC 7807)
+-- application/      use-case services (@Transactional; TenantContextHolder.require() first):
|                     OpenSessionService, DialogService (refine proposals),
|                     CaptureConsentService, ApproveProposalService (dual-auth gate),
|                     SynthesizeAndPublishService, EraseContentService
|     +-- port/in     inbound ports (use-case interfaces; NO tenantId in signatures — RULE-04)
|     +-- port/out    LlmDialogPort, TtsPort, SearchIndexPort, TreePublicationPort,
|                     PatientReferencePort, AuditPort, and repository ports
+-- domain/           TrainingSession, Proposal (+ Authorization VO), ConsentRecord,
|                     VoiceSample, VoiceModel, AudioAsset, Publication; lifecycle state machine;
|                     dual-auth invariants. Zero Spring, zero JPA, zero vendor SDK.
+-- infrastructure/   JPA persistence + adapters; AnthropicLlmDialogAdapter,
                      ElevenLabsTtsAdapter, ElasticsearchSearchIndexAdapter; Feign clients
                      (CONV, PAT, HIST); blob storage + per-subject crypto-key manager;
                      security (TenantContextFilter, JWKS, CorrelationIdInterceptor);
                      durable-retry jobs for vendor/CONV calls
```

Dependency rule (same as the shared hexagonal ADR): `domain` imports nothing outward; `application`
depends on `domain`; `api` and `infrastructure` depend inward. Controllers must not import
`infrastructure.security`; `TenantContextFilter` is registered **inside** the `SecurityFilterChain`
after `BearerTokenAuthenticationFilter` (Learning Layer `security:tenant-filter:order-before-spring-security`).

## Hub Service Dependencies
No TechLab AI (`techlab-ai`) orchestration dependency (`ai.hasAi` unset). The LLM here is **Anthropic
Claude accessed directly** behind `LlmDialogPort`, confined to authoring. Intra-project dependencies
(all synchronous REST, service-client identity where noted):

| Dependency | Direction | Purpose | Authority / contract |
|---|---|---|---|
| **CONV** | TRN → CONV | publish / retire / erase approved versions | `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` (TRN service-client; INT-CONV-2); idempotency `trn:publish:<approvalId>`; dangling asset → `422` |
| **PAT** | TRN → PAT | patient reference read | `pat.patient.read` (service-client, ETag/304); patient-session `403` on `/pat` (INV-PAT-7) |
| **HIST** | TRN → HIST | audit governance facts | `hist.audit.record` (service-client, base includes `/hist` on `:8083`) |
| **ACS** | TRN → ACS | validate caregiver JWT (JWKS); TRN is a resource server; holds a service-client token | `ADR-002-identity-and-authority-model`, INV-3 |
| **MIG** | TRN → MIG | centralized Flyway migrations (TRN owns no runner) | shared ADR-003 schema-per-tenant |

## External Integrations
- **Anthropic Claude (LLM)** — `LlmDialogPort` + `AnthropicLlmDialogAdapter`. **Data minimisation:**
  only draft category/phrase text and caregiver prompts leave the system; **no** patient name, PHI or
  free-text identifier (`patientId` only). LLM responses are **untrusted draft data** — never an
  instruction, authority, tenant selector or publish trigger (prompt-injection containment, ADR-004).
  Vendor DPA, region and retention are TRN obligations.
- **ElevenLabs (TTS)** — `TtsPort` + `ElevenLabsTtsAdapter`. Invoked **only** after a `granted`
  consent and **only** for approved phrases. Voice samples + cloned voice model are
  biometric-adjacent personal data stored by TRN under a per-subject crypto key; erasure deletes the
  vendor model and crypto-shreds TRN refs (ADR-005). Confirms CONV ADR-005 (synthesis is TRN's; CONV
  plays only).
- **Elasticsearch** — `SearchIndexPort` + `ElasticsearchSearchIndexAdapter`. Indexes **only**
  `approved`/`published` content, per-tenant isolated, for authoring-side assisted search/dedup; it
  is **off** the patient live path and its failure never blocks a publish to CONV (ADR-006). The port
  keeps ES swappable (pgvector/other) without a contract change.

## Async vs Sync Decisions
- **Messaging is disabled** — there is no broker and no async outbox; every cross-service call (CONV,
  PAT, HIST) is **synchronous REST**.
- **External-provider resilience without a broker:** long or flaky vendor interactions (ElevenLabs
  synthesis, CONV publish/erase, ES indexing) use **in-service durable-retry jobs** (persisted
  intent + idempotent retry), not a message bus. This keeps the architecture broker-free while
  honoring "synthesis/publish may take time" and "erasure must eventually complete".
- **Human-paced, not real-time:** authoring is interactive but not latency-critical; the LLM dialog
  is request/response behind `LlmDialogPort`. The only time-sensitivity guarantee is the **negative**
  one: nothing here is on CONV's live path, so none of it affects the patient speaking.
- **HIST audit timing (ADR-007):** creation/approval/publish facts are **hard-502** (roll back if the
  audit fails — integrity first, not time-critical); consent-revocation and erasure facts are
  **commit + durable-retry** (never blocked by a HIST outage), mapped onto HIST `ADR-005`.
