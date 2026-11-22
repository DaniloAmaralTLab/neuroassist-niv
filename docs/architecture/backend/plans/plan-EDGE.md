# Plan — EDGE (Edge Device Integration)

> Service: `edge-service` · Port: 8084 · Stack: Java 21 / Spring Boot · Multi-tenant (schema-per-tenant)
> Generated: 2026-11-20 by `/be-architect-backlog neuroassist-niv EDGE`

## Status das prioridades

- P1 — pendente
- P2 — pendente (SAFETY-GEST-1: +EDGE-027, +EDGE-028)
- P3 — pendente (SAFETY-GEST-1: +EDGE-029, +EDGE-030, +EDGE-031, +INT-EDGE-008)
- P4 — pendente (SAFETY-GEST-1: +EDGE-032, +INT-EDGE-006, +INT-EDGE-007)
- P5 — pendente
- P6 — pendente (SAFETY-GEST-1: +EDGE-033)
- P7 — pendente
- P8 — pendente (SAFETY-GEST-1: +EDGE-034)
- P9 — pendente

---

## 0. Leitura executiva

### Papel do servico (extraido de 01-architectural-vision.md)

`edge-service` is the **device authorization endpoint and device lifecycle manager** for the
NeuroAssist NIV platform. It plays two security roles simultaneously: (1) an **ACS resource
server** on human-facing endpoints, validating caregiver/coordinator JWTs issued by ACS; and
(2) the **device authorization endpoint**, minting `edge.device` tokens on successful pairing
and publishing its own JWKS so other resource servers (GWY, PAT, EVNT) trust EDGE-issued tokens.
It monitors local edge stations (the patient's webcam agent), manages the pairing lifecycle
(`awaiting_claim → paired → deactivated/revoked`), caches the patient's command catalog for
offline operation, and runs an in-process heartbeat watchdog.

### MVP scope (extraido de 01)

- Full device lifecycle: enroll, pair (ADR-003 single-use code), deactivate/reactivate (G3), unpair, revoke (terminal, G1)
- Heartbeat liveness + watchdog (`DeviceWentOffline` / `DeviceCameOnline`)
- Offline catalog distribution: PAT pull (service-client, ETag/304, INV-EDGE-5), device-facing `GET /edge/catalog`
- Device token issuance (EDGE's own JWKS) + immediate revocation (introspection endpoint, G1)
- HIST audit on every lifecycle action (sync REST, same request boundary)
- Multi-tenant: schema-per-tenant for `edge_device`, `edge_credential_revocation`, `cached_catalog`; global schema for `device_pairing_code`

### Diagnostico inicial (gaps mapeados em 06)

- **G1 (resolved):** immediate revocation = short TTL refreshed on heartbeat + `POST /edge/device-tokens/introspect`
- **G2 (resolved):** PAT catalog pull uses an ACS-issued service-client token (not the device token — INV-EDGE-2, PAT INV-PAT-7)
- **G3 (resolved):** reactivation re-issues a fresh credential (`deactivated → paired`, new `credentialId`)
- **G4 (resolved):** ACS provisioner confirms `paired` via `GET /edge/devices/{id}` before `POST /acs/patient-sessions`
- **G5 (open — INT-EDGE-001):** EVNT gesture-report authority string not yet defined (EVNT not architected)
- **Risk R2 (mitigated):** pairing code hashed at rest; plaintext returned exactly once
- **Risk R5 (mitigated):** `TenantContextFilter` registered after `BearerTokenAuthenticationFilter`, not as `@Component`

---

## 1. Estrategia geral

### Objetivo macro

Deliver a fully operational `edge-service` that handles the complete device lifecycle, provides
offline-resilient catalog distribution to paired stations, issues and governs the `edge.device`
JWT credential, and feeds an immutable HIST audit trail for every state transition.

### Ordem das prioridades

| P | Titulo | Motivo |
|---|---|---|
| P1 | Scaffold + domain + API surface | Foundation: package skeleton, state machine, authority constants, controller layer |
| P2 | Core orchestration (use cases + heartbeat) | Delivers the full lifecycle golden path: enroll → pair → heartbeat; +SAFETY-GEST-1: detection-state domain + RecordHeartbeat extension |
| P3 | Persistence + migrations | JPA adapters + Flyway scripts so the application persists state; +SAFETY-GEST-1: V0032 + EdgeDetectionLapse JPA |
| P4 | External integrations (PAT, ACS, HIST, catalog) | Service-to-service calls; catalog distribution; audit sink; +SAFETY-GEST-1: EvntLapseClient |
| P5 | Security (signing, introspection, tenant filter) | Device token issuance, EDGE JWKS, SecurityConfig, revocation check |
| P6 | Liveness watchdog + detection-lapse sweep | @Scheduled jobs: DeviceWentOffline (EDGE-022) + detection-lapse escalation (EDGE-033, SAFETY-GEST-1) |
| P7 | Observability | Actuator health (offline-first) + 7 Micrometer metrics + correlation ID |
| P8 | BDD end-to-end | 5 feature files; +SAFETY-GEST-1: detection-lapse.feature (EDGE-034) |
| P9 | Hardening | Resilience4j circuit breakers + idempotency guards under load |

---

## 2. Plano por prioridade

### Prioridade P1 — Scaffold + domain + API surface
Status: pendente

#### Objetivo / Resultado esperado
Create the hexagonal package skeleton for `edge-service`, the core domain entities with state
machine, the `RoleAuthorityPolicy` single source, and the `DeviceManagementController` with all
8 device endpoints and their DTOs.

#### Issues vinculadas
- EDGE-001 (scaffold)
- EDGE-002 (EdgeDevice aggregate + LifecycleState/Connectivity enums)
- EDGE-003 (DevicePairingCode + EdgeCredentialRevocation + CachedCatalog domain)
- EDGE-004 (RoleAuthorityPolicy — authority constants)
- EDGE-005 (DeviceManagementController + DTOs)

#### Specs cobertas
- SPEC-01, SPEC-02 (device state machine), SPEC-06 (authority model, INV-EDGE-7)

#### Sequencia de execucao
- Fase 1: EDGE-001 (scaffold) → Fase 2: EDGE-002 + EDGE-003 (domain) → Fase 3: EDGE-004 (policy) → Fase 4: EDGE-005 (controller)

#### Criterios de aceite
- `./gradlew :edge-service:compileJava` exits 0
- All `@PreAuthorize` expressions reference `RoleAuthorityPolicy` constants
- All 8 device endpoints declared with correct verbs and paths

#### Riscos
- `edge.device.pair` endpoint is code-authenticated (not JWT); the `SecurityConfig` must permit-all for `POST /edge/devices/pair` — handled in P5

#### Instrucao para implementador
Run `python scripts/be-module-generator.py generate --config docs/architecture/backend/services/edge-service/generator-config.yml`
to scaffold the hexagonal structure. Then wire the EDGE-002 state machine (invariants in domain layer, never in controllers) and confirm `RoleAuthorityPolicy` matches api-contract §9 exactly.

---

### Prioridade P2 — Core orchestration (use cases + heartbeat)
Status: pendente

#### Objetivo / Resultado esperado
Implement the 5 device-lifecycle use cases (EnrollDevice, PairDevice, DeactivateDevice,
ReactivateDevice, UnpairDevice/RevokeDevice) and the HeartbeatController with token refresh (G1).

#### Issues vinculadas
- EDGE-006 (EnrollDevice)
- EDGE-007 (PairDevice — anchor + compare-and-set)
- EDGE-008 (DeactivateDevice + ReactivateDevice, G3)
- EDGE-009 (UnpairDevice + RevokeDevice, INV-EDGE-6)
- EDGE-010 (HeartbeatController + RecordHeartbeat)

#### Specs cobertas
- SPEC-02 (use cases, state transitions), SPEC-05 (idempotency), event-contracts.md §1 (audit catalog)

#### Sequencia de execucao
- Fase 1: EDGE-006 (enroll) → Fase 2: EDGE-007 (pair, anchor) → Fase 3: EDGE-008 + EDGE-009 → Fase 4: EDGE-010 (heartbeat)

#### Criterios de aceite
- `PairDevice` uses compare-and-set; two concurrent claims → one `401`
- `RevokeDevice` is terminal; `409 device-revoked` on reactivation attempt
- Heartbeat on a non-paired device → `403`; revoked credential → `401`

#### Riscos
- P2 use cases depend on P3 (JPA adapters) for integration tests; unit tests use in-memory fakes
- `EdgeDeviceTokenSignerPort` (P5, EDGE-020) is stubbed in P2 unit tests

#### Instrucao para implementador
Use in-memory stubs for `EdgeDeviceRepositoryPort` and `EdgeDeviceTokenSignerPort` in P2 unit tests.
Full integration tests run in P8 BDD after P3 persistence is in place.

---

### Prioridade P3 — Persistence + migrations
Status: pendente

#### Objetivo / Resultado esperado
Author Flyway migration scripts V0030–V0031 and create all four JPA adapters with schema-per-tenant
routing.

#### Issues vinculadas
- EDGE-011 (V0030 global — device_pairing_code)
- EDGE-012 (V0031 tenant — edge_device + revocation + catalog)
- EDGE-013 (EdgeDevice + DevicePairingCode JPA adapters)
- EDGE-014 (EdgeCredentialRevocation + CachedCatalog JPA adapters)

#### Specs cobertas
- SPEC-04 (data model, schema routing, reserved range V0030–V0032)

#### Sequencia de execucao
- Fase 1: EDGE-011 + EDGE-012 (SQL scripts) → Fase 2: EDGE-013 + EDGE-014 (JPA + adapters)

#### Criterios de aceite
- `V0030` applies before `V0031` on a fresh DB
- `DevicePairingCodeJpaAdapter.consumeCode()` is atomic (compare-and-set)
- Schema routing sends `device_pairing_code` to `neuroassist_global` and others to `t_<tenantId>`

#### Riscos
- Scripts authored here but applied by MIG — coordinate via INT-EDGE-004

#### Instrucao para implementador
Follow the DDL in `data-model.md §2.1–2.4` exactly. The `UNIQUE(device_id)` constraint on
`device_pairing_code` is essential for idempotent re-enroll (SPEC-05).

---

### Prioridade P4 — External integrations (PAT, ACS, HIST) + catalog
Status: pendente

#### Objetivo / Resultado esperado
Wire all three Feign clients with WireMock stubs, implement the catalog distribution use case
and controller, and confirm the service-client identity for PAT calls.

#### Issues vinculadas
- EDGE-015 (PatClient — ETag/304, WireMock)
- EDGE-016 (AcsClient — JWKS cache + introspect + service-client token)
- EDGE-017 (HistClient — audit sink, 502 failure path)
- EDGE-018 (RefreshCatalog + CatalogController, INV-EDGE-5)

#### Specs cobertas
- SPEC-03 (catalog distribution, ADR-004), integration-contracts.md §1–3

#### Sequencia de execucao
- Fase 1: EDGE-016 (ACS — service-client token needed by EDGE-015) → Fase 2: EDGE-015 + EDGE-017 → Fase 3: EDGE-018

#### Criterios de aceite
- `GET /edge/catalog` returns `200` with ETag for a paired device; `304` on matching `If-None-Match`
- `GET /edge/catalog` on PAT outage: returns stale cache (`stale=true`), never `502`
- HIST audit never sent with the device or patient-session token

#### Riscos
- INT-EDGE-002 (ACS service-client path) must resolve before EDGE-016 can be completed
- INT-EDGE-003 (HIST failure policy) affects EDGE-017 implementation

#### Instrucao para implementador
Catalog staleness hint is EDGE's own (ADR-004): PAT's `max-age=30` is advisory. EDGE decides
how long `stale=true` before the device must re-sync.

---

### Prioridade P5 — Security (signing, introspection, tenant filter)
Status: pendente

#### Objetivo / Resultado esperado
Complete the dual security role: ACS JWKS resource server for human endpoints + EDGE's own device
token issuer (JWKS, introspection, RevocationStore).

#### Issues vinculadas
- EDGE-019 (SecurityConfig + TenantContextFilter, Risk R5)
- EDGE-020 (EdgeDeviceTokenSignerPort + issuer adapter + JwksController)
- EDGE-021 (DeviceTokenIntrospectController + RevocationStore adapter)

#### Specs cobertas
- SPEC-06 (G1/G2, ADR-002, INV-EDGE-2, Risk R5), SPEC-01 (§5–6)

#### Sequencia de execucao
- Fase 1: EDGE-019 (SecurityConfig, permit-all for JWKS/health/pair) → Fase 2: EDGE-020 (token signer + JWKS) → Fase 3: EDGE-021 (introspection)

#### Criterios de aceite
- `TenantContextFilter` is NOT `@Component` (Risk R5 — ArchUnit test should catch this)
- Minted token authorities = `["edge.heartbeat.record","edge.catalog.read"]` only (pending INT-EDGE-001 for EVNT right)
- `active:false` on introspection for a revoked `credentialId`

#### Riscos
- INT-EDGE-001 (EVNT authority) is a known gap; scaffold without it and add at INT-EDGE-001 resolution

#### Instrucao para implementador
The signing key alias is `EDGE_DEVICE_TOKEN_SIGNING_KEY_ALIAS` from `application.yml`. Rotate on
reactivation (G3, EDGE-008). `JwksController` must expose only the **public** key.

---

### Prioridade P6 — Liveness watchdog
Status: pendente

#### Objetivo / Resultado esperado
Implement the `@Scheduled` heartbeat watchdog that flips `connectivity=offline` for paired devices
that miss their heartbeat threshold.

#### Issues vinculadas
- EDGE-022 (EvaluateLivenessScheduler)

#### Specs cobertas
- SPEC-02 (EvaluateLiveness), SPEC-05 (transition-only, no re-emit)

#### Sequencia de execucao
- Single phase: EDGE-022

#### Criterios de aceite
- Optimistic UPDATE; no re-emit for already-offline devices
- `DeviceWentOffline` audit with `lastHeartbeatAt` + `thresholdMs`

#### Riscos
- Mobile browsers may suspend PWA timers (Risk R1); EDGE surfaces silence, cannot prevent it

#### Instrucao para implementador
Use `@Scheduled(fixedDelayString = "${edge.watchdog.scan-interval-seconds:30}000")`. Test with
mocked `Clock` to control now() without sleeping.

---

### Prioridade P7 — Observability + health
Status: pendente

#### Objetivo / Resultado esperado
Actuator health (device-path resilience), all 7 Micrometer metrics from SPEC-07, and
`X-Correlation-Id` propagation end-to-end.

#### Issues vinculadas
- EDGE-023 (health + metrics + logging)

#### Specs cobertas
- SPEC-07 (health, metrics, INV-EDGE-5)

#### Sequencia de execucao
- Single phase: EDGE-023

#### Criterios de aceite
- Health `200 UP` even when PAT/ACS are unreachable
- All 7 metrics registered (see SPEC-07 §Implementação)
- `X-Correlation-Id` echoed on every response and HIST call

#### Instrucao para implementador
PAT/ACS health indicators should be `DOWN`-able readiness details (not hard failures). Use
`MeterRegistry` injection for metrics; never use static counters.

---

### Prioridade P8 — BDD end-to-end
Status: pendente

#### Objetivo / Resultado esperado
4 Cucumber feature files exercised by step definitions covering all 32 scenarios (SPEC-08).

#### Issues vinculadas
- EDGE-024 (BDD setup + enrollment + heartbeat features)
- EDGE-025 (catalog + revocation features)

#### Specs cobertas
- SPEC-08 (all 4 features, INV-EDGE-1/2/3/4/5/6)

#### Sequencia de execucao
- Fase 1: EDGE-024 (setup + enrollment/heartbeat) → Fase 2: EDGE-025 (catalog/revocation)

#### Criterios de aceite
- `./gradlew :edge-service:integrationTest` runs all 4 feature files and exits 0

#### Instrucao para implementador
Feature files are pre-authored in `docs/architecture/backend/services/edge-service/tests/cucumber/`.
Use the shared step vocabulary from SPEC-08 to avoid redefining steps per file.

---

### Prioridade P2 (SAFETY-GEST-1 amendment) — Detection-state domain + extend RecordHeartbeat
Status: pendente

#### Objetivo / Resultado esperado
Extend the `EdgeDevice` aggregate and heartbeat DTOs with ADR-005 detection-state fields, and extend `RecordHeartbeatUseCase` to persist them, advance `lastDetectingAt` on `RUNNING`, and trigger lapse resolution on the first `RUNNING` beat.

#### Issues vinculadas
- EDGE-027 (DetectionState enum + EdgeDevice fields + DTO extensions)
- EDGE-028 (RecordHeartbeatUseCase extension)

#### Specs cobertas
- SPEC-02 (detection state on heartbeat, INV-EDGE-9), api-contract.md §3.1–§3.2, ADR-005

#### Sequencia de execucao
- Fase 1: EDGE-027 (domain + DTOs) → Fase 2: EDGE-028 (use case extension)

#### Criterios de aceite
- Absent `detectionState` → stored `UNKNOWN`, never `RUNNING`, `lastDetectingAt` NOT advanced
- First `RUNNING` beat with an open lapse episode triggers `ResolveDetectionLapseUseCase`

#### Riscos
- EDGE-028 depends on EDGE-029 (lapse repository port) which is P3; use a stub in P2 unit tests

#### Instrucao para implementador
Run unit tests for `RecordHeartbeatUseCase` with mocked `EdgeDetectionLapseRepositoryPort` (returning empty Optional) before EDGE-029 JPA adapter is in place. The backwards-compatibility rule (INV-EDGE-9: absent → UNKNOWN, never RUNNING) is a hard invariant — a test must explicitly assert it.

---

### Prioridade P3 (SAFETY-GEST-1 amendment) — Detection-lapse domain + Flyway V0032 + JPA
Status: pendente

#### Objetivo / Resultado esperado
Create the `EdgeDetectionLapse` aggregate and repository port, author the V0032 Flyway migration (additive per-tenant), and implement the JPA entity + adapter.

#### Issues vinculadas
- EDGE-029 (EdgeDetectionLapse domain aggregate + ports + LapseCause enum)
- EDGE-030 (Flyway V0032 — detection-state columns + edge_detection_lapse DDL)
- EDGE-031 (EdgeDetectionLapseJpaEntity + adapter + EdgeDeviceJpaEntity extension)
- INT-EDGE-008 (MIG — register V0032)

#### Specs cobertas
- SPEC-04 (V0032 reserved slot, schema routing, INV-EDGE-10), data-model.md §2.5

#### Sequencia de execucao
- Fase 1: EDGE-029 (domain) → Fase 2: EDGE-030 (SQL) → Fase 3: EDGE-031 (JPA)

#### Criterios de aceite
- `uq_edge_detection_lapse_open` DDL partial unique index fires on a second open episode (INV-EDGE-10)
- V0032 is additive and nullable; no data backfill needed

#### Riscos
- INT-EDGE-008 (MIG V0032 registration) must be coordinated with the MIG team before the migration can run centrally

#### Instrucao para implementador
Follow `data-model.md §2.5` DDL exactly for the CREATE TABLE and indexes. The `evnt_idempotency_key` unique index is essential for EVNT-side dedup.

---

### Prioridade P4 (SAFETY-GEST-1 amendment) — EvntLapseClient + INT confirmations
Status: pendente

#### Objetivo / Resultado esperado
Implement the `EvntLapseClient` Feign adapter with Resilience4j retry/circuit-breaker (never-drop safety) and confirm the EVNT/ACS integration contracts.

#### Issues vinculadas
- EDGE-032 (EvntLapseClient Feign adapter, G6)
- INT-EDGE-006 (EVNT — confirm raise/resolve endpoints and authority strings)
- INT-EDGE-007 (ACS — confirm edge-service service-client token with EVNT lapse authority)

#### Specs cobertas
- SPEC-10 (integrations G6), integration-contracts.md §6.2 and §7

#### Sequencia de execucao
- Fase 1: EDGE-032 (adapter, using placeholder authority pending INT-EDGE-006) → Fase 2: update EDGE-032 with confirmed paths once INT-EDGE-006 resolves

#### Criterios de aceite
- Never-drop: on EVNT outage, no exception propagates; episode stays open with `raisedToEvntAt = null`
- Circuit breaker opens after 5 consecutive failures (integration-contracts §7)

#### Riscos
- INT-EDGE-006 and INT-EDGE-007 are open until EVNT is architected; EDGE-032 uses placeholders until then

#### Instrucao para implementador
Use WireMock for EVNT in EDGE-032 integration tests. The circuit breaker configuration (`evnt-lapse`) should be distinct from the existing `pat-catalog` breaker in EDGE-026.

---

### Prioridade P6 (SAFETY-GEST-1 amendment) — Detection-lapse sweep + use cases
Status: pendente

#### Objetivo / Resultado esperado
Implement the `EvaluateDetectionLapseScheduler` and the `RaiseDetectionLapseUseCase` / `ResolveDetectionLapseUseCase`, with HIST audit and EVNT escalation, completing the safety escalation path.

#### Issues vinculadas
- EDGE-033 (EvaluateDetectionLapseScheduler + RaiseDetectionLapseUseCase + ResolveDetectionLapseUseCase)

#### Specs cobertas
- SPEC-02 (EvaluateDetectionLapse + RaiseDetectionLapse + ResolveDetectionLapse use cases; lapse sweep; INV-EDGE-10)
- SPEC-05 (one open episode per device; resolved_at set exactly once)
- event-contracts.md §1.2 (DetectionLapseStarted / DetectionLapseResolved audit)
- integration-contracts.md §6.2 (EVNT raise/resolve EARS)

#### Sequencia de execucao
- Single phase: EDGE-033 (all three use cases + scheduler wired together)

#### Criterios de aceite
- One open episode per device (INV-EDGE-10); concurrent sweeps → one succeeds, one suppressed
- `DetectionLapseStarted` and `DetectionLapseResolved` audited to HIST (event-contracts §1.2)
- Never-drop: EVNT unreachable → episode stays open, next sweep retries

#### Riscos
- Multi-tenant sweep must call `TenantContextHolder` per tenant (ArchUnit RULE-04); unit tests use mocked Clock

#### Instrucao para implementador
Reuse the same `@Scheduled(fixedDelayString = ...)` pattern from EDGE-022 (EvaluateLivenessScheduler). Test with mocked Clock to control time without sleeping.

---

### Prioridade P8 (SAFETY-GEST-1 amendment) — BDD detection-lapse.feature stubs
Status: pendente

#### Objetivo / Resultado esperado
Wire `detection-lapse.feature` into the Cucumber runtime with `DetectionLapseSteps.java` (PendingException stubs only), confirming 0 duplicate step patterns from EDGE-024/025.

#### Issues vinculadas
- EDGE-034 (DetectionLapseSteps.java + feature copy)

#### Specs cobertas
- SPEC-08 (detection-lapse.feature; reusable steps shared; no duplicate patterns)
- ADR-005 (all scenarios: RUNNING/PAUSED/DEGRADED/UNAVAILABLE/UNKNOWN; lapse open; resolve; EVNT unreachable)

#### Sequencia de execucao
- Single phase: EDGE-034

#### Criterios de aceite
- `./gradlew :edge-service:test` with the detection-lapse feature reports all scenarios PENDING (not UNDEFINED or FAILED)
- 0 duplicate Cucumber Expression patterns vs EDGE-024/025 step files

#### Riscos
- edge-service already has 29 duplicate patterns from earlier phases (Ledger); EDGE-034 must add 0 more

#### Instrucao para implementador
Before creating `DetectionLapseSteps.java`, grep existing step definition files for the patterns to verify no overlap. Each `@Given`/`@When`/`@Then` annotation uses a Cucumber Expression (not regex) and is defined exactly once.

---

### Prioridade P9 — Hardening
Status: pendente

#### Objetivo / Resultado esperado
Resilience4j circuit breakers on all three external calls + idempotency guards verified under
concurrent load.

#### Issues vinculadas
- EDGE-026 (ResilienceConfig + idempotency stress test)

#### Specs cobertas
- SPEC-05 (idempotency), integration-contracts.md §7 (resilience)

#### Sequencia de execucao
- Single phase: EDGE-026

#### Criterios de aceite
- PAT circuit breaker: open after 5 failures; fallback = last cached catalog
- Two concurrent pair-claims on the same code: exactly one succeeds

#### Instrucao para implementador
Wire circuit breakers as Resilience4j `@CircuitBreaker` on the Feign adapter methods.
Idempotency stress test: run N concurrent requests against `PairDeviceUseCase` with the same
pairing code and assert exactly 1 `201`/`200` response.

---

## 3. Dependencias externas

| Dependency | Purpose | Status |
|---|---|---|
| `acs-service` | ACS JWKS (verify human tokens) + introspect + service-client token (G2) | Planned |
| `pat-service` | Catalog pull (`GET /pat/patients/{id}/commands`, ETag/304) | Planned |
| `hist-service` | Audit sink (sync REST `POST /audit`) | Planned |
| `neuroassist-niv-migrations` (MIG) | Apply EDGE Flyway V0030–V0032 | Planned — INT-EDGE-004 |
| EVNT (EVNT module) | Gesture-report authority string in `edge.device` token | Not architected — INT-EDGE-001 |
| EVNT (EVNT module) | Detection-lapse raise/resolve endpoints + authority (G6, ADR-005) | Not architected — INT-EDGE-006 |

---

## 4. Restricoes arquiteturais

Applies to `java` stack (ADR key `hexagonal_java`,
`docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`):

- ArchUnit RULE-01..08 enforced (see `CLAUDE.md` for the full rule set)
- Layers: `api` / `application` / `domain` / `infrastructure`
- `@Transactional` only in `application.service` layer
- Controllers must NOT import `infrastructure.security` (RULE-04)
- Domain objects carry no JPA annotations (RULE-03)
- `TenantContextHolder.require()` called first in every application service (RULE-04, SPEC-06, Risk R5)
- `RoleAuthorityPolicy` is the only source of authority strings; no literal strings in `@PreAuthorize` (INV-EDGE-7, D-535)

---

## 5. Referencias

- `docs/architecture/backend/services/edge-service/01-architectural-vision.md`
- `docs/architecture/backend/services/edge-service/02-architecture-blueprint.md`
- `docs/architecture/backend/services/edge-service/03-initial-domain-framing.md`
- `docs/architecture/backend/services/edge-service/04-backend-architecture-direction.md`
- `docs/architecture/backend/services/edge-service/05-persistence-model.md`
- `docs/architecture/backend/services/edge-service/06-risks-gaps-assumptions.md`
- `docs/architecture/backend/services/edge-service/contracts/api-contract.md`
- `docs/architecture/backend/services/edge-service/contracts/data-model.md`
- `docs/architecture/backend/services/edge-service/contracts/event-contracts.md`
- `docs/architecture/backend/services/edge-service/contracts/integration-contracts.md`
- `docs/architecture/backend/services/edge-service/generator-config.yml`
- `docs/architecture/backend/issues/issues_map-EDGE.md`
- `docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md`
- `docs/architecture/backend/services/edge-service/adr/ADR-002-device-token-issuance-validation.md`
- `docs/architecture/backend/services/edge-service/adr/ADR-003-code-based-pairing-claim.md`
- `docs/architecture/backend/services/edge-service/adr/ADR-004-offline-catalog-distribution.md`
- `docs/architecture/backend/services/edge-service/adr/ADR-005-detection-state-and-lapse-alert.md`
