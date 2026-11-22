# HIST-009 -- JPA entities AuditRecord + AuditRecordGlobal — INSERT-only adapters + schema-per-tenant routing via TenantContextHolder (no tenant_id column mapping, schema is the boundary)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Provides the JPA persistence layer for the two audit tables. Key constraints:
- `audit_record` lives in the tenant schema `t_<tenantId>` — the entity does NOT map `tenant_id`
  as a Java field (the schema is the isolation boundary; mapping it would create a stray column
  in schema-per-tenant, Learning: `be-jpa-entity:table-mapping:entity-annotations-diverge-from-real-schema`).
- `audit_record_global` lives in `neuroassist_global` and maps `tenant_id` as nullable.
- Both are INSERT-only: the adapter uses `repository.save(entity)` for new records (Persistable
  strategy with `isNew() = id == null`), never `findById().orElseGet()` — there is no UPDATE path.
- The `payload` column is `jsonb` and must be mapped as `String` with `@JdbcTypeCode(SqlTypes.JSON)`;
  the DTO receives a `Map<String, Object>` deserialized by the adapter using `ObjectMapper`.

## Spec de referencia

- SPEC-04 (data model, §2.1/§2.2 DDL)
- data-model.md §2.1 audit_record + §2.2 audit_record_global
- ADR-002 (append-only — no UPDATE/DELETE in application code)

## Escopo

- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/entity/AuditRecordJpaEntity.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/entity/AuditRecordGlobalJpaEntity.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/repository/AuditRecordJpaRepository.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/repository/AuditRecordGlobalJpaRepository.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/adapter/AuditTrailPortAdapter.java`
- [ ] implementar `backend/services/hist-service/src/main/java/com/neuroassist/hist/infrastructure/persistence/adapter/AuditTrailGlobalPortAdapter.java`

## Criterios de aceite

- [ ] AC-1 `AuditRecordJpaEntity` does NOT declare a `tenantId` field (schema is the boundary); `AuditRecordGlobalJpaEntity` maps `tenant_id` as nullable
- [ ] AC-2 `payload` column is `@JdbcTypeCode(SqlTypes.JSON)` mapped as `String`; adapter converts from/to `Map<String, Object>` using `ObjectMapper`
- [ ] AC-3 Adapter INSERT path: `repository.save(newEntity)` — no `findById` on the write path (append-only)
- [ ] AC-4 `ddl-auto=validate` in `application-test.yml` and integration test against test-container Postgres confirms schema matches entity mappings
- [ ] AC-5 `./gradlew :hist-service:integrationTest` exits 0

## Dependencias

- HIST-006 (DDL must exist before JPA validation)
- HIST-005 (AuditTrailPort and AuditTrailGlobalPort interfaces)

## Estimativa

M

## Prioridade
P3
