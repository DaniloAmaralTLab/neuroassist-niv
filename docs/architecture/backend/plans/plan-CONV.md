# Plan — CONV (Conversation via Speech Tree)

> Service: `conv-service` · Module: **CONV** · Stack: Java 21 / Spring Boot · Multi-tenant (schema-per-tenant)
> Hexagonal: `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`
> Generated: 2026-11-22 by `/be-architect-backlog neuroassist-niv CONV`

## Status das prioridades

- P1 — pendente
- P2 — pendente
- P3 — pendente
- P4 — pendente
- P5 — pendente
- P6 — pendente
- P7 — pendente
- P8 — pendente
- P9 — pendente

---

## 0. Leitura executiva

### Papel do serviço (extraído de 01-architectural-vision.md)

CONV is the **runtime that gives the patient back their voice**. It serves an approved, versioned
speech tree (category → phrase) + pre-synthesized audio in the patient's own cloned voice and
lets the patient navigate it by any input channel (gesture via GEST or touch/mouse) to play a phrase.
CONV owns the **runtime only** — authoring and synthesis belong to TRN. No TechLab AI, no
ElevenLabs, no per-phrase server round-trip at the patient station.

### MVP scope (extraído de 01)

- Serve the per-patient speech-tree bundle (`GET /conv/tree`, `conv.tree.read`) behind a strong ETag.
- Serve/stream cached audio assets (`conv.audio.read`); offline-first; opportunistic `304` refresh.
- Publish a new immutable tree version (`POST /conv/trees`, TRN service-client `conv.tree.publish`).
- Retire/withdraw a version (`conv.tree-version.retire`) and erase audio (`conv.audio.delete`) with LGPD crypto-shred.
- Opt-in minimal usage signals (`conv.usage.record`): `phraseId`+timestamp only, no free text.
- Public `GET /conv/health` endpoint.

### Diagnóstico inicial (gaps mapeados em 06)

- G5 resolved by V0077 (IAM seed — CONV-009).
- G1 resolved: TRN→CONV push direction confirmed in api-contract §5.
- G3 deferred: `SearchPort` v1 is Postgres FTS/trigram (caregiver/TRN-side only); no patient-session search endpoint in v1.
- R4 (publish/erasure audit coupling): mitigated by hard-502 on publish and durable-retry on erasure.
- Security risk: D-642 (`@EnableMethodSecurity` inert without explicit config) addressed in CONV-002/CONV-016.

---

## 1. Estratégia geral

### Objetivo macro

Deliver a secure, offline-safe, tenant-isolated speech-tree runtime: the patient's station can
always play a phrase (from cache), the caregiver can publish new vocabulary (TRN→CONV), and the
patient's voice can be erased on-demand without blocking the station.

### Ordem das prioridades

| P | Título | Motivo |
|---|---|---|
| P1 | Scaffold + authority catalogue + health | Foundation: nothing else compiles without the module; @EnableMethodSecurity must be present from day 0 (D-642) |
| P2 | Domain model + publish + read | Anchor event TreePublished; MVP core (station can read a tree); unblocks P3/P4 implementations |
| P3 | Persistence + migrations | Real data; ddl-auto=validate proof; unblocks P4 Feign clients |
| P4 | External integrations (audio, PAT, HIST) | Full lifecycle: audio streaming, patient validation, audit |
| P5 | Security + multi-tenancy | OAuth2 resource server wired; TenantContextFilter after BearerTokenAuth (critical ordering, Learning pitfall) |
| P6 | Write operations (retire, erase, usage) | Complete the LGPD erasure path and usage telemetry |
| P7 | Observability | Metrics + privacy log filter |
| P8 | BDD end-to-end | Full Cucumber coverage per SPEC-08 |
| P9 | Hardening | Idempotency concurrency proof + MethodSecurityEnforcementIT (D-642) |

---

## 2. Plano por prioridade

### Prioridade 1 — Hexagonal scaffold + authority catalogue + health

**Status:** pendente

#### Objetivo / Resultado esperado

A compiling `conv-service` Gradle module with the four-layer package skeleton, all 6 `conv.*`
authority constants as a single source of truth, `@EnableMethodSecurity` active, and a public
health endpoint. `./gradlew :conv-service:compileJava` exits 0 with no pending issues.

#### Issues vinculadas

- CONV-001 (Gradle scaffold)
- CONV-002 (RoleAuthorityPolicy + @EnableMethodSecurity)
- CONV-003 (GET /conv/health)

#### Specs cobertas

- SPEC-01 (API surface — base path /conv, port 8085)
- SPEC-06 (authority set — 6 constants)
- SPEC-07 (health)
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`

#### Sequência de execução

1. CONV-001 — Gradle module + package skeleton + application.yml
2. CONV-002 — RoleAuthorityPolicy + SecurityConfig @EnableMethodSecurity
3. CONV-003 — GET /conv/health (depends on SecurityConfig permitAll)

#### Critérios de aceite

- `./gradlew :conv-service:compileJava` exits 0
- `GET /conv/health` returns 200 without Authorization header
- `RoleAuthorityPolicy` has exactly 6 constants with correct string values

#### Riscos

- D-642: if `@EnableMethodSecurity` is omitted, all `@PreAuthorize` checks are silently inert — verify early.
- Port 8085 must be free in local dev; wired in `application.yml`.

#### Instrução para implementador

Scaffold must NOT contain any JPA entities or port implementations yet — only interfaces and stubs
(`@MockBean`-ready). Follow the `acs-service` pattern for `build.gradle.kts` structure including the
`integrationTest` task split (D-636).

---

### Prioridade 2 — Domain model + core tree orchestration

**Status:** pendente

#### Objetivo / Resultado esperado

Pure domain model (no JPA), 6 outbound port interfaces, `TreeService.publish()` (POST /conv/trees,
hard-502 HIST, idempotency) and `TreeService.read()` (GET /conv/tree, strong ETag, 304). The
anchor event `TreePublished` is wired to `AuditPort.auditHard()` (stub in P2). Unit tests pass.

#### Issues vinculadas

- CONV-004 (domain aggregates)
- CONV-005 (domain ports)
- CONV-006 (TreeService.publish)
- CONV-007 (TreeService.read)

#### Specs cobertas

- SPEC-02 (tree bundle serving)
- SPEC-03 (offline-first ETag cache)
- SPEC-05 (idempotency — publish)
- data-model.md §2 (entities)
- event-contracts.md §2 (TreePublished hard-502)

#### Sequência de execução

1. CONV-004 — domain aggregates (pure POJOs)
2. CONV-005 — 6 port interfaces (with stub implementations for compileJava)
3. CONV-006 — TreeService.publish (uses AuditPort.auditHard stub)
4. CONV-007 — TreeService.read (depends on CONV-006 for the shared TreeService class)

#### Critérios de aceite

- `POST /conv/trees` returns `201 Created` with `versionId`, `etag`, `contentHash`, `status=active`
- `GET /conv/tree` returns the bundle with matching `ETag`; `If-None-Match` returns `304`
- Publish rolls back and returns `502` when `AuditPort.auditHard` throws
- `./gradlew :conv-service:test` exits 0

#### Riscos

- Concurrent publish test: two threads publishing for the same patient must not create two `active` versions — the row lock in P3 is the final guard; use a mock `PublishedTreeRepositoryPort` with serialized access in P2 unit tests.

#### Instrução para implementador

Do NOT touch JPA in P2. `PublishedTreeRepositoryPort.findActiveWithLock` is an in-memory stub in P2;
the real `SELECT FOR UPDATE` comes in CONV-011. `@Transactional` goes on the service method only
(ArchUnit RULE).

---

### Prioridade 3 — Persistence + migrations

**Status:** pendente

#### Objetivo / Resultado esperado

Flyway migrations V0070–V0077 merged into MIG. Six JPA entities with `ddl-auto=validate` passing
against a Testcontainers PostgreSQL. Repository adapters wired to the domain ports with
`TenantContextHolder.require()` as the first line of every adapter method.

#### Issues vinculadas

- CONV-008 (Flyway V0070–V0076 — schema)
- CONV-009 (Flyway V0077 — IAM seed)
- CONV-010 (JPA entities)
- CONV-011 (repository adapters)

#### Specs cobertas

- SPEC-04 (data model + migrations)
- data-model.md §2–§4 (DDL, Flyway block V0070–V0079)
- SPEC-06 (tenant isolation — TenantContextHolder)

#### Sequência de execução

1. CONV-008 — V0070–V0076 (extensions + 6 tables); apply and verify in MIG IT
2. CONV-009 — V0077 (IAM seed); apply; verify 6 rows in permissao table
3. CONV-010 — JPA entities; run `ddl-auto=validate` against Testcontainers
4. CONV-011 — repository adapters; wire to ports from CONV-005

#### Critérios de aceite

- All 8 migrations (V0070–V0077) apply cleanly in Testcontainers IT
- `ddl-auto=validate` passes for all 6 entities
- `TenantContextHolder.require()` is the first statement in every adapter method (ArchUnit)
- `./gradlew :conv-service:test` exits 0 (unit tests with real JPA against Testcontainers)

#### Riscos

- Migration ordering: V0077 must come after V0076 in the `neuroassist-niv-migrations` service. Confirm Flyway ordering by version number string.

#### Instrução para implementador

Contribuição das migrações é feita no serviço `neuroassist-niv-migrations`, não no `conv-service`.
O `conv-service` apenas contribui os arquivos SQL; não tem runner Flyway.

---

### Prioridade 4 — External integrations

**Status:** pendente

#### Objetivo / Resultado esperado

`AudioAssetPort` reads from blob storage and crypto-shreds. `GET /conv/audio` streams with
immutable cache, 410 on erased. `PatClient` calls PAT service-client. `HistClient` enforces
hard-502 (publish) and durable-retry (retire/erase). Integration issues INT-CONV-1..4 tracked.

#### Issues vinculadas

- CONV-012 (AudioAssetPort adapter)
- CONV-013 (GET /conv/audio + AudioService)
- CONV-014 (PatClient Feign)
- CONV-015 (HistClient + AuditPort durable-retry)
- INT-CONV-001 (first sync at provisioning — EDGE coordination)
- INT-CONV-002 (TRN service-client token — ACS/TRN coordination)
- INT-CONV-003 (ACS patient-session scope — ACS coordination)
- INT-CONV-004 (PAT service-client — PAT coordination)

#### Specs cobertas

- SPEC-10 (integrations — hub-integration.md)
- event-contracts.md §2 (hard-502 / durable-retry split)
- api-contract §3 (audio streaming)

#### Sequência de execução

1. CONV-012 — AudioAssetPort adapter (blob read + crypto-shred)
2. CONV-013 — AudioService + GET /conv/audio (depends on CONV-012)
3. CONV-014 — PatClient (service-client pattern)
4. CONV-015 — HistClient + DurableAuditRetryDispatcher

#### Critérios de aceite

- `GET /conv/audio/{assetId}` streams with `Cache-Control: immutable`; returns `410 Gone` for erased assets
- PatClient WireMock IT: never called with patient-session token (PAT INV-PAT-7)
- HistClient WireMock IT: hard-502 rolls back publish; durable-retry enqueues and succeeds on HIST recovery
- `./gradlew :conv-service:test` exits 0

#### Riscos

- Blob storage: use a local stub/fake for tests; do not require a live S3/GCS in CI.

#### Instrução para implementador

INT-CONV-001..004 are coordination issues — they confirm contracts with peer modules. Mark as
done when the peer module's spec/backlog confirms the obligation. No CONV code change required.

---

### Prioridade 5 — Security + multi-tenancy

**Status:** pendente

#### Objetivo / Resultado esperado

OAuth2 resource server fully wired: ACS JWKS validation, patient-session + TRN service-client
token split, `TenantContextFilter` registered after `BearerTokenAuthenticationFilter`. All 6
authorities correctly gated. INT-CONV-005 (TRN consent upstream) confirmed.

#### Issues vinculadas

- CONV-016 (OAuth2 resource server + SecurityConfig)
- CONV-017 (TenantContextFilter + TenantContextHolder)
- INT-CONV-005 (TRN consent upstream — TRN coordination)

#### Specs cobertas

- SPEC-06 (security — authority set, token split, tenant-filter order)
- SPEC-10 (ACS JWKS integration)

#### Sequência de execução

1. CONV-016 — SecurityConfig with JWKS URI + JwtGrantedAuthoritiesConverter + @EnableMethodSecurity
2. CONV-017 — TenantContextFilter + TenantContextHolder (must come after BearerTokenAuthFilter)

#### Critérios de aceite

- `GET /conv/tree` without token → 401
- `POST /conv/trees` with patient-session token → 403 (ACS INV-3)
- `TenantContextFilter` registered after `BearerTokenAuthenticationFilter` (IT confirms tenant resolves from JWT claim)
- `./gradlew :conv-service:test` exits 0

#### Riscos

- Known pitfall: `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` missing causes `IllegalStateException` at startup — must be set in `application.yml` and `application-test.yml` (WireMock stub).

#### Instrução para implementador

WireMock JWKS stub is configured in `application-test.yml`. Do NOT use a live ACS service in tests.
The `TenantContextFilter` MUST call `TenantContextHolder.clear()` in `finally` to prevent tenant
leakage across requests in the thread pool.

---

### Prioridade 6 — Write operations (retire, erase, usage)

**Status:** pendente

#### Objetivo / Resultado esperado

Full LGPD erasure path: retire a tree version, crypto-shred audio + audit durable-retry.
Opt-in usage recording without free text. SearchPort v1 (caregiver/TRN-side only).

#### Issues vinculadas

- CONV-018 (TreeVersionService.retire)
- CONV-019 (AudioService.delete — crypto-shred)
- CONV-020 (UsageService.record)
- CONV-021 (SearchPort adapter v1)

#### Specs cobertas

- SPEC-05 (idempotency — retire/erase/usage)
- api-contract §6, §7 (retire, erase audio)
- data-model §5 (data lifecycle)
- ADR-005/ADR-006 (crypto-shred, HIST facts)

#### Sequência de execução

1. CONV-018 — retire (commit + durable-retry HIST)
2. CONV-019 — erase (crypto-shred + retire affected versions + durable-retry)
3. CONV-020 — usage record (opt-in, no free text, idempotent)
4. CONV-021 — SearchPort v1 (Postgres FTS + trigram, NOT on patient path)

#### Critérios de aceite

- Retire: `200 OK` committed; HIST audit durable-retry; idempotent second call returns `200`
- Erase: `202 Accepted`; `GET /conv/audio` for erased assets returns `410`; second erase `erasedAssetCount: 0`
- Usage: `400` on free-text field; opt-out discards silently; idempotent replay `200`
- SearchPort adapter IT: returns phrases by FTS query; never called on station read path
- `./gradlew :conv-service:test` exits 0

#### Riscos

- Crypto-shred implementation: for MVP use a symmetric key stored in an env/secret; delete the key on erasure. The exact key-management scheme (AWS KMS, Vault, in-DB) should be confirmed before scaffold.

---

### Prioridade 7 — Observability

**Status:** pendente

#### Objetivo / Resultado esperado

`X-Correlation-Id` echoed end-to-end (request → response + HIST calls). Privacy log filter
(no phrase text, no voice_model_ref). Micrometer metrics for publish, audit-502, durable-retry
queue, usage accept/discard. Custom health indicator with correct hard vs soft dependencies.

#### Issues vinculadas

- CONV-022 (CorrelationIdInterceptor + privacy log filter)
- CONV-023 (Actuator custom metrics)

#### Specs cobertas

- SPEC-07 (observability + health)
- ADR-005/ADR-006 (privacy constraints on logs)

#### Sequência de execução

1. CONV-022 — CorrelationIdFilter + CorrelationIdFeignInterceptor
2. CONV-023 — ConvMetrics + ConvHealthIndicator

#### Critérios de aceite

- Every response includes `X-Correlation-Id`; HIST Feign call carries the same id
- No log statement contains phrase text or voice_model_ref
- `conv.tree.publish.count`, `conv.audit.hard502.count`, `conv.audit.retry.queue.size`, `conv.usage.signal.accept.count`, `conv.usage.signal.discard.count` exposed via `/actuator/metrics`
- `./gradlew :conv-service:test` exits 0

---

### Prioridade 8 — BDD end-to-end

**Status:** pendente

#### Objetivo / Resultado esperado

Five Cucumber feature files with full scenario coverage per SPEC-08. Per-feature step classes
(no monolithic `ConvStepDefs.java`). `CucumberSpringContext` extends `BaseIntegrationTest`.
All scenarios passing in `integrationTest` task.

#### Issues vinculadas

- CONV-024 (BDD scaffold)
- CONV-025 (BDD scenarios implementation)

#### Specs cobertas

- SPEC-08 (BDD test scenarios)
- event-contracts.md §2 (hard-502, durable-retry scenarios)

#### Sequência de execução

1. CONV-024 — scaffold (feature files + step classes + CucumberSpringContext)
2. CONV-025 — full scenarios (requires CONV-018/019 implemented for retire/erase paths)

#### Critérios de aceite

- `./gradlew :conv-service:integrationTest` exits 0 with all scenarios passing
- Coverage: `tree-publish.feature` has hard-502 scenario; `tree-retire-and-erase.feature` has durable-retry scenario; `usage-signal.feature` has opt-out discard and free-text rejection

---

### Prioridade 9 — Hardening

**Status:** pendente

#### Objetivo / Resultado esperado

Idempotency concurrency proof (concurrent publishes; row lock + partial unique index). Full
`MethodSecurityEnforcementIT` covering 401/403 for every endpoint and wrong token class. D-642
verified end-to-end.

#### Issues vinculadas

- CONV-026 (idempotency guard + concurrency)
- CONV-027 (MethodSecurityEnforcementIT)

#### Specs cobertas

- SPEC-05 (idempotency + concurrency)
- SPEC-06 (security enforcement — D-642)

#### Sequência de execução

1. CONV-026 — concurrent publish test + idempotency guards (all 4 operations)
2. CONV-027 — MethodSecurityEnforcementIT (requires all controllers wired)

#### Critérios de aceite

- Concurrent publish IT: exactly one `active` version after two simultaneous publishes
- `MethodSecurityEnforcementIT`: 401 on all protected endpoints without token; 403 on wrong token class; 200 on `GET /conv/health`
- `./gradlew :conv-service:integrationTest` exits 0

---

## 3. Dependências externas

| Peer | Dependency | CONV requires | Tracked in |
|---|---|---|---|
| MIG | Flyway runner owns V0070–V0077 | V0077 applies before CONV service starts | CONV-008, CONV-009 |
| ACS | JWKS endpoint for token validation | ACS JWKS URI reachable at startup | CONV-016 |
| ACS | patient-session token with `conv.*`/`gest.*` authorities | ACS includes V0077 authorities in token | INT-CONV-003 |
| ACS | TRN service-client token with `conv.tree.publish`/`retire`/`delete` | ACS includes these authorities | INT-CONV-002 |
| PAT | `pat.patient.read` service-client endpoint | PAT accepts CONV service-client | INT-CONV-004 |
| HIST | `hist.audit.record` service-client endpoint | HIST accepts CONV audit envelope | CONV-015 |
| TRN | Publishes approved versions to CONV | TRN holds `conv.tree.publish` token + consent gate | INT-CONV-005 |
| EDGE | First-sync at provisioning | EDGE provisioning performs first `GET /conv/tree` before handover | INT-CONV-001 |
| Blob storage | Pre-synthesized audio at `storage_ref` | Storage credentials in env/secret | CONV-012 |

---

## 4. Restrições arquiteturais (Java)

- ArchUnit **RULE-01..08** (`CLAUDE.md`); camadas `api / application / domain / infrastructure`.
- `@Transactional` somente em `application.service` (TreeService, TreeVersionService, AudioService, UsageService).
- `api` layer must NOT import `infrastructure.security` (RULE-04 — TenantContextFilter is in `infrastructure`).
- Inbound ports carry **no** `tenantId`; services call `TenantContextHolder.require()` as first line (RULE-04).
- `SearchPort` MUST NOT be called from any `api` controller bound to a patient-session token (ADR-002, INV-CONV-5).
- No free-text patient-speech content in logs or in any persistent field beyond `phrase.text` (which is caregiver-authored, not patient-spoken — ADR-006).
- D-642: `@EnableMethodSecurity(prePostEnabled = true)` MUST be present in `SecurityConfig`; without it `@PreAuthorize` is silently inert.
- D-535: `@PreAuthorize` strings MUST reference `RoleAuthorityPolicy` constants, never literal strings.

---

## 5. Referências

- `docs/architecture/backend/services/conv-service/contracts/api-contract.md`
- `docs/architecture/backend/services/conv-service/contracts/data-model.md`
- `docs/architecture/backend/services/conv-service/contracts/event-contracts.md`
- `docs/architecture/backend/services/conv-service/contracts/hub-integration.md`
- `docs/architecture/backend/services/conv-service/contracts/integration-contracts.md`
- `docs/architecture/backend/services/conv-service/generator-config.yml`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-01-api-surface.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-02-tree-bundle-serving.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-03-offline-first-etag-cache.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-04-data-model-migrations.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-05-idempotency-concurrency.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-06-security.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-07-observability-health.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-08-bdd-test-scenarios.md`
- `docs/architecture/backend/services/conv-service/spec/backend/SPEC-10-integrations.md`
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`
