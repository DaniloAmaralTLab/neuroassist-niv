# GEST-008 -- EngineVersionService — register engine version with HIST audit EngineVersionRegistered

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto
Implement `EngineVersionService.register(version, displayLabel, actorId)`: creates a new
`EngineVersion` with `status = ACTIVE`, validates uniqueness (throws conflict on duplicate), saves
via `EngineVersionRepositoryPort`, and calls `HistAuditPort` with `EngineVersionRegistered`
synchronously within the same request (fail-closed). This is the golden-path create operation.

## Spec de referencia
- SPEC-02 (capability registry — register)
- contracts/api-contract.md §2.3
- contracts/event-contracts.md §1

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/application/EngineVersionService.java`

## Resultado esperado
`register()` persists the new `EngineVersion`, calls `HistAuditPort.record(EngineVersionRegistered)`,
and returns the created aggregate. Duplicate `version` throws a domain exception surfaced as `409`.
`./gradlew :gest-service:test` passes for `EngineVersionServiceTest`.

## Criterios de aceite
- [ ] AC-1: `register()` calls `EngineVersionRepositoryPort.save()` exactly once and `HistAuditPort.record()` with `eventType=EngineVersionRegistered`.
- [ ] AC-2: Duplicate `version` throws a domain exception (mapped to `409 engine-version-conflict` in the api layer).
- [ ] AC-3: If `HistAuditPort.record()` throws, the write is rolled back and a `503 audit-unavailable` exception propagates (fail-closed per hub-integration §3).
- [ ] AC-4: `@Transactional` annotation is on the service method, not on the controller (ADR-001-hexagonal-architecture.md).
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `EngineVersionServiceTest` (uses mocked ports).

## Dependencias
- GEST-006 (precede — EngineVersion domain aggregate)
- GEST-017 (precede — HistAuditPort interface)

## Estimativa
M

## Prioridade
P2
