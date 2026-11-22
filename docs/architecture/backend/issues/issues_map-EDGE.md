# Issues Map -- EDGE (Edge Device Integration)

> Module: **EDGE** · Service: `edge-service` · Stack: Java 21 / Spring Boot · Multi-tenant (schema-per-tenant)
> Generated: 2026-11-20 by `/be-architect-backlog neuroassist-niv EDGE`

## Functional issues (EDGE-001..EDGE-035)

| Issue | Title | Priority | Status |
|---|---|---|---|
| EDGE-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | P1 | INTACT |
| EDGE-002 | Domain — EdgeDevice aggregate (lifecycle state machine, INV-EDGE-1/4/6) | P1 | INTACT |
| EDGE-003 | Domain — DevicePairingCode + EdgeCredentialRevocation + CachedCatalog value objects and ports | P1 | INTACT |
| EDGE-004 | RoleAuthorityPolicy — single source of authority constants (D-535, INV-EDGE-7) | P1 | INTACT |
| EDGE-005 | API — DeviceManagementController + all device DTOs (8 endpoints: enroll/list/get/activate/pair/deactivate/unpair/revoke) | P1 | INTACT |
| EDGE-006 | Application — EnrollDevice use case (DeviceEnrolled audit to HIST, INV-EDGE-3) | P2 | INTACT |
| EDGE-007 | Application — PairDevice use case (compare-and-set claim, credential minting, DevicePaired anchor) | P2 | INTACT |
| EDGE-008 | Application — DeactivateDevice + ReactivateDevice use cases (reversible lifecycle, G3) | P2 | INTACT |
| EDGE-009 | Application — UnpairDevice + RevokeDevice use cases (terminal states, revocation list, INV-EDGE-6) | P2 | INTACT |
| EDGE-010 | API — HeartbeatController + RecordHeartbeat use case (record, token refresh G1, DeviceCameOnline) | P2 | INTACT |
| EDGE-011 | Flyway V0030__edge_global_init.sql — global schema: device_pairing_code + pgcrypto | P3 | INTACT |
| EDGE-012 | Flyway V0031__edge_tenant_init.sql — tenant schema: edge_device + edge_credential_revocation + cached_catalog | P3 | INTACT |
| EDGE-013 | Infrastructure — EdgeDevice + DevicePairingCode JPA entities and adapters (schema-per-tenant routing) | P3 | INTACT |
| EDGE-014 | Infrastructure — EdgeCredentialRevocation + CachedCatalog JPA entities and adapters | P3 | INTACT |
| EDGE-015 | Infrastructure — PatClient Feign adapter (GET /pat/.../commands + gesture-types, ETag/304, WireMock stubs) | P4 | INTACT |
| EDGE-016 | Infrastructure — AcsClient Feign adapter (JWKS cache + introspect + service-client token, G1/G2) | P4 | INTACT |
| EDGE-017 | Infrastructure — HistClient Feign adapter (audit sink POST /audit, 502 failure path in prod) | P4 | INTACT |
| EDGE-018 | Application — RefreshCatalog use case + CatalogController (GET /edge/catalog, ETag/304, stale, INV-EDGE-5) | P4 | INTACT |
| EDGE-019 | Security — SecurityConfig (ACS JWKS resource server + TenantContextFilter inside SecurityFilterChain, Risk R5) | P5 | INTACT |
| EDGE-020 | Security — EdgeDeviceTokenSignerPort + issuer adapter (mint edge.device JWT, sign, publish JWKS, G1) | P5 | INTACT |
| EDGE-021 | Security — DeviceTokenIntrospectController + RevocationStore adapter (POST /device-tokens/introspect, INV-EDGE-6) | P5 | INTACT |
| EDGE-022 | Application — EvaluateLiveness watchdog (@Scheduled, transition-only audit, SPEC-05) | P6 | INTACT |
| EDGE-023 | Observability — Actuator health (offline-first INV-EDGE-5) + Micrometer metrics + X-Correlation-Id propagation | P7 | INTACT |
| EDGE-024 | BDD setup + device-enrollment-and-pairing.feature + heartbeat-liveness.feature step definitions | P8 | INTACT |
| EDGE-025 | BDD — offline-catalog-distribution.feature + device-revocation-and-security.feature step definitions | P8 | INTACT |
| EDGE-026 | Hardening — idempotency guards + Resilience4j circuit breakers (PAT/ACS/HIST, SPEC-05/SPEC-10) | P9 | INTACT |
| EDGE-027 | Domain — `DetectionState` enum + extend `EdgeDevice` with detection-state fields + extend heartbeat DTOs (ADR-005) | P2 | INTACT |
| EDGE-028 | Application — extend `RecordHeartbeatUseCase` for detection-state persistence and lapse resolution on RUNNING (ADR-005) | P2 | INTACT |
| EDGE-029 | Domain — `EdgeDetectionLapse` aggregate + `EdgeDetectionLapseRepositoryPort` + `LapseCause` enum (ADR-005, INV-EDGE-10) | P3 | INTACT |
| EDGE-030 | Flyway V0032 — detection-state columns on `edge_device` + `edge_detection_lapse` table (ADR-005, SPEC-04) | P3 | INTACT |
| EDGE-031 | Infrastructure — `EdgeDetectionLapseJpaEntity` + adapter + detection-state columns on `EdgeDeviceJpaEntity` (ADR-005) | P3 | INTACT |
| EDGE-032 | Infrastructure — `EvntLapseClient` Feign adapter (G6 lapse raise/resolve, service-client token, Idempotency-Key, Resilience4j, never-drop) | P4 | INTACT |
| EDGE-033 | Application — `EvaluateDetectionLapseScheduler` + `RaiseDetectionLapseUseCase` + `ResolveDetectionLapseUseCase` (ADR-005, lapse sweep, HIST audit) | P6 | INTACT |
| EDGE-034 | BDD — `DetectionLapseSteps.java` (PendingException stubs only, no duplicate patterns) + feature copy to `src/test/resources/features/` | P8 | INTACT |
| EDGE-035 | Durable audit retry for access-ending + detection-lapse facts (HIST ADR-005) | P9 | INTACT |

## Integration issues (INT-EDGE-001..INT-EDGE-009)

| Issue | Title | Priority | Status |
|---|---|---|---|
| INT-EDGE-001 | EVNT — confirm gesture-report authority string in edge.device token (G5, EVNT not yet architected) | P2 | INTACT |
| INT-EDGE-002 | ACS — confirm service-client token minting path for edge-service principal (G2 TODO[architect]) | P4 | INTACT |
| INT-EDGE-003 | HIST — confirm hard-502-vs-enqueue failure policy for EDGE audit write path (TODO[architect]) | P4 | INTACT |
| INT-EDGE-004 | MIG — register Flyway range V0030-V0032 in MIG service docs | P3 | INTACT |
| INT-EDGE-005 | G-EDGE-2 — FE device-version field gap: BE contract has no version field (open decision) | P2 | INTACT |
| INT-EDGE-006 | EVNT — expose `POST /evnt/detection-lapses` and `POST /evnt/detection-lapses/{lapseId}/resolution` (G6, SAFETY-GEST-1) | P4 | INTACT |
| INT-EDGE-007 | ACS — provision edge-service service-client token with EVNT lapse authority (`evnt.detection-lapse.raise`/`resolve`, G6) | P4 | INTACT |
| INT-EDGE-008 | MIG — register Flyway V0032 in MIG service docs (additive reservation consumed by ADR-005) | P3 | INTACT |
| INT-EDGE-009 | HIST audit: base URL + /hist path + hist.audit.record token | P4 | INTACT |

## By SPEC

| SPEC | Issues |
|---|---|
| SPEC-01 (api surface) | EDGE-001, EDGE-005, EDGE-010, EDGE-018, EDGE-019, EDGE-021 |
| SPEC-02 (device lifecycle, liveness) | EDGE-002, EDGE-006, EDGE-007, EDGE-008, EDGE-009, EDGE-010, EDGE-022, EDGE-027, EDGE-028, EDGE-029, EDGE-033 |
| SPEC-03 (offline catalog distribution, ADR-004) | EDGE-003, EDGE-015, EDGE-018, EDGE-025 |
| SPEC-04 (data model, migrations) | EDGE-002, EDGE-003, EDGE-011, EDGE-012, EDGE-013, EDGE-014, EDGE-030, EDGE-031, INT-EDGE-004, INT-EDGE-008 |
| SPEC-05 (idempotency, concurrency) | EDGE-007, EDGE-008, EDGE-009, EDGE-013, EDGE-022, EDGE-026, EDGE-028, EDGE-029, EDGE-033 |
| SPEC-06 (security, token issuance, INV-EDGE-7) | EDGE-004, EDGE-005, EDGE-016, EDGE-019, EDGE-020, EDGE-021, EDGE-025 |
| SPEC-07 (observability, health) | EDGE-023 |
| SPEC-08 (BDD) | EDGE-024, EDGE-025, EDGE-034 |
| SPEC-10 (integrations) | EDGE-015, EDGE-016, EDGE-017, EDGE-026, EDGE-032, EDGE-035, INT-EDGE-001, INT-EDGE-002, INT-EDGE-003, INT-EDGE-006, INT-EDGE-007, INT-EDGE-009 |
| ADR-005 (detection state + lapse alert) | EDGE-027, EDGE-028, EDGE-029, EDGE-030, EDGE-031, EDGE-032, EDGE-033, EDGE-034, INT-EDGE-006, INT-EDGE-007, INT-EDGE-008 |

## By priority

| Priority | Issues |
|---|---|
| P1 | EDGE-001, EDGE-002, EDGE-003, EDGE-004, EDGE-005 |
| P2 | EDGE-006, EDGE-007, EDGE-008, EDGE-009, EDGE-010, EDGE-027, EDGE-028, INT-EDGE-001, INT-EDGE-005 |
| P3 | EDGE-011, EDGE-012, EDGE-013, EDGE-014, EDGE-029, EDGE-030, EDGE-031, INT-EDGE-004, INT-EDGE-008 |
| P4 | EDGE-015, EDGE-016, EDGE-017, EDGE-018, EDGE-032, INT-EDGE-002, INT-EDGE-003, INT-EDGE-006, INT-EDGE-007, INT-EDGE-009 |
| P5 | EDGE-019, EDGE-020, EDGE-021 |
| P6 | EDGE-022, EDGE-033 |
| P7 | EDGE-023 |
| P8 | EDGE-024, EDGE-025, EDGE-034 |
| P9 | EDGE-026, EDGE-035 |

## By module layer

| Layer | Issues |
|---|---|
| `domain` | EDGE-002, EDGE-003, EDGE-004, EDGE-027, EDGE-029 |
| `application` | EDGE-006, EDGE-007, EDGE-008, EDGE-009, EDGE-010, EDGE-018, EDGE-022, EDGE-028, EDGE-033 |
| `api` | EDGE-005, EDGE-010, EDGE-019, EDGE-020, EDGE-021 |
| `infrastructure/persistence` | EDGE-011, EDGE-012, EDGE-013, EDGE-014, EDGE-030, EDGE-031 |
| `infrastructure/auth` | EDGE-016, EDGE-019, EDGE-020, EDGE-021, EDGE-026 |
| `infrastructure/audit` | EDGE-017, EDGE-035 |
| `infrastructure/pat` | EDGE-015 |
| `infrastructure/evnt` | EDGE-032 |
| `infrastructure/metrics` | EDGE-023 |
| `infrastructure/logging` | EDGE-023 |
| scaffold/cross-cutting | EDGE-001 |
| BDD | EDGE-024, EDGE-025, EDGE-034 |
| integration / cross-module | INT-EDGE-001, INT-EDGE-002, INT-EDGE-003, INT-EDGE-004, INT-EDGE-005, INT-EDGE-006, INT-EDGE-007, INT-EDGE-008, INT-EDGE-009 |
