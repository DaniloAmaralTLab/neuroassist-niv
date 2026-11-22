# GEST-006 -- EngineVersion domain aggregate and EngineStatus enum

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the `EngineVersion` domain aggregate (id, version, displayLabel, status, createdAt) and
the `EngineStatus` enum (`active`, `deprecated`). `EngineStatus` has a one-way `active → deprecated`
transition enforced in the domain class. Also defines `EngineVersionRepositoryPort` (domain port).

## Spec de referencia
- SPEC-02 (capability registry — EngineVersion lifecycle)
- contracts/data-model.md §2.1
- contracts/api-contract.md §5

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/EngineVersion.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/EngineStatus.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/port/EngineVersionRepositoryPort.java`

## Resultado esperado
`EngineVersion` is a domain aggregate with factory method and `deprecate()` state-transition method.
`EngineStatus` enum has exactly `ACTIVE` and `DEPRECATED` values. `EngineVersionRepositoryPort`
declares `findByVersion`, `findAll`, `save`.

## Criterios de aceite
- [ ] AC-1: `EngineVersion.deprecate()` transitions status from `ACTIVE` to `DEPRECATED`; calling it on an already-deprecated instance is a no-op (idempotent).
- [ ] AC-2: `EngineStatus` enum values are `ACTIVE` and `DEPRECATED` (valid Java identifiers, no leading digit — api-contract §5).
- [ ] AC-3: `EngineVersionRepositoryPort` is an interface in the `domain.port` package; no JPA import in this layer (ADR-001-hexagonal-architecture.md).
- [ ] AC-4: `./gradlew :gest-service:compileJava` exits 0.

## Dependencias
- GEST-001 (precede — module scaffold)

## Estimativa
S

## Prioridade
P2
