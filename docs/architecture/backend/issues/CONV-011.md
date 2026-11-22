# CONV-011 -- Repository adapters — Spring Data JPA repos + adapters for all 6 entities (TenantContextHolder.require() as first line of every application service)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Creates `PublishedTreeJpaRepository` and `TreeVersionJpaRepository` (Spring Data JPA) plus
their corresponding `PublishedTreeRepositoryAdapter` (implements `PublishedTreeRepositoryPort`)
and `UsageRepositoryAdapter` (implements `UsagePort`). Every adapter method starts with
`TenantContextHolder.require()` as the first line (ArchUnit RULE-04, SPEC-06) to ensure no
query ever runs without a resolved tenant. `PublishedTreeRepositoryPort.findActiveWithLock(patientId)`
must use a `SELECT FOR UPDATE` / `@Lock(LockModeType.PESSIMISTIC_WRITE)` to serialize
concurrent publishes (SPEC-05, INV-CONV-2). The partial unique index `uq_tree_version_one_active`
acts as the last-resort guard but the application lock is the primary serialization mechanism.

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/PublishedTreeJpaRepository.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/jpa/TreeVersionJpaRepository.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/adapter/PublishedTreeRepositoryAdapter.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/persistence/adapter/UsageRepositoryAdapter.java`
- [ ] criar `CategoryJpaRepository`, `PhraseJpaRepository`, `AudioAssetJpaRepository` para leitura durante serialização do bundle
- [ ] garantir que nenhuma chamada de repositório ocorre sem `TenantContextHolder.require()` (ArchUnit RULE-04)

## Criterios de aceite
- [ ] AC-1 `PublishedTreeRepositoryAdapter.findByPatientId(patientId)` calls `TenantContextHolder.require()` before any query; an IT fails with `TenantNotResolvedException` if the tenant is not set
- [ ] AC-2 `findActiveWithLock(patientId)` acquires `PESSIMISTIC_WRITE` lock (verified in an IT by checking `FOR UPDATE` in Hibernate SQL logs)
- [ ] AC-3 `./gradlew :conv-service:test` exits 0 (unit tests with mocked JPA repos)

## Dependencias
- CONV-010 (precede — JPA entities)
- CONV-005 (precede — port interfaces)

## Estimativa
S

## Prioridade
P3
