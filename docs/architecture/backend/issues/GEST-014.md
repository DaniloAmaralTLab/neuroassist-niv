# GEST-014 -- EngineCapabilityJpaEntity and EngineCapabilityRepositoryAdapter (global schema, upsert on unique pair)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto
Implement the JPA persistence adapter for `EngineCapability`. Key behavior: the adapter must implement
upsert semantics for the `(engine_version_id, gesture_type_code)` unique constraint — `findByVersionIdAndCode`
enables the `CapabilityService.declare()` to decide insert vs update (INV-GEST-2, SPEC-05). No delete
method is exposed (append-only, INV-GEST-6).

## Spec de referencia
- SPEC-04 (data model — engine_capability table)
- SPEC-05 (idempotency — upsert on unique pair)
- contracts/data-model.md §2.2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/persistence/EngineCapabilityJpaEntity.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/persistence/EngineCapabilityJpaRepository.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/persistence/EngineCapabilityRepositoryAdapter.java`

## Resultado esperado
`EngineCapabilityRepositoryAdapter` supports `findByVersionIdAndCode`, `findByVersionId`,
`findByVersionIdAndFilters`, and `save`. No `delete` method exists. Integration test passes.

## Criterios de aceite
- [ ] AC-1: `EngineCapabilityJpaEntity` is annotated with `@Entity @Table(schema="neuroassist_global", name="engine_capability")`.
- [ ] AC-2: `EngineCapabilityRepositoryAdapter` does NOT expose a `delete` or `remove` method (INV-GEST-6 append-only).
- [ ] AC-3: `findByVersionIdAndCode(engineVersionId, code)` returns `Optional<EngineCapability>` correctly (used for upsert detection in `CapabilityService.declare()`).
- [ ] AC-4: `findByVersionId(engineVersionId)` returns all capability rows for a given engine version (supports `GET /gest/capabilities?engineVersion=` bulk read).
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `EngineCapabilityRepositoryAdapterTest`.

## Dependencias
- GEST-007 (precede — EngineCapability domain + EngineCapabilityRepositoryPort)
- GEST-012 (precede — Flyway migration defines the table)
- GEST-013 (precede — EngineVersionJpaEntity for FK mapping)

## Estimativa
M

## Prioridade
P3
