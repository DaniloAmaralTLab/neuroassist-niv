# Issues Map -- issues

| Issue | Title | Kind | Priority | Status |
|---|---|---|---|---|
| ACS-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | BE | P1 | INTACT |
| ACS-002 | Domain model — Caregiver, PatientSession, Tenant, JwtBlacklist aggregates (pure POJOs, no JPA/Spring) | BE | P1 | INTACT |
| ACS-003 | Domain ports — 7 outbound port interfaces (Repository, TokenIssuer, TokenBlacklist, HistAudit) | BE | P1 | INTACT |
| ACS-004 | API layer — 5 controllers with base path /acs, @PreAuthorize from RoleAuthorityPolicy (INV-7) | BE | P1 | INTACT |
| ACS-005 | RoleAuthorityPolicy (single source, INV-7) + request/response DTOs + ProblemDetail error model | BE | P1 | INTACT |
| ACS-006 | AuthService — authenticate (login -> tenant resolution INV-6 -> credential verify -> JWT issuance) | BE | P2 | INTACT |
| ACS-007 | AuthService — introspect (blacklist-aware validation) + JWKS endpoint service | BE | P2 | INTACT |
| ACS-008 | PatientSessionService — provision (anchor PatientSessionProvisioned, INV-2, INV-3, audit to HIST) | BE | P2 | INTACT |
| ACS-009 | PatientSessionService — revoke (immediate blacklist in same transaction, INV-4, audit to HIST with retry fallback) | BE | P2 | INTACT |
| ACS-010 | CaregiverService — register (INV-6 username uniqueness, tenant-scoped INV-1) + deactivate (soft) | BE | P2 | INTACT |
| ACS-011 | PatientLinkService — link (idempotent 409) + unlink + listLinks | BE | P2 | INTACT |
| ACS-012 | TenantService — onboard (platform-ops only INV-5, global schema row + trigger MIG schema provisioning) | BE | P2 | INTACT |
| ACS-013 | JPA entities — 6 entities (global: Tenant, CaregiverIdentityLookup, JwtBlacklist; tenant: Caregiver, CaregiverPatientLink, PatientSession) | BE | P3 | INTACT |
| ACS-014 | Spring Data JPA repositories + repository adapters (6 adapters, findById-before-save for Persistable<UUID>) | BE | P3 | INTACT |
| ACS-015 | Flyway migrations — V0010__acs_global_init.sql (global) + V0011__acs_tenant_init.sql (per-tenant template) | BE | P3 | INTACT |
| ACS-016 | HistClient Feign client + HistAuditPortAdapter (timeout 2s, circuit breaker for grant, retry queue for access-ending) | BE | P4 | INTACT |
| ACS-017 | SecurityConfig — JWT resource server + @EnableMethodSecurity + JwtGrantedAuthoritiesConverter (permissions claim, no SCOPE_ prefix) + TenantContextFilter inside SecurityFilterChain | BE | P5 | INTACT |
| ACS-018 | TokenIssuer adapter — JWT minting with JWK signing key (caregiver + patient-session tokens, no expiry for sessions INV-3) | BE | P5 | INTACT |
| ACS-019 | TokenBlacklist adapter — blacklist write (revoke) + check (JWT filter) + CorrelationIdFilter (servlet-only, no duplicate MVC interceptor) | BE | P5 | INTACT |
| ACS-020 | GlobalExceptionHandler — ResponseEntity<ProblemDetail> for all handlers + explicit AccessDeniedException re-throw (avoid 403->500 drift) | BE | P7 | INTACT |
| ACS-021 | Actuator + custom health indicators (PostgreSQL, HIST endpoint) with @ConditionalOnProperty in test profile | BE | P7 | INTACT |
| ACS-022 | MDC correlation + structured logging (CorrelationIdFilter only — no duplicate MVC interceptor, single servlet filter at HIGHEST_PRECEDENCE) | BE | P7 | INTACT |
| ACS-023 | BDD scaffold — CucumberSpringContext + CucumberIT (integrationTest scope) + AcsStepDefs (46 scenarios from SPEC-08) | BE | P8 | INTACT |
| ACS-024 | Async retry queue for access-ending HIST audit failures (SEC-001 — revocation + deactivation never blocked by audit outage) | BE | P9 | INTACT |
| ACS-025 | ArchUnit tests RULE-01..08 hexagonal enforcement (domain free of Spring/JPA, @Transactional in application only) | BE | P9 | INTACT |
| PAT-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | BE | P1 | INTACT |
| PAT-002 | Domain layer — Patient aggregate (entity, value objects, invariants INV-PAT-1/2) | BE | P1 | INTACT |
| PAT-003 | Domain layer — Command entity (CalibrationWindow, GestureComposition, invariants INV-PAT-3/4/5) | BE | P1 | INTACT |
| PAT-004 | Domain layer — GestureType aggregate (global vocabulary, INV-PAT-6, append-only) | BE | P1 | INTACT |
| PAT-005 | API layer — PatientController + DTOs (register, list, get, deactivate, activate) | BE | P1 | INTACT |
| PAT-006 | Application layer — RegisterPatient use case (+ PatientRegistered audit to HIST) | BE | P2 | INTACT |
| PAT-007 | Application layer — CreateCommand use case (validate window + gesture composition, CommandCalibrated anchor) | BE | P2 | INTACT |
| PAT-008 | Application layer — CalibrateCommand use case (re-validate, optimistic lock @Version, no-op no audit) | BE | P2 | INTACT |
| PAT-009 | Application layer — RetireCommand + DeactivatePatient + ReactivatePatient (idempotent, audit each action) | BE | P2 | INTACT |
| PAT-010 | API layer — CommandController + GestureTypeController + DTOs (all 13 endpoints, ETag/304 for catalog reads) | BE | P2 | INTACT |
| PAT-011 | Infrastructure — JPA entities Patient + Command + repositories (schema-per-tenant routing) | BE | P3 | INTACT |
| PAT-012 | Infrastructure — GestureType JPA entity + global schema routing (neuroassist_global) | BE | P3 | INTACT |
| PAT-013 | Flyway migration scripts V0020-V0022 (global gesture_type + seed; per-tenant patient + command; Flyway disabled at runtime) | BE | P3 | INTACT |
| PAT-014 | Infrastructure — ACS integration adapter (TokenValidationPort — JWKS cache + AcsIntrospectionPort — revocation check) | BE | P4 | INTACT |
| PAT-015 | Infrastructure — HistAuditPort adapter (sync REST POST /audit, 502 on failure in prod, log-only in dev) | BE | P4 | INTACT |
| PAT-016 | Cross-cutting — TenantContextHolder + schema-per-tenant DataSource routing (JWT tenantId claim) | BE | P4 | INTACT |
| PAT-017 | Security — RoleAuthorityPolicy (single source of truth) + Spring Security resource server config (JWKS-backed) | BE | P5 | INTACT |
| PAT-018 | Security — patient-session token rejection 403 (INV-PAT-7) + cross-tenant 404 guard (INV-PAT-1/2) | BE | P5 | INTACT |
| PAT-019 | Observability — Actuator health/readiness + Micrometer metrics (pat_command_calibrated_total, pat_catalog_read_total, audit failure counter) | BE | P7 | INTACT |
| PAT-020 | Observability — X-Correlation-Id propagation + structured logging (PHI minimization: no label content in logs) | BE | P7 | INTACT |
| PAT-021 | BDD setup — EmbeddedPostgres + Cucumber wiring (application-test.yml, step-definition base) | BE | P8 | INTACT |
| PAT-022 | BDD — patient-registration.feature step definitions (SPEC-01/02, INV-PAT-1/2/7) | BE | P8 | INTACT |
| PAT-023 | BDD — command-calibration.feature step definitions (SPEC-02, INV-PAT-3/4/5) | BE | P8 | INTACT |
| PAT-024 | BDD — catalog-distribution-and-authority.feature step definitions (SPEC-03/06, ADR-004, INV-PAT-6/7) | BE | P8 | INTACT |
| PAT-025 | Hardening — ACS JWKS cache + introspection Resilience4j circuit breaker + graceful fallback | BE | P9 | INTACT |
| EDGE-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | BE | P1 | INTACT |
| EDGE-002 | Domain — EdgeDevice aggregate (lifecycle state machine, invariants INV-EDGE-1/4/6) | BE | P1 | INTACT |
| EDGE-003 | Domain — DevicePairingCode + EdgeCredentialRevocation + CachedCatalog value objects and ports | BE | P1 | INTACT |
| EDGE-004 | RoleAuthorityPolicy — single source of authority constants (D-535, INV-EDGE-7) | BE | P1 | INTACT |
| EDGE-005 | API — DeviceManagementController + all device DTOs (8 endpoints: enroll/list/get/activate/pair/deactivate/unpair/revoke) | BE | P1 | INTACT |
| EDGE-006 | Application — EnrollDevice use case (DeviceEnrolled audit to HIST, pairing code minting, INV-EDGE-3) | BE | P2 | INTACT |
| EDGE-007 | Application — PairDevice use case (compare-and-set claim, credential minting, DevicePaired anchor, INV-EDGE-3) | BE | P2 | INTACT |
| EDGE-008 | Application — DeactivateDevice + ReactivateDevice use cases (reversible lifecycle, G3, INV-EDGE-6) | BE | P2 | INTACT |
| EDGE-009 | Application — UnpairDevice + RevokeDevice use cases (terminal states, revocation list, INV-EDGE-6) | BE | P2 | INTACT |
| EDGE-010 | API — HeartbeatController + RecordHeartbeat use case (record, token refresh G1, DeviceCameOnline) | BE | P2 | INTACT |
| EDGE-011 | Flyway V0030__edge_global_init.sql — global schema: device_pairing_code + pgcrypto | BE | P3 | INTACT |
| EDGE-012 | Flyway V0031__edge_tenant_init.sql — tenant schema: edge_device + edge_credential_revocation + cached_catalog | BE | P3 | INTACT |
| EDGE-013 | Infrastructure — EdgeDevice + DevicePairingCode JPA entities and adapters (schema-per-tenant routing) | BE | P3 | INTACT |
| EDGE-014 | Infrastructure — EdgeCredentialRevocation + CachedCatalog JPA entities and adapters | BE | P3 | INTACT |
| EDGE-015 | Infrastructure — PatClient Feign adapter (GET /pat/patients/{id}/commands + gesture-types, ETag/304, WireMock stubs) | BE | P4 | INTACT |
| EDGE-016 | Infrastructure — AcsClient Feign adapter (JWKS cache + introspect + service-client token, G1/G2) | BE | P4 | INTACT |
| EDGE-017 | Infrastructure — HistClient Feign adapter (audit sink POST /audit, 502 failure path in prod) | BE | P4 | INTACT |
| EDGE-018 | Application — RefreshCatalog use case + CatalogController (GET /edge/catalog, ETag/304, stale, INV-EDGE-5) | BE | P4 | INTACT |
| EDGE-019 | Security — SecurityConfig (ACS JWKS resource server + TenantContextFilter inside SecurityFilterChain, Risk R5) | BE | P5 | INTACT |
| EDGE-020 | Security — EdgeDeviceTokenSignerPort + issuer adapter (mint edge.device JWT, sign, publish JWKS, G1) | BE | P5 | INTACT |
| EDGE-021 | Security — DeviceTokenIntrospectController + RevocationStore adapter (POST /device-tokens/introspect, INV-EDGE-6) | BE | P5 | INTACT |
| EDGE-022 | Application — EvaluateLiveness watchdog (@Scheduled, transition-only audit, SPEC-05) | BE | P6 | INTACT |
| EDGE-023 | Observability — Actuator health (offline-first INV-EDGE-5, PAT/ACS as readiness details) + Micrometer metrics + X-Correlation-Id propagation | BE | P7 | INTACT |
| EDGE-024 | BDD setup — EmbeddedPostgres + Cucumber wiring + step-definition base (all 4 features, 32 scenarios) | BE | P8 | INTACT |
| EDGE-025 | BDD — offline-catalog-distribution.feature + device-revocation-and-security.feature step definitions | BE | P8 | INTACT |
| EDGE-026 | Hardening — idempotency guards (compare-and-set pair, watchdog transition guard, re-revoke/deactivate/unpair, Resilience4j on PAT/ACS/HIST, SPEC-05/SPEC-10) | BE | P9 | INTACT |
| INT-EDGE-001 | EVNT — confirm gesture-report authority string in edge.device token (G5 TODO[architect], EVNT not yet architected) | BE | P2 | INTACT |
| INT-EDGE-002 | ACS — confirm service-client token minting path for edge-service principal (G2 TODO[architect], client-credentials vs provisioned principal) | BE | P4 | INTACT |
| INT-EDGE-003 | HIST — confirm hard-502-vs-enqueue failure policy for EDGE audit write path (TODO[architect]) | BE | P4 | INTACT |
| INT-EDGE-004 | MIG — register Flyway range V0030-V0032 in MIG service docs (data-model.md §5 reserved block) | BE | P3 | INTACT |
| INT-EDGE-005 | G-EDGE-2 — FE device-version field gap: FE displays device version but BE api-contract has no version field (open decision: add to data-model or drop from FE) | BE | P2 | INTACT |
| EVNT-001 | Create evnt-service hexagonal package skeleton and Gradle module | BE | P1 | INTACT |
| EVNT-002 | Define Event domain aggregate with Urgency and Feedback enums and invariants | BE | P1 | INTACT |
| EVNT-003 | Implement GestureReportController — POST /evnt/gesture-reports (edge.device path, authority evnt.event.ingest) | BE | P2 | INTACT |
| EVNT-004 | Implement IngestGestureReportUseCase — PAT command snapshot, Event persist, idempotent replay 200, EventGenerated HIST audit | BE | P2 | INTACT |
| EVNT-005 | Implement ConfirmAlarmUseCase — idempotent confirmation, AlarmConfirmed HIST audit, 409 on routine event | BE | P2 | INTACT |
| EVNT-006 | Implement RecordFeedbackUseCase — feedback verdict transition, idempotent same-verdict, FeedbackRecorded HIST audit | BE | P2 | INTACT |
| EVNT-007 | Create Flyway migration scripts V0040–V0044 (extensions, event, push_subscription, escalation_attempt, reserved guard) | BE | P3 | INTACT |
| EVNT-008 | Implement Event JPA entity and EventJpaRepositoryAdapter (partial index ix_event_active_alarm, uq_event_device_report) | BE | P3 | INTACT |
| EVNT-009 | Implement PushSubscription JPA entity and PushSubscriptionRepositoryAdapter (uq endpoint, revoked_at 410 path) | BE | P3 | INTACT |
| EVNT-010 | Implement EscalationAttempt JPA entity and EscalationAttemptRepositoryAdapter (uq_escalation_tier idempotency guard, FK to event) | BE | P3 | INTACT |
| EVNT-011 | Implement EdgeTokenValidatorAdapter — EDGE JWKS cache + introspection for edge.device token verification (INV-EVNT-6) | BE | P4 | INTACT |
| EVNT-012 | Implement PatCommandFeignClient — GET /pat/commands/{id}, service-client token (pat.command.read), fail-closed on PAT unavailability | BE | P4 | INTACT |
| EVNT-013 | Implement AcsClient — caregiver JWKS + introspect + GET caregivers/{id}/links, ACS-link scoping guard (INV-EVNT-7) | BE | P4 | INTACT |
| EVNT-014 | Implement HistAuditFeignClient — POST /audit with service-client token, EventGenerated / AlarmConfirmed / FeedbackRecorded / EscalationAttempted envelopes | BE | P4 | INTACT |
| EVNT-015 | Configure Spring Security dual-resource-server (EDGE + ACS JWKS), authority map, TenantContextHolder for schema-per-tenant routing | BE | P5 | INTACT |
| EVNT-016 | Implement EscalationPolicy domain service — ESC-1..7 tier ladder, due-time computation, idempotency check | BE | P6 | INTACT |
| EVNT-017 | Implement EscalationSweep @Scheduled job — sweep unconfirmed emergencies, resolve caregivers, invoke EmergencyNotificationPort, persist escalation_attempt, audit EscalationAttempted | BE | P6 | INTACT |
| EVNT-018 | Implement EmergencyNotificationPort + WebPushAdapter (VAPID, push_subscription rows, 410 → revoked_at, ESC-6 retry) | BE | P6 | INTACT |
| EVNT-019 | Implement AwsSmsAdapter — AWS End User Messaging SMS (EVNT_ESCALATION_SMS_ENABLED=false default, ESC-5 advance-on-failure, ESC-6 retry) | BE | P6 | INTACT |
| EVNT-020 | Implement AwsVoiceAdapter — AWS End User Messaging Voice (EVNT_ESCALATION_VOICE_ENABLED=false default, ESC-5 advance-on-failure, ESC-6 retry) | BE | P6 | INTACT |
| EVNT-021 | Configure escalation environment variables and VAPID key-pair setup (EVNT_ESCALATION_* timing, EVNT_WEBPUSH_VAPID_* keys, channel enable/disable flags) | BE | P6 | INTACT |
| EVNT-022 | Implement PatientEventController and EventController read surface — GET active-alarm, list events, get event by id, GET escalation-attempts (ACS link scoping INV-EVNT-7) | BE | P7 | INTACT |
| EVNT-023 | Implement PushSubscriptionController — POST /evnt/push-subscriptions and DELETE /evnt/push-subscriptions/{subscriptionId} | BE | P7 | INTACT |
| EVNT-024 | Configure health endpoint (GET /evnt/health), Actuator readiness (DB only), structured MDC logging (tenantId, correlationId), Micrometer escalation metrics | BE | P8 | INTACT |
| EVNT-025 | BDD Cucumber features: gesture-report ingest (EventGenerated, idempotent replay, PAT-unavailable fail-closed, EDGE-token validation) | BE | P9 | INTACT |
| EVNT-026 | BDD Cucumber features: alarm confirmation, feedback recording, escalation trail read and push-subscription lifecycle | BE | P9 | INTACT |
| EVNT-027 | BDD Cucumber features: out-of-band escalation tier ladder (ESC-4 idempotency, ESC-5 advance-on-failure, ESC-1 stop-on-confirm, EscalationAttempted HIST audit) | BE | P9 | INTACT |
| GEST-001 | Gradle module scaffold and Spring Boot entry point for gest-service | BE | P1 | INTACT |
| GEST-002 | EngineController — GET /gest/engines and GET /gest/engines/{version} | BE | P1 | INTACT |
| GEST-003 | CapabilityController — GET /gest/capabilities and GET /gest/capabilities/{id} | BE | P1 | INTACT |
| GEST-004 | SupportCheckController — POST /gest/capabilities/support-check | BE | P1 | INTACT |
| GEST-005 | DTOs and mappers for engine-version and capability surfaces | BE | P1 | INTACT |
| GEST-006 | EngineVersion domain aggregate and EngineStatus enum | BE | P2 | INTACT |
| GEST-007 | EngineCapability domain aggregate and SupportStatus enum | BE | P2 | INTACT |
| GEST-008 | EngineVersionService — register engine version with HIST audit EngineVersionRegistered | BE | P2 | INTACT |
| GEST-009 | EngineVersionService — deprecate engine version with idempotency and HIST audit EngineVersionDeprecated | BE | P2 | INTACT |
| GEST-010 | CapabilityService — declare capability (upsert + PAT vocabulary validation + HIST audit EngineCapabilityDeclared) | BE | P2 | INTACT |
| GEST-011 | CapabilityService — retire capability and checkSupport resolution with ETag generation | BE | P2 | INTACT |
| GEST-012 | Flyway migrations V0050__create_engine_version.sql and V0051__create_engine_capability.sql on global schema neuroassist_global | BE | P3 | INTACT |
| GEST-013 | EngineVersionJpaEntity and EngineVersionRepositoryAdapter (global schema, Spring Data JPA) | BE | P3 | INTACT |
| GEST-014 | EngineCapabilityJpaEntity and EngineCapabilityRepositoryAdapter (global schema, upsert on unique pair) | BE | P3 | INTACT |
| GEST-015 | GestureVocabularyPort and PatGestureTypeClient Feign adapter (PAT vocabulary validation, fail-closed INV-GEST-1) | BE | P4 | INTACT |
| GEST-016 | AcsIntrospectionPort and AcsClient Feign adapter (revocation check on write paths only) | BE | P4 | INTACT |
| GEST-017 | HistAuditPort and HistAuditClient Feign adapter (fail-closed audit with shared audit envelope) | BE | P4 | INTACT |
| GEST-018 | SecurityConfig — OAuth2 resource server, JWKS validation, and RoleAuthorityPolicy constants (D-535) | BE | P5 | INTACT |
| GEST-019 | Write-path authority guard — @PreAuthorize per RoleAuthorityPolicy and 403 on read-only token (INV-GEST-5) | BE | P5 | INTACT |
| GEST-020 | Actuator /health with DB and ACS-JWKS readiness probes and X-Correlation-Id MDC propagation | BE | P7 | INTACT |
| GEST-021 | Custom Micrometer metrics — declare/retire counts, support-check request rate, 304 cache-hit ratio, PAT/HIST failure counters | BE | P7 | INTACT |
| GEST-022 | BDD feature engine-capability-registry — declare/retire/deprecate/authority (INV-GEST-2, INV-GEST-5, INV-GEST-6) | BE | P8 | INTACT |
| GEST-023 | BDD feature support-check-detectable-gate — detectable flag, ETag/304, no-PAT call (INV-GEST-7, INV-GEST-4) | BE | P8 | INTACT |
| GEST-024 | BDD feature capability-declare-validation — PAT fail-closed, uniqueness, global invariants (INV-GEST-1, INV-GEST-2, INV-GEST-3) | BE | P8 | INTACT |
| GEST-025 | ETag If-None-Match 304 handling and Feign circuit-breaker retry with Retry-After on 503 for PAT/HIST/ACS | BE | P9 | INTACT |
| EVNT-028 | Flyway V0044 — detection_lapse table (data-model §2.4, SAFETY-GEST-1) | BE | P3 | INTACT |
| EVNT-029 | Flyway V0045 + V0046 — escalation_attempt generalisation for detection-lapse (data-model §2.3.1, ADR-006) | BE | P3 | INTACT |
| EVNT-030 | DetectionLapseService — raise endpoint POST /evnt/detection-lapses with idempotency (SPEC-12 LAPSE-1/LAPSE-2, api-contract §10.1) | BE | P2 | INTACT |
| EVNT-031 | DetectionLapseService — resolve endpoint POST /evnt/detection-lapses/{lapseId}/resolution with 404 guard (SPEC-12 LAPSE-5, api-contract §10.2) | BE | P2 | INTACT |
| EVNT-032 | DetectionLapseService — acknowledge endpoint POST /evnt/detection-lapses/{lapseId}/confirmation (SPEC-12 LAPSE-5, api-contract §12.1) | BE | P2 | INTACT |
| EVNT-033 | PatientDetectionLapseService — list detection lapses GET /evnt/patients/{patientId}/detection-lapses (SPEC-12 LAPSE-3, api-contract §11.1) | BE | P2 | INTACT |
| EVNT-034 | EscalationSweep/EscalationPolicy — extend over detection_lapse subject including emergency precedence (SPEC-12 LAPSE-4/LAPSE-5/LAPSE-6) | BE | P2 | INTACT |
| EVNT-035 | HIST audit facts for detection-lapse: DetectionLapseRaised/Resolved/Acknowledged + EscalationAttempted subjectType (SPEC-12 LAPSE-7/ESC-7) | BE | P7 | INTACT |
| EVNT-036 | BDD — detection-lapse-alerting.feature copy + DetectionLapseAlertingSteps.java stubs, 28 new step patterns (SPEC-12 LAPSE-1..LAPSE-7) | BE | P8 | INTACT |
| ACS-026 | Extend durable audit retry to CaregiverAuthenticated + PatientUnlinked (HIST ADR-005) | BE | P9 | INTACT |
| PAT-026 | Durable audit retry for PatientDeactivated (HIST ADR-005 commit+durable-retry) | BE | P9 | INTACT |
| EDGE-035 | Durable audit retry for access-ending + detection-lapse facts (HIST ADR-005) | BE | P9 | INTACT |
| EVNT-037 | Durable audit retry for the safety-runtime facts (HIST ADR-005) | BE | P9 | INTACT |
| EVNT-038 | HIST audit payload: commandLabel on EventGenerated + masked maskedTarget on EscalationAttempted (G-HIST-1 / G-HIST-3) | BE | P9 | INTACT |
| INT-ACS-006 | HIST audit: base URL + /hist path + hist.audit.record token | BE | P4 | INTACT |
| INT-PAT-006 | HIST audit: base URL + /hist path + hist.audit.record token | BE | P4 | INTACT |
| INT-EDGE-009 | HIST audit: base URL + /hist path + hist.audit.record token | BE | P4 | INTACT |
| INT-EVNT-ACS-003 | HIST audit: base URL + /hist path + hist.audit.record token | BE | P4 | INTACT |
| INT-GEST-ACS-002 | HIST audit: base URL + /hist path + hist.audit.record token | BE | P4 | INTACT |
| HIST-001 | Hexagonal scaffold — package structure + build.gradle.kts with integrationTest split | BE | P1 | INTACT |
| HIST-002 | AuditController + request/response DTOs + POST /hist/audit API layer (authority hist.audit.record) | BE | P1 | INTACT |
| HIST-003 | EnvelopeReconciliationAdapter — GEST normalisation (divergences 1-7) + DetectionLapseResolved disambiguation by (source, subjectType) | BE | P1 | INTACT |
| HIST-004 | AppendAuditRecord use case — INV-HIST-2..5 validation, scope routing (tenant vs global ADR-004), unknown-action flagging (INV-HIST-4) | BE | P2 | INTACT |
| HIST-005 | AuditScopeRouter + AuditService facade — tenant-scoped vs global-schema routing; AuditService.record (ingest) entry point | BE | P2 | INTACT |
| HIST-006 | Flyway V0060-V0064 — audit_record (tenant), audit_subject_key (tenant), audit_record_global (global), audit_retention_policy (global), audit_source (global); reserved hash columns record_hash/prev_hash (ADR-002 Option B additive) | BE | P3 | INTACT |
| HIST-007 | Flyway V0065 — additive index ix_audit_record_patient_time (caregiver-timeline read + whole-period summary G-HIST-4) | BE | P3 | INTACT |
| HIST-008 | DB grants enforcement — INSERT/SELECT only on audit_record + audit_record_global; INSERT/SELECT/DELETE on audit_subject_key; revoke UPDATE/DELETE on audit tables (ADR-002, INV-HIST-1); MIG applies grants | BE | P3 | INTACT |
| HIST-009 | JPA entities AuditRecord + AuditRecordGlobal — INSERT-only adapters + schema-per-tenant routing via TenantContextHolder (no tenant_id column mapping, schema is the boundary) | BE | P3 | INTACT |
| HIST-010 | Idempotency key derivation — explicit idempotencyKey wins; composite fallback source|subject_type|subject_id|action|occurred_at (ADR-003 Option C); INSERT ON CONFLICT DO NOTHING → 201 new / 200 replay; concurrent-insert serialized by UNIQUE constraint | BE | P4 | INTACT |
| HIST-011 | SecurityConfig — OAuth2 resource-server + @EnableMethodSecurity + JwtGrantedAuthoritiesConverter (permissions claim, no SCOPE_ prefix) + TenantContextFilter inside SecurityFilterChain after BearerTokenAuthenticationFilter (Learning: security:tenant-filter:wrong-order) | BE | P5 | INTACT |
| HIST-012 | Service-client identity derivation (source from JWT principal when envelope omits it) + ACS link scoping for caregiver reads (caregiver linked to patientId within tenant, 403 on scope violation, same rule as EVNT PatientEventService) | BE | P5 | INTACT |
| HIST-013 | PatientHistoryService + QueryPatientHistory use case — keyset pagination (occurredAt desc, id desc), period/range resolution (today/week/month), 400 on partial from/to | BE | P6 | INTACT |
| HIST-014 | Structured entry projection G-HIST-1..5 — subjectId, relatedEventId (join key for event-subject entries), commandId/commandLabel/urgency (omit commandLabel when absent, never fabricate), server-side confirmation fold onto EventGenerated, channel + masked maskedTarget on EscalationAttempted, enumerated outcome per kind | BE | P6 | INTACT |
| HIST-015 | First-page period summary G-HIST-4 — whole-period aggregate (scope=period) via ix_audit_record_patient_time, per-kind counts + confirmed/unconfirmed/feedback-verdict folds; absent on cursor pages; inlined on first page (not a separate GET endpoint, decision ratified) | BE | P6 | INTACT |
| HIST-016 | Operator GET /hist/audit — AuditService.query with filters (correlationId, source, action, subjectType, subjectId, actorId, tenantId, from, to, flagged, cursor, size 1..200); authority hist.audit.read; cross-tenant operator path (ADR-004) | BE | P7 | INTACT |
| HIST-017 | SubjectErasureService + POST /hist/subjects/{subjectId}/erasure + AuditSubjectKey JPA entity — crypto-shred (delete key, retain audit row ADR-002); 202 new / 200 idempotent / 404 unknown subject; authority hist.erasure.create | BE | P8 | INTACT |
| HIST-018 | Retention policy table seeding — 6 fact classes (access-lifecycle, device-lifecycle, catalog-config, safety-runtime, engine-registry, authentication) with nullable periods; legal hold column; no automated sweep in MVP (ADR-006 Option C frame; periods TBD with counsel — owner TODO) | BE | P8 | INTACT |
| HIST-019 | Observability — Actuator /health (liveness) + /health/readiness (PostgreSQL check DOWN when unreachable); Micrometer counters hist.audit.appended{source,action,flagged} + hist.audit.replay + hist.audit.latency + hist.history.query.latency + hist.audit.rejected{reason}; structured logging (never log personal payload fields per ADR-006/LGPD); X-Correlation-Id generated when absent + echoed on every response | BE | P7 | INTACT |
| HIST-020 | BDD wire-up — CucumberSpringContext + CucumberIT (integrationTest scope, DRY-RUN until scaffold); do NOT add new step glue (5 step files already present: AuditIngestIdempotencySteps, AuditWriteFailurePolicySteps, CaregiverHistoryReadSteps, EnvelopeReconciliationAndPlacementSteps, SharedSteps — 80 patterns, 0 duplicates) | BE | P8 | INTACT |
| HIST-021 | Hardening — SLO >=99.9% HA readiness hints (K8s readiness probe, min-replicas comment); GlobalExceptionHandler (AccessDeniedException re-throw to avoid 403->500, handleMethodArgumentNotValid override not @ExceptionHandler, ProblemDetail RFC 7807 with correlationId); ArchUnit RULE-01..08 hexagonal enforcement; backlog alert contract for commit+durable-retry producers (16 facts, age/size threshold docs) | BE | P9 | INTACT |
| INT-HIST-001 | ACS must mint one service-client JWT per producer (acs-service, pat-service, edge-service, evnt-service, gest-service) with authority hist.audit.record; operator tokens must carry hist.audit.read + hist.erasure.create (ACS token-issuance amendment) | BE | P4 | INTACT |
| INT-HIST-002 | EVNT audit-payload amendment — commandLabel field on EventGenerated audit payload + maskedTarget (pre-masked, e.g. +55•••••1234) on EscalationAttempted audit payload; amendment being tracked in EVNT now; HIST passes both fields through verbatim, omits when absent (never fabricates — G-HIST-1/G-HIST-3); do NOT edit EVNT specs/contracts from this module | BE | P6 | INTACT |
| INT-HIST-003 | Producer base-URL config change (all 5 producers) — set HIST_BASE_URL / hist.base-url to include /hist (dev http://localhost:8083/hist; via REG lb://hist-service/hist); config-only, no producer code or contract change; verify POST {hist.baseUrl}/audit resolves to POST /hist/audit | BE | P5 | INTACT |
| INT-HIST-004 | Producer commit+durable-retry implementation (16 facts) — each producer implements local durable outbox (commit-first, enqueue on HIST failure, bounded retry with backoff, explicit idempotencyKey); HIST publishes the authoritative failure-policy classification closing 5 upstream TODO[architect] (ACS 4, PAT 1, EDGE 5, EVNT 6); dev profile log-only | BE | P5 | INTACT |
| INT-HIST-005 | MIG applies HIST Flyway V0060-V0069 — global schema (neuroassist_global): V0062 audit_record_global, V0063 audit_retention_policy, V0064 audit_source; tenant schema (all t_<tenantId>): V0060 audit_record, V0061 audit_subject_key, V0065 ix_audit_record_patient_time; new-tenant provisioning path includes audit tables | BE | P3 | INTACT |
| INT-HIST-006 | GEST documentation amendment (divergence #8) — GEST cites ADR-005, drops the best-effort note; GEST facts all resolve to hard-502 (fail-closed equivalent); HIST tolerates divergences 1-7 in ingest adapter with no GEST re-scaffold; amendment is doc-only | BE | P9 | INTACT |
| INT-HIST-007 | Retention periods — owner + legal counsel must set retention_days + lawful_basis_ref per fact class in audit_retention_policy (access-lifecycle, device-lifecycle, catalog-config, safety-runtime, engine-registry, authentication); open non-blocking item; no sweep ships until set (ADR-006 Option C; legal hold flag prevents premature automation) | BE | P9 | INTACT |
| CONV-001 | Hexagonal scaffold — Gradle module + four-layer package skeleton + application.yml | BE | P1 | INTACT |
| CONV-002 | RoleAuthorityPolicy — 6 conv.* authority constants + @EnableMethodSecurity (D-642, SPEC-06) | BE | P1 | INTACT |
| CONV-003 | GET /conv/health — public liveness/readiness endpoint (Actuator, SPEC-07) | BE | P1 | INTACT |
| CONV-004 | Domain aggregates — PublishedTree root + TreeVersion + Category + Phrase + AudioAsset + UsageSignal (pure POJOs, INV-CONV-1/2) | BE | P2 | INTACT |
| CONV-005 | Domain ports — 6 outbound port interfaces (PublishedTreeRepositoryPort, AudioAssetPort, SearchPort, PatientReferencePort, AuditPort, UsagePort) | BE | P2 | INTACT |
| CONV-006 | TreeService.publish() — POST /conv/trees: create immutable TreeVersion, supersede previous, contentHash/ETag, hard-502 HIST, idempotency (SPEC-02, SPEC-05) | BE | P2 | INTACT |
| CONV-007 | TreeService.read() — GET /conv/tree: resolve active version, serialize tree + audioManifest, strong ETag, 304 conditional (SPEC-02, SPEC-03) | BE | P2 | INTACT |
| CONV-008 | Flyway V0070–V0076 — CONV schema: extensions (pgcrypto+pg_trgm) + 6 tenant tables (data-model.md §2–§4) | BE | P3 | INTACT |
| CONV-009 | Flyway V0077 — IAM seed: 6 conv.* authorities in neuroassist_global + modelo_acesso_versao bump (D-639, SPEC-06) | BE | P3 | INTACT |
| CONV-010 | JPA entities — 6 entities (PublishedTreeEntity, TreeVersionEntity, CategoryEntity, PhraseEntity, AudioAssetEntity, UsageSignalEntity) with schema-per-tenant, Persistable<UUID> | BE | P3 | INTACT |
| CONV-011 | Repository adapters — Spring Data JPA repos + adapters for all 6 entities (TenantContextHolder.require() as first line of every application service) | BE | P3 | INTACT |
| CONV-012 | AudioAssetPort adapter — serve pre-synthesized clip bytes from blob storage + crypto-shred on erasure (ADR-005/ADR-006) | BE | P4 | INTACT |
| CONV-013 | GET /conv/audio/{assetId} + AudioService — stream clip with immutable cache headers, range support, 410 on erased (SPEC-02, ADR-003/ADR-005) | BE | P4 | INTACT |
| CONV-014 | PatClient Feign client — GET /pat/patients/{id} (pat.patient.read, service-client, ETag/304, PAT INV-PAT-7) | BE | P4 | INTACT |
| CONV-015 | HistClient Feign client + AuditPort adapter — hard-502 for TreePublished/Superseded, durable-retry dispatcher for TreeVersionWithdrawn/AudioAssetsErased (ADR-006, SPEC-10) | BE | P4 | INTACT |
| CONV-016 | OAuth2 resource server + SecurityConfig — ACS JWKS validation, patient-session + TRN service-client token split, @EnableMethodSecurity, public path /conv/health (D-642, SPEC-06) | BE | P5 | INTACT |
| CONV-017 | TenantContextFilter + TenantContextHolder — schema-per-tenant, registered after BearerTokenAuthenticationFilter (SPEC-06, RULE-04) | BE | P5 | INTACT |
| CONV-018 | TreeVersionService.retire() — POST /conv/tree-versions/{id}:retire: withdrawn transition + commit + durable-retry HIST audit + idempotency (SPEC-05, ADR-006) | BE | P6 | INTACT |
| CONV-019 | AudioService.delete() — DELETE /conv/patients/{id}/audio: crypto-shred + versions withdrawn + durable-retry AudioAssetsErased + 202 (SPEC-05, ADR-005/ADR-006) | BE | P6 | INTACT |
| CONV-020 | UsageService.record() — POST /conv/usage-signals: opt-in, no free text, idempotent, 202 Accepted, discard when opted-out (SPEC-05, INV-CONV-6) | BE | P6 | INTACT |
| CONV-021 | SearchPort adapter v1 — Postgres FTS + pg_trgm over phrase (caregiver/TRN-side only, NOT on patient station path, ADR-002, SPEC-10) | BE | P6 | INTACT |
| CONV-022 | CorrelationIdInterceptor + privacy log filter — echo X-Correlation-Id on responses + HIST calls, never log phrase text or voice_model_ref (SPEC-07, ADR-005/ADR-006) | BE | P7 | INTACT |
| CONV-023 | Actuator custom metrics — publish count, audit-502 failures, durable-retry queue depth/age, usage-signal accept/discard (SPEC-07) | BE | P7 | INTACT |
| CONV-024 | BDD scaffold — 5 feature files + SharedSteps + 5 per-feature step classes + CucumberSpringContext extending BaseIntegrationTest (SPEC-08, D-532) | BE | P8 | INTACT |
| CONV-025 | BDD scenarios implementation — full Gherkin coverage: tree-bundle-read (ETag/304/cold-patient), tree-publish (hard-502), tree-retire-and-erase (durable-retry), usage-signal (SPEC-08) | BE | P8 | INTACT |
| CONV-026 | Idempotency guard — publish/retire/erase/usage idempotency keys + one-active concurrency (row lock + partial unique index uq_tree_version_one_active, INV-CONV-2, SPEC-05) | BE | P9 | INTACT |
| CONV-027 | MethodSecurityEnforcementIT — 401/403 for every endpoint, wrong token class (patient-session on TRN path, TRN on station path), @PreAuthorize integration test (SPEC-06, D-642) | BE | P9 | INTACT |
| INT-CONV-001 | INT-CONV-1: First sync at provisioning — cold station fetches bundle while online before patient handover (EDGE/provisioning obligation, ADR-003, SPEC-10 §4) | BE | P4 | INTACT |
| INT-CONV-002 | INT-CONV-2: TRN publish service-client token — ACS must issue TRN service-client with conv.tree.publish, conv.tree-version.retire, conv.audio.delete (ACS INV-3, SPEC-10) | BE | P4 | INTACT |
| INT-CONV-003 | INT-CONV-3: ACS patient-session authority scope — restricted to conv.tree.read, conv.audio.read, conv.usage.record and gest.* only (ACS INV-3, SPEC-06) | BE | P4 | INTACT |
| INT-CONV-004 | INT-CONV-4: PAT registers CONV as pat.patient.read service-client — PAT must reject patient-session token on /pat (PAT INV-PAT-7, SPEC-10) | BE | P4 | INTACT |
| INT-CONV-005 | INT-CONV-5: TRN consent upstream — CONV assumes published version already consented at TRN authoring; no consent capture in CONV (ADR-005 G1/G2, SPEC-10) | BE | P5 | INTACT |
| REG-001 | Create Gradle subproject and Spring Boot bootstrap (RegistryApplication, @EnableEurekaServer) | BE | P1 | INTACT |
| REG-002 | Configure application.yml: single-node Eureka server, port 8761, dev profile defaults | BE | P1 | INTACT |
| REG-003 | Create application-prod.yml: self-preservation enabled, production lease tuning | BE | P2 | INTACT |
| REG-004 | Pin Spring Cloud Netflix Eureka Server version compatible with project Spring Boot 21 line | BE | P2 | INTACT |
| REG-005 | Restrict Eureka dashboard and protocol to internal network; verify no public route in GWY | BE | P3 | INTACT |
| REG-006 | Configure Actuator health, readiness, and liveness endpoints | BE | P4 | INTACT |
| REG-007 | Expose Prometheus metrics endpoint with Eureka registry metrics (apps, renewals/min, evictions, self-preservation state) | BE | P4 | INTACT |
| REG-008 | Implement structured lifecycle logging for registration, renewal, and eviction events to Elasticsearch | BE | P5 | INTACT |
| REG-009 | Implement BDD step definitions for service-registration.feature (registration, renewal, de-registration, idempotency) | BE | P6 | INTACT |
| REG-010 | Implement BDD step definitions for eviction-and-self-preservation.feature (dev eviction, prod self-preservation, renewal recovery) | BE | P6 | INTACT |
| REG-011 | Implement BDD step definitions for discovery-resolution.feature (lb:// resolution, UP-only filtering, scale-up without reconfiguration) | BE | P6 | INTACT |
| REG-012 | Create Dockerfile for neuroassist-niv-service-registry | BE | P7 | INTACT |
| REG-013 | Add neuroassist-niv-service-registry to docker-compose.yml and verify startup order | BE | P7 | INTACT |
| REG-014 | Verify runbook accuracy: startup, health check, dashboard access, and eviction verification commands | BE | P8 | INTACT |
| INT-REG-001 | Integration smoke test: all in-fleet services (ACS, PAT, EDGE, EVNT, CONV, GEST, HIST, TRN, GWY) register with REG on startup | BE | P5 | INTACT |
| INT-REG-002 | Integration test: GWY resolves downstream service routes via REG (Feign/LoadBalancer name resolution) | BE | P6 | INTACT |
| INT-REG-003 | Integration test: lifecycle log events (registration, renewal, eviction) are shipped to Elasticsearch | BE | P7 | INTACT |
| MIG-001 | Spring Boot non-web Gradle module scaffold for neuroassist-niv-migrations | BE | P1 | INTACT |
| MIG-002 | MigrationMode enum + fail-fast argument validation (SPEC-01) | BE | P1 | INTACT |
| MIG-003 | MigrationsJobRunner skeleton — CommandLineRunner entry point + exit code dispatch (SPEC-01) | BE | P1 | INTACT |
| MIG-004 | SchemaAdmin — CREATE EXTENSION and CREATE SCHEMA outside @Transactional (SPEC-02, INV-MIG-6) | BE | P2 | INTACT |
| MIG-005 | FlywayRunner — programmatic Flyway instance per schema (SPEC-02) | BE | P2 | INTACT |
| MIG-006 | MigrationsJobRunner orchestration: baseline → global pass → tenant pass (SPEC-02) | BE | P2 | INTACT |
| MIG-007 | Create V0001__extensions_and_global_schema.sql (baseline block, SPEC-04) | BE | P3 | INTACT |
| MIG-008 | Create V0002__uuid_generate_v7.sql — PL/pgSQL uuid_generate_v7() baseline function (SPEC-04) | BE | P3 | INTACT |
| MIG-009 | Create V0003__migration_range_registry.sql — registry DDL (SPEC-04, INV-MIG-2) | BE | P3 | INTACT |
| MIG-010 | Create V0004__seed_migration_range_registry.sql — seed all known module blocks (SPEC-04) | BE | P3 | INTACT |
| MIG-011 | Create V0005__tenant_template_baseline.sql — minimal tenant schema baseline (SPEC-04) | BE | P3 | INTACT |
| MIG-012 | Gradle aggregation task — collect per-service reserved-block scripts into db/migration/{global,tenant} (SPEC-10) | BE | P4 | INTACT |
| MIG-013 | TenantSchemaEnumerator — list t_* schemas from information_schema (SPEC-03) | BE | P4 | INTACT |
| MIG-014 | SchemaAdmin.createSchemaIfAbsent() — idempotent non-transactional CREATE SCHEMA (SPEC-03, INV-MIG-6) | BE | P4 | INTACT |
| MIG-015 | RangeRegistry guard — load migration_range_registry and assert no overlapping blocks before apply (SPEC-04, INV-MIG-2) | BE | P5 | INTACT |
| MIG-016 | Per-schema progress reporting + structured logs (SPEC-07) | BE | P7 | INTACT |
| MIG-017 | Testcontainers PostgreSQL infrastructure + BDD Cucumber wiring (SPEC-08) | BE | P8 | INTACT |
| MIG-018 | BDD — global-and-tenant-migration.feature (SPEC-02, SPEC-07) | BE | P8 | INTACT |
| MIG-019 | BDD — tenant-provisioning.feature (SPEC-03) | BE | P8 | INTACT |
| MIG-020 | BDD — forward-only-and-checksum.feature (SPEC-05, SPEC-07) | BE | P8 | INTACT |
| MIG-021 | BDD — range-registry-guard.feature (SPEC-04, INV-MIG-2) | BE | P8 | INTACT |
| MIG-022 | CI gate — assert spring.flyway.enabled=false in all business services + no flat V1 in MIG aggregation locations (SPEC-10, INV-MIG-7) | BE | P9 | INTACT |
| MIG-023 | Dockerfile + docker-compose init service with restart:no (SPEC-07, doc 06 R7) | BE | P9 | INTACT |
| MIG-024 | Runbook verification — validate setup-local.md commands against implemented runner | BE | P9 | INTACT |
| INT-MIG-001 | ACS — regenerate V1__create_initial_schema.sql into reserved block V0010-V0012 for MIG aggregation | BE | P3 | INTACT |
| INT-MIG-002 | PAT — regenerate V1__create_initial_schema.sql into reserved block V0020-V0022 for MIG aggregation | BE | P3 | INTACT |
| INT-MIG-003 | EDGE — regenerate V1__create_initial_schema.sql into reserved block V0030-V0032 for MIG aggregation | BE | P3 | INTACT |
| INT-MIG-004 | CONV — regenerate DDL scripts into reserved block V0070-V0079 for MIG aggregation | BE | P3 | INTACT |
| INT-MIG-005 | EVNT — confirm V0040-V0049 reserved block and deliver EVNT migration scripts for MIG aggregation | BE | P3 | INTACT |
| INT-MIG-006 | GEST — confirm V0050-V0059 reserved block and deliver GEST migration scripts for MIG aggregation | BE | P3 | INTACT |
| INT-MIG-007 | HIST — confirm V0060-V0069 reserved block and deliver HIST migration scripts for MIG aggregation | BE | P3 | INTACT |
| INT-MIG-008 | TRN — confirm V0080-V0089 reserved block and deliver TRN migration scripts for MIG aggregation | BE | P3 | INTACT |
| TRN-001 | Hexagonal scaffold — Gradle module + four-layer package skeleton + application.yml (Eureka client, EUREKA_URI default http://localhost:8761/eureka, Feign base-url neuroassist.pat/hist/conv.base-url; PAT 8082, HIST 8083, CONV 8085) | BE | P1 | INTACT |
| TRN-002 | RoleAuthorityPolicy — 12 trn.* authority constants + @EnableMethodSecurity(prePostEnabled=true) (D-642, SPEC-06) | BE | P1 | INTACT |
| TRN-003 | GET /trn/health — public liveness/readiness endpoint (Actuator, SPEC-07, D-642 public_paths) | BE | P1 | INTACT |
| TRN-004 | Domain aggregates — TrainingSession (root) + Proposal + Authorization VO (pure POJOs, invariants INV-TRN-1/2 state machine, SPEC-02) | BE | P2 | INTACT |
| TRN-005 | Domain ports + in-memory fakes — LlmDialogPort, TtsPort, SearchIndexPort, TreePublicationPort, PatientReferencePort, AuditPort + per-port in-memory fake adapter for tests | BE | P2 | INTACT |
| TRN-006 | SessionService — POST /trn/sessions + GET /trn/sessions/{id}: open session bound to patient, PatientReferencePort resolve (ETag/304), TrainingSessionStarted hard-502 audit (SPEC-01, SPEC-02) | BE | P2 | INTACT |
| TRN-007 | ProposalService dialog — POST /trn/sessions/{id}/dialog: LlmDialogPort minimised context (patientId + draft text + prompt only, INV-TRN-7), draft/proposed only, untrusted output containment, 503 graceful fallback (SPEC-01, SPEC-02, ADR-004) | BE | P2 | INTACT |
| TRN-008 | ProposalService lifecycle — GET + PATCH proposals, proposal state machine, POST /withdrawal + POST /rejection sub-resources, 409 proposal-state-locked on illegal transitions (SPEC-01, SPEC-02, ADR-003) | BE | P2 | INTACT |
| TRN-009 | DualAuthorizationService — caregiver-confirmation + patient-assent domain fact (§4.1/§4.2), distinct-actors guard (INV-TRN-1), 409 dual-authorization-same-actor, ProposalApproved hard-502 audit (SPEC-03, ADR-002) | BE | P2 | INTACT |
| TRN-010 | Flyway V0080–V0088 — 9 migration scripts: pgcrypto+pg_trgm extensions (global) + 8 tenant tables (training_session, proposal, authorization, consent_record, voice_model, voice_sample, audio_asset, publication, outbound_job) [data-model.md §2] | BE | P3 | INTACT |
| TRN-011 | Flyway V0089 — IAM seed: insert 12 trn.* authority rows in neuroassist_global + bump model-access version (D-639, data-model.md §4.1, SPEC-06) | BE | P3 | INTACT |
| TRN-012 | JPA entities — 9 entities with schema-per-tenant, Persistable<UUID>: TrainingSessionEntity, ProposalEntity, AuthorizationEntity, ConsentRecordEntity, VoiceModelEntity, VoiceSampleEntity, AudioAssetEntity, PublicationEntity, OutboundJobEntity (data-model.md §2) | BE | P3 | INTACT |
| TRN-013 | Repository adapters — Spring Data JPA repos + adapters for 9 entities; TenantContextHolder.require() as first line of every adapter method (RULE-04) | BE | P3 | INTACT |
| TRN-014 | PatClient Feign + PatientReferencePort adapter — GET /pat/patients/{id}, ETag/304, service-client pat.patient.read, 404 on cross-tenant miss (integration-contracts.md §4, SPEC-10) | BE | P4 | INTACT |
| TRN-015 | HistClient Feign + AuditPort adapter — hard-502 for TrainingSessionStarted/ConsentGranted/ProposalApproved/ContentPublished; commit+durable-retry for ConsentRevoked/VoiceModelDeleted/ContentErased (event-contracts.md §2, ADR-007, SPEC-10) | BE | P4 | INTACT |
| TRN-016 | ConvClient Feign + TreePublicationPort adapter — POST /conv/trees + POST :retire + DELETE .../audio; exact shapes from integration-contracts.md §4.1; idempotency trn:publish:<approvalId> (SPEC-10) | BE | P4 | INTACT |
| TRN-017 | AnthropicLlmDialogAdapter — minimised context (patientId + draft text + prompt only, INV-TRN-7), validate untrusted output cannot exceed draft/proposed (INV-TRN-2), 503 graceful degradation, no raw transcript stored (ADR-004, integration-contracts.md §1) | BE | P4 | INTACT |
| TRN-018 | ElevenLabsTtsAdapter + per-subject key — consent-gated (INV-TRN-3), voice sample/model refs under per-subject crypto key, outbound_job synthesize durable retry, no partial publish (INV-TRN-4) (SPEC-11, ADR-005, integration-contracts.md §2) | BE | P4 | INTACT |
| TRN-019 | ElasticsearchSearchIndexAdapter — approved-only (INV-TRN-5), tenant-scoped (INV-TRN-8), non-blocking durable retry, pg_trgm fallback when ES degraded (ADR-006, integration-contracts.md §3, SPEC-10) | BE | P4 | INTACT |
| TRN-020 | SecurityConfig + OAuth2 resource server — ACS JWKS, JwtAuthenticationConverter mapping authorities claim, @EnableMethodSecurity(prePostEnabled=true), public /trn/health, patient-session token rejected 403 on all /trn endpoints (D-642, SPEC-06) | BE | P5 | INTACT |
| TRN-021 | TenantContextFilter + ServiceClientTokenProvider — TenantContextFilter registered after BearerTokenAuthenticationFilter (RULE-04); TenantContextHolder.require() first line in every application service; ServiceClientTokenProvider for CONV/PAT/HIST calls (SPEC-06) | BE | P5 | INTACT |
| TRN-022 | MethodSecurityEnforcementIT — integration test proving @PreAuthorize per endpoint, patient-session token rejected 403 on all /trn endpoints, /trn/health bypasses auth (D-642, SPEC-06) | BE | P5 | INTACT |
| TRN-023 | ConsentService + OutboundJobDispatcher — consent capture (ConsentGranted hard-502) + revoke (ConsentRevoked commit+durable-retry); broker-free scheduler for 6 job_types (synthesize/index/publish/retire/erase_conv_audio/audit) with idempotency per (tenant_id, job_type, idempotency_key) (SPEC-11, ADR-005/007) | BE | P6 | INTACT |
| TRN-024 | SynthesizeAndPublishService + PublicationService — POST /trn/proposals/{id}/publication: consent-gate + TtsPort synthesis per phrase + audio_asset manifest + SearchIndexPort + TreePublicationPort (trn:publish:<approvalId>), 202 Accepted, INV-TRN-4 no dangling asset, INV-TRN-6 idempotency (SPEC-01, SPEC-11, SPEC-05) | BE | P6 | INTACT |
| TRN-025 | EraseContentService — DELETE /trn/patients/{id}/content: ElevenLabs model delete + per-subject key crypto-shred + mark voice_model/voice_sample/audio_asset erased + enqueue conv.tree-version.retire + conv.audio.delete + audit VoiceModelDeleted/ContentErased (commit+durable-retry), idempotent 202 (SPEC-11, ADR-005/006/007, INV-TRN-9) | BE | P6 | INTACT |
| TRN-026 | CorrelationIdInterceptor + privacy log filter + Actuator metrics — X-Correlation-Id propagation to all downstream calls; outbound_job depth/attempts/failures by job_type; vendor latency/error counters per port; never log PHI/LLM content/voice data (SPEC-07, ADR-004/005) | BE | P7 | INTACT |
| TRN-027 | BDD scaffold — 6 feature files (training-session, assistant-dialog, dual-authorization, consent-and-synthesis, publish-and-idempotency, erasure) + SharedSteps + 6 per-feature step classes in scaffold format + CucumberSpringContext (SPEC-08, D-532) | BE | P8 | INTACT |
| TRN-028 | BDD scenarios — full Gherkin coverage: session open/PAT-resolve/hard-502-rollback, dialog minimisation/503-resumable, dual-auth distinct-actors/ProposalApproved/guardian-substitute, consent-gate synthesis/no-partial-publish, idempotent publish/ES-down non-blocking, crypto-shred erasure never-blocked (SPEC-08) | BE | P8 | INTACT |
| TRN-029 | Idempotency hardening — publication unique on (tenant_id, approval_id) + (tenant_id, idempotency_key); outbound_job unique on (tenant_id, job_type, idempotency_key); INV-TRN-6 single-active guard; replay detection returning existing record (SPEC-05, data-model.md §2.8/§2.9) | BE | P9 | INTACT |
| INT-TRN-001 | INT-TRN-1 — TRN service-client token must carry conv.tree.publish, conv.tree-version.retire, conv.audio.delete, hist.audit.record, pat.patient.read (ACS obligation, closes TRN side of CONV INT-CONV-2) | BE | P4 | INTACT |
| INT-TRN-002 | INT-TRN-2 — TRN publish gated on complete dual-authorization (INV-TRN-1); publish body carries sourceVersionRef=trn:approval:<approvalId> (closes TRN side of CONV INT-CONV-5) | BE | P4 | INTACT |
| INT-TRN-003 | INT-TRN-3 — ConsentGranted audited hard-502 and durable before any TtsPort call; synthesis refused 409 consent-required without granted consent (INV-TRN-3, TRN-internal / CONV boundary) | BE | P5 | INTACT |
| INT-TRN-004 | INT-TRN-4 — Erasure propagates to CONV (retire + erase audio) and HIST (commit+durable-retry); HIST/CONV outage must not block local crypto-shred (INV-TRN-9, ADR-005/006/007) | BE | P6 | INTACT |
| GWY-001 | Gradle module scaffold — build.gradle.kts, Spring Cloud Gateway WebFlux, integrationTest source set | BE | P1 | INTACT |
| GWY-002 | Route table R1..R8 in application.yml — eight lb:// routes, no StripPrefix, confirmed ports (R8 trn-service 8089 confirmed) | BE | P1 | INTACT |
| GWY-003 | SecurityConfig (WebFlux) — @EnableWebFluxSecurity, SecurityWebFilterChain, public_paths permitAll, anyExchange authenticated (framework gap §7) | BE | P2 | INTACT |
| GWY-004 | Multi-issuer JWT — ReactiveAuthenticationManagerResolver, ACS + EDGE jwk-set-uri, exp-less validator (Risk R2), 401 proof test (D-642) | BE | P2 | INTACT |
| GWY-005 | CorrelationIdFilter — global WebFilter, generate UUID if absent, preserve inbound, set MDC, forward header, echo on response | BE | P2 | INTACT |
| GWY-006 | TenantHeaderStripFilter — strip X-Tenant-Id (and tenant-ish variants) before forwarding (ADR-003, INV-G3) | BE | P2 | INTACT |
| GWY-007 | Eureka client config — defaultZone env fallback, prefer-ip-address, discovery.locator.enabled=false (explicit routes only) | BE | P4 | INTACT |
| GWY-008 | CorsWebFilter — explicit caregiver-shell origin allow-list, never wildcard+credentials, exposed X-Correlation-Id (ADR-004, Risk R6) | BE | P5 | INTACT |
| GWY-009 | In-memory rate limiting — login bucket (POST /acs/auth/login) + pairing bucket (POST /edge/devices/pair), 429, per-IP key (ADR-005) | BE | P5 | INTACT |
| GWY-010 | PHI-free access log filter — emit method, route template, status, latency, correlationId ONLY; never body/params/identifiers (INV-G1, ADR-007) | BE | P7 | INTACT |
| GWY-011 | RFC 7807 ProblemDetail error handler — PHI-free bodies for 401/429/502/503/504 with correlationId field, no token content | BE | P7 | INTACT |
| GWY-012 | Actuator + Prometheus — expose /actuator/health and /actuator/prometheus only, restrict all others (ADR-007) | BE | P7 | INTACT |
| GWY-013 | Per-route circuit breaker + connect/response timeouts — resilience4j per downstream, 503 fallback when open, 504 on response timeout | BE | P9 | INTACT |
| GWY-014 | Idempotent-only retry — GET only via retry filter, never login/pairing/event-report POST (ADR-006, Risk R8) | BE | P9 | INTACT |
| GWY-015 | BaseIntegrationTest — WebFlux @SpringBootTest RANDOM_PORT, WireMock stubs for all eight downstream services | BE | P8 | INTACT |
| GWY-016 | BDD routing.feature step definitions — R1..R8 path forwarding, no route to REG/MIG/DASH, full-path forward (SPEC-01, SPEC-02) | BE | P8 | INTACT |
| GWY-017 | BDD public-vs-authenticated.feature step definitions — 401 without token, EDGE-signed admitted, no-exp patient-session admitted, D-642 (SPEC-03, SPEC-06) | BE | P8 | INTACT |
| GWY-018 | BDD rate-limit-429 + correlation-id + tenant-header-stripping + cors-preflight step definitions (SPEC-06, SPEC-07) | BE | P8 | INTACT |
| GWY-019 | ArchUnit MODULE constant = gateway and package-layer annotation enforcement | BE | P9 | INTACT |
| GWY-020 | Dockerfile + docker-compose service entry — port 8080, startup order depends_on REG | BE | P9 | INTACT |
| GWY-021 | Runbook verification — validate setup-local.md startup sequence, health check, and proxy-call curl commands | BE | P9 | INTACT |
| INT-GWY-001 | ACS — confirm GET /acs/.well-known/jwks.json exact path and iss claim value for GWY ReactiveAuthenticationManagerResolver routing key | BE | P2 | INTACT |
| INT-GWY-002 | EDGE — confirm GET /edge/.well-known/jwks.json exact path and iss claim value for GWY ReactiveAuthenticationManagerResolver routing key | BE | P2 | INTACT |
| INT-GWY-003 | REG — confirm GWY registers with Eureka on startup and lb:// routes resolve for all eight business services (closes INT-REG-001 GWY side) | BE | P4 | INTACT |
