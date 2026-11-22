# Plano -- TRN (trn-service)

## Status das prioridades
- P1 -- pendente
- P2 -- pendente
- P3 -- pendente
- P4 -- pendente
- P5 -- pendente
- P7 -- pendente
- P8 -- pendente
- P9 -- pendente

---

## 0. Leitura executiva

### Papel do servico
`trn-service` (port 8089) is the **Training Module** of the neuroassist-niv platform. It manages the full authoring lifecycle for personalized speech-tree content: a licensed caregiver collaborates with a constrained LLM (Anthropic) to draft and approve proposals, captures dual authorization (caregiver + patient/guardian), synthesizes speech via ElevenLabs, and publishes the approved content tree to the CONV module for delivery to the patient. The module governs all voice-cloning consent, right-to-be-forgotten erasure (crypto-shred), and HIST audit integration.

### MVP scope
The MVP delivers: (1) hexagonal scaffold with Eureka registration and Feign base-url configuration, (2) full training session and proposal lifecycle including LLM-assisted dialog, (3) dual-authorization enforcement (distinct actors required), (4) voice-cloning consent gate and ElevenLabs synthesis, (5) idempotent CONV publication pipeline with outbound_job durable-retry substrate, (6) erasure with crypto-shred propagation to CONV and HIST.

### Diagnostic initial
Gaps mapped at start: no Gradle module; no JPA entities or migration scripts; no port interfaces or fake adapters; no security configuration; no consent lifecycle; no durable-retry substrate; no BDD scaffold. All gaps are covered by P1-P8 issues in this plan.

---

## 1. Estrategia geral

### Objetivo macro
Bootstrap `trn-service` from zero to a fully tested, security-enforced, BDD-covered module that publishes approved speech-tree content to CONV with full audit trail in HIST.

### Ordem das prioridades

| P | Titulo | Motivo |
|---|---|---|
| P1 | Scaffold + public health | Foundation for all other issues; Eureka + Feign base-url must be in place first |
| P2 | Domain aggregates + application services (sessions, proposals, dialog) | Golden path state machine runs before any infrastructure |
| P3 | Persistence: Flyway V0080-V0088/V0089 + JPA entities + adapters | Tables must exist before integration tests |
| P4 | External adapters (PAT/HIST/CONV Feign, Anthropic, ElevenLabs, ES) | Outbound ports get real implementations |
| P5 | Security + multi-tenancy + consent + publication pipeline + erasure | End-to-end safety guarantees after adapters are real |
| P7 | Observability | Operational metrics and privacy-safe logging |
| P8 | BDD end-to-end | Full scenario coverage for all safety-critical paths |
| P9 | Idempotency hardening | Final dedup guards before go-live |

---

## 2. Plano por prioridade

### Prioridade 1 -- Hexagonal scaffold + public health endpoint
Status: pendente

#### Objetivo / Resultado esperado
A compiling, Eureka-registered `trn-service` Gradle module with four-layer package structure, `GET /trn/health` returning `200` without authentication, and all Feign base-url properties configured.

#### Issues vinculadas
- TRN-001 (scaffold, Gradle module, application.yml)
- TRN-002 (RoleAuthorityPolicy + @EnableMethodSecurity)
- TRN-003 (GET /trn/health public endpoint)

#### Specs cobertas
- SPEC-01 (base path, port 8089)
- SPEC-06 (authority constants, D-642)
- SPEC-07 (health endpoint)

#### Sequencia de execucao
- Fase 1 — TRN-001: Gradle module + four-layer packages + application.yml (Eureka + Feign base-urls)
- Fase 2 — TRN-002: RoleAuthorityPolicy + @EnableMethodSecurity
- Fase 3 — TRN-003: HealthController + SecurityConfig permitAll

#### Criterios de aceite
- `./gradlew :trn-service:compileJava` exits 0
- `GET /trn/health` returns `200 {"status":"UP"}` without bearer token
- 12 trn.* authority constants compile; @EnableMethodSecurity present

#### Riscos
Low. Pure boilerplate; no domain logic.

#### Instrucao para implementador
Start with TRN-001 (Gradle module), then TRN-002 (security constants), then TRN-003 (health endpoint). Do not add Spring Security filters yet — that is P5.

---

### Prioridade 2 -- Domain aggregates + application services (sessions, proposals, dialog)
Status: pendente

#### Objetivo / Resultado esperado
A working golden path: open a training session, start a dialog turn with the LLM (PHI-free context), create draft/proposed proposals, manage proposal lifecycle transitions (PATCH, withdrawal, rejection).

#### Issues vinculadas
- TRN-004 (domain aggregates — TrainingSession, Proposal, Authorization VO)
- TRN-005 (domain port interfaces + per-port fake adapters)
- TRN-006 (SessionService + POST/GET /trn/sessions)
- TRN-007 (ProposalDialogService + POST /dialog)
- TRN-008 (ProposalLifecycleService + GET/PATCH/withdrawal/rejection)
- TRN-009 (DualAuthorizationService + caregiver-confirmation/patient-assent)

#### Specs cobertas
- SPEC-01, SPEC-02 (session + proposal lifecycle)
- SPEC-03 (dual-authorization, INV-TRN-1)

#### Sequencia de execucao
- Fase 1 — TRN-004: pure domain POJOs with state machine
- Fase 2 — TRN-005: port interfaces + fake adapters
- Fase 3 — TRN-006: SessionService + SessionController
- Fase 4 — TRN-007: ProposalDialogService + DialogController
- Fase 5 — TRN-008: ProposalLifecycleService + ProposalController
- Fase 6 — TRN-009: ApproveProposalService + AuthorizationController

#### Criterios de aceite
- Domain state machine unit tests pass (TRN-004)
- POST /trn/sessions with unknown patientId returns 404; with HIST failure returns 502 (TRN-006)
- Dialog turn sends only patientId+draftContext+prompt to LlmDialogPort (TRN-007 INV-TRN-7)
- Same-actor assent returns 409 (TRN-009 INV-TRN-1)

#### Riscos
Medium. The state machine has 11 states; ensure ProposalStateException is a pure domain exception (no HttpStatus import).

#### Instrucao para implementador
Run TRN-004 first (pure Java — no Spring). TRN-005 must run before any other issue in this priority uses fake adapters. All services must call `TenantContextHolder.require()` as first line (RULE-04 — will be enforced by ArchUnit in P5).

---

### Prioridade 3 -- Flyway migrations + JPA entities + repository adapters
Status: pendente

#### Objetivo / Resultado esperado
9 migration scripts (V0080-V0089), 9 JPA entities, and 9 repository adapters. Testcontainers migration smoke passes; entity roundtrip tests pass; `TenantContextHolder.require()` present in every adapter method.

#### Issues vinculadas
- TRN-010 (Flyway V0080-V0088)
- TRN-011 (Flyway V0089 — IAM seed)
- TRN-012 (JPA entities)
- TRN-013 (repository adapters)

#### Specs cobertas
- SPEC-04 (migration strategy)
- data-model.md §2-§4

#### Sequencia de execucao
- Fase 1 — TRN-010: 9 DDL migration scripts
- Fase 2 — TRN-011: IAM seed V0089
- Fase 3 — TRN-012: JPA entity classes
- Fase 4 — TRN-013: Spring Data repositories + adapters

#### Criterios de aceite
- Testcontainers migration smoke applies V0080-V0088 and exits 0 (TRN-010)
- V0089 seeds exactly 12 trn.* authority codes (TRN-011)
- Entity mapping roundtrip passes per entity (TRN-012)
- TenantContextHolder.require() as first statement in every public adapter method (TRN-013)

#### Riscos
Medium. AuthorizationEntity has non-generated PK (proposalId 1:1) — care needed with Persistable<UUID> implementation.

#### Instrucao para implementador
Run migrations before entities (TRN-010 → TRN-011 → TRN-012 → TRN-013). Use Testcontainers (not H2) for migration smoke. The PERSONAL-DATA marker annotation must be created in TRN-012 for use by TRN-025 crypto-shred.

---

### Prioridade 4 -- External adapters (PAT/HIST/CONV Feign, Anthropic, ElevenLabs, ES)
Status: pendente

#### Issues vinculadas
- TRN-014 (PatClient + PatientReferenceAdapter)
- TRN-015 (HistClient + AuditAdapter — hard-502 vs durable-retry)
- TRN-016 (ConvClient + TreePublicationAdapter — publish/retire/eraseAudio)
- TRN-017 (AnthropicLlmDialogAdapter — minimised context)
- TRN-018 (ElevenLabsTtsAdapter + SubjectKeyService)
- TRN-019 (ElasticsearchSearchIndexAdapter)
- INT-TRN-001 (ACS service-client token authorities coordination)

#### Specs cobertas
- SPEC-10 (all 6 outbound ports)
- SPEC-11 (ElevenLabs + per-subject key)
- integration-contracts.md §1-§4

#### Sequencia de execucao
- Fase 1 — TRN-021 (needs to be done first from P5 as a prerequisite: ServiceClientTokenProvider for Feign auth)
- Fase 2 — TRN-014: PatClient
- Fase 3 — TRN-015: HistClient (hard-502 vs durable-retry)
- Fase 4 — TRN-016: ConvClient (publish/retire/eraseAudio)
- Fase 5 — TRN-017: AnthropicLlmDialogAdapter
- Fase 6 — TRN-018: ElevenLabsTtsAdapter + SubjectKeyService
- Fase 7 — TRN-019: ElasticsearchSearchIndexAdapter
- Fase 8 — INT-TRN-001: coordinate ACS service-client token authorities

#### Criterios de aceite
- PatClient maps PAT 404 → PatientNotFoundException (TRN-014)
- AuditAdapter.auditHard502 throws on HIST 5xx; auditDurableRetry enqueues outbound_job (TRN-015)
- ConvClient publish 200-replay treated as success; 422 → DanglingAudioReferenceException (TRN-016)
- Anthropic request body carries only patientId+draftContext+prompt (TRN-017 INV-TRN-7)
- TtsPort checks granted consent before every ElevenLabs call (TRN-018 INV-TRN-3)
- ES 5xx non-blocking: enqueues outbound_job (TRN-019)

#### Riscos
High. Six vendor integrations. TRN-015 hard-502/durable-retry distinction is critical — a wrong failure-class assignment will either drop audit facts or block user-facing operations.

#### Instrucao para implementador
Wire ServiceClientTokenProvider (TRN-021) first — all Feign clients need it. Use WireMock for all vendor stubs. For TRN-015, ensure the hard-502 set matches exactly: TrainingSessionStarted, ConsentGranted, ProposalApproved, ContentPublished.

---

### Prioridade 5 -- Security + multi-tenancy + consent pipeline + publication + erasure
Status: pendente

#### Issues vinculadas
- TRN-020 (SecurityConfig — OAuth2 resource server, @EnableMethodSecurity)
- TRN-021 (TenantContextFilter + ServiceClientTokenProvider)
- TRN-022 (MethodSecurityEnforcementIT — D-642 proof)
- TRN-023 (ConsentService + OutboundJobDispatcher)
- TRN-024 (SynthesizeAndPublishService + PublicationService)
- TRN-025 (EraseContentService — crypto-shred)
- INT-TRN-002 (dual-auth gate before CONV publish)
- INT-TRN-003 (consent audited to HIST before synthesis)
- INT-TRN-004 (erasure propagation non-blocking on HIST/CONV outage)

#### Specs cobertas
- SPEC-06 (OAuth2, D-642, RULE-04)
- SPEC-11 (consent, synthesis, erasure, INV-TRN-3/9)
- SPEC-05 (publication idempotency, INV-TRN-6)

#### Sequencia de execucao
- Fase 1 — TRN-020: SecurityConfig (OAuth2 resource server + @EnableMethodSecurity)
- Fase 2 — TRN-021: TenantContextFilter + ServiceClientTokenProvider
- Fase 3 — TRN-022: MethodSecurityEnforcementIT
- Fase 4 — TRN-023: ConsentService + OutboundJobDispatcher
- Fase 5 — TRN-024: SynthesizeAndPublishService
- Fase 6 — TRN-025: EraseContentService
- Fase 7 — INT-TRN-002/003/004: cross-module enforcement verification

#### Criterios de aceite
- @PreAuthorize enforced: patient-session token returns 403 on /trn endpoints (TRN-022)
- ConsentGranted audited hard-502 before any synthesis job (TRN-023/INT-TRN-003)
- Publication idempotent: same approvalId returns 202 without duplicate outbound_jobs (TRN-024/INT-TRN-002)
- Local crypto-shred completes even with HIST/CONV returning 5xx (TRN-025 INV-TRN-9/INT-TRN-004)

#### Riscos
High. This priority combines the most safety-critical invariants: consent gate, dual-authorization, idempotent publication, and non-blocking erasure. Test each outbound_job failure path explicitly.

#### Instrucao para implementador
TRN-020 and TRN-021 are foundational — do them before TRN-023/024/025. MethodSecurityEnforcementIT (TRN-022) is the D-642 proof test — it must pass before marking P5 done.

---

### Prioridade 7 -- Observability
Status: pendente

#### Issues vinculadas
- TRN-026 (CorrelationIdInterceptor + PrivacyLogFilter + TrnMetrics)

#### Specs cobertas
- SPEC-07 (X-Correlation-Id, structured logging, outbound_job metrics)

#### Sequencia de execucao
- Fase 1 — TRN-026: CorrelationIdInterceptor + PrivacyLogFilter + TrnMetrics

#### Criterios de aceite
- X-Correlation-Id forwarded to all outbound calls
- Micrometer gauges registered for outbound_job depth + vendor errors
- No patient name/PHI/raw LLM transcript in logs

#### Riscos
Low. Best-effort; ES/Micrometer being unavailable must not block service startup.

---

### Prioridade 8 -- BDD end-to-end
Status: pendente

#### Issues vinculadas
- TRN-027 (BDD scaffold — 6 feature files + step classes)
- TRN-028 (BDD scenarios — safety-critical Gherkin bodies)

#### Specs cobertas
- SPEC-08 (6 feature areas, D-532)

#### Sequencia de execucao
- Fase 1 — TRN-027: scaffold (empty feature skeletons + step class stubs)
- Fase 2 — TRN-028: fill Gherkin bodies (focus on safety-critical paths)

#### Criterios de aceite
- CucumberRunnerTest exits 0: 0 undefined steps, all scenarios pass or pending
- erasure.feature: crypto-shred completes with HIST/CONV stubs returning 5xx
- dual-authorization.feature: same-actor returns 409

#### Riscos
Medium. BDD scenarios reference fake adapters from TRN-005 — fake adapters must correctly simulate hard-502 throws and durable-retry enqueue behaviors.

---

### Prioridade 9 -- Idempotency hardening
Status: pendente

#### Issues vinculadas
- TRN-029 (application-layer idempotency guard + outbound_job upsert-safe)

#### Specs cobertas
- SPEC-05 (idempotency)
- data-model.md §2.8/§2.9

#### Sequencia de execucao
- Fase 1 — TRN-029: idempotency guard in SynthesizeAndPublishService + upsert in OutboundJobRepositoryAdapter

#### Criterios de aceite
- Repeat publication POST returns 202 with existing publication, no duplicate outbound_job rows
- outbound_job upsert-on-conflict for (tenant_id, job_type, idempotency_key)

#### Riscos
Low. Additive change to existing service; well-defined unique constraints from data-model.md.

---

## 3. Dependencias externas

| Dependencia | Proprietario | Status |
|---|---|---|
| ACS seeds trn.* authority codes | ACS team | Requires INT-TRN-001 |
| CONV V0077 seeds conv.* codes | CONV (must run before TRN staging) | Requires CONV-009 |
| HIST accepts 6 audit fact types | HIST team | Requires INT-TRN-003 |
| PAT GET /pat/patients/{id} with ETag | PAT team | Stable per integration-contracts.md |
| Anthropic API key | Infra / secrets | Config in application.yml via env var |
| ElevenLabs API key | Infra / secrets | Config in application.yml via env var |
| Elasticsearch cluster | techlab-infra | Available via techlab-infra docker-compose |
| Eureka service registry | REG module | EUREKA_URI env, default http://localhost:8761/eureka |

---

## 4. Restricoes arquiteturais

ArchUnit RULE-01..08 (CLAUDE.md); four-layer packages: `api/`, `application/`, `domain/`, `infrastructure/`; `@Transactional` only in `application/service`; `TenantContextHolder.require()` as first statement of every infrastructure adapter method (RULE-04); no HttpStatus import in domain layer; no Spring annotation in `domain/`; `@EnableMethodSecurity(prePostEnabled=true)` mandatory (D-642); `TenantContextFilter` registered after `BearerTokenAuthenticationFilter` in `SecurityFilterChain`; Flyway scripts in V0080-V0089 range only; personal-data columns annotated with `@PersonalData` for crypto-shred support.

---

## 5. Referencias

- `docs/architecture/backend/services/trn-service/contracts/api-contract.md`
- `docs/architecture/backend/services/trn-service/contracts/data-model.md`
- `docs/architecture/backend/services/trn-service/contracts/event-contracts.md`
- `docs/architecture/backend/services/trn-service/contracts/integration-contracts.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-01-api-surface.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-02-proposal-lifecycle-and-dialog.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-03-dual-authorization.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-04-data-model-migrations.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-05-publication-idempotency.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-06-security.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-07-observability-health.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-08-bdd-test-scenarios.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-10-integrations.md`
- `docs/architecture/backend/services/trn-service/spec/backend/SPEC-11-voice-synthesis-consent-erasure.md`
- `docs/architecture/backend/services/trn-service/generator-config.yml`
