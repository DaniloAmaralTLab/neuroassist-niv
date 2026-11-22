# GEST-013 -- EngineVersionJpaEntity and EngineVersionRepositoryAdapter (global schema, Spring Data JPA)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto
Implement the JPA persistence adapter for `EngineVersion`. `EngineVersionJpaEntity` is a JPA entity
mapped to the `neuroassist_global.engine_version` table. `EngineVersionRepositoryAdapter` implements
`EngineVersionRepositoryPort` using the Spring Data repository. All queries run against the global
schema (no tenant schema routing).

## Spec de referencia
- SPEC-04 (data model — engine_version table)
- contracts/data-model.md §2.1
- docs/architecture/backend/adr/ADR-001-hexagonal-architecture.md (infrastructure layer)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/persistence/EngineVersionJpaEntity.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/persistence/EngineVersionJpaRepository.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/persistence/EngineVersionRepositoryAdapter.java`

## Resultado esperado
`EngineVersionRepositoryAdapter` correctly implements all `EngineVersionRepositoryPort` methods.
Integration test against an in-memory/test-container DB passes. `./gradlew :gest-service:test` exits 0.

## Criterios de aceite
- [ ] AC-1: `EngineVersionJpaEntity` is annotated with `@Entity @Table(schema="neuroassist_global", name="engine_version")`.
- [ ] AC-2: `EngineVersionRepositoryAdapter` implements `EngineVersionRepositoryPort` and lives in `infrastructure.persistence` (not in `domain`).
- [ ] AC-3: `findByVersion(version)` returns `Optional<EngineVersion>` mapping correctly to the domain aggregate.
- [ ] AC-4: Mapper between `EngineVersionJpaEntity` and `EngineVersion` domain object does not expose JPA annotations outside the `infrastructure` package.
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `EngineVersionRepositoryAdapterTest`.

## Dependencias
- GEST-006 (precede — EngineVersion domain + EngineVersionRepositoryPort)
- GEST-012 (precede — Flyway migration defines the table)

## Estimativa
M

## Prioridade
P3
