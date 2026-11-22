# CONV-010 -- JPA entities — 6 entities (PublishedTreeEntity, TreeVersionEntity, CategoryEntity, PhraseEntity, AudioAssetEntity, UsageSignalEntity) with schema-per-tenant, Persistable<UUID>

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Creates the six JPA entities that map to the CONV tenant-schema tables (V0071–V0076).
Schema-per-tenant: JPA is configured with `spring.jpa.hibernate.ddl-auto=validate` and a
`TenantSchemaResolver` that sets the search path before each connection (following the same
pattern as ACS/PAT/EDGE — `Persistable<UUID>`, app-assigned UUID). Key constraints:
`TreeVersionEntity` has an `@Enumerated` `status` column (only `status`/`withdrawnAt` are
mutable); `AudioAssetEntity` has `erased` boolean + `erasedAt` nullable (ADR-005/006);
`UsageSignalEntity` has no free-text column (INV-CONV-6); `PhraseEntity` has `textSearch`
(`@Type` tsvector) and `assetId` (asset manifest reference — not a FK, validated at service
level, INV-CONV-3).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/PublishedTreeEntity.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/TreeVersionEntity.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/CategoryEntity.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/PhraseEntity.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/AudioAssetEntity.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/UsageSignalEntity.java`
- [ ] criar `TreeVersionEntity` com `@Enumerated(EnumType.STRING)` para o campo `status`
- [ ] garantir que `AudioAssetEntity.voiceModelRef` tem `@Column(name = "voice_model_ref")` e é nullable (erasable, ADR-005)

## Criterios de aceite
- [ ] AC-1 `./gradlew :conv-service:compileJava` exits 0 with all 6 entities referencing their respective repositories
- [ ] AC-2 `spring.jpa.hibernate.ddl-auto=validate` passes against the Testcontainers PostgreSQL container after V0070–V0076 migrations are applied
- [ ] AC-3 `AudioAssetEntity` exposes `erased` boolean field and nullable `erasedAt` with correct column names matching V0075 DDL

## Dependencias
- CONV-004 (precede — domain model, shared value types)
- CONV-008 (precede — tables must exist for ddl-auto=validate)

## Estimativa
S

## Prioridade
P3
