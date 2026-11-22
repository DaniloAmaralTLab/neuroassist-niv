# Issues Map -- issues

| Issue | Title | Kind | Priority | Status |
|---|---|---|---|---|
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
