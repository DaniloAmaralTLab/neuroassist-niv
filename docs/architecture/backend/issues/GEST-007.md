# GEST-007 -- EngineCapability domain aggregate and SupportStatus enum

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the `EngineCapability` domain aggregate (id, engineVersionId, gestureTypeCode, supportStatus,
notes, declaredBy, declaredAt, updatedAt) and the `SupportStatus` enum (`supported`, `experimental`,
`unsupported`). `unknown` is NOT a stored status — it is the absence of a row, surfaced only by
support-check. Also defines `EngineCapabilityRepositoryPort` (domain port).

## Spec de referencia
- SPEC-02 (capability registry — EngineCapability invariants)
- contracts/data-model.md §2.2
- contracts/api-contract.md §5

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/EngineCapability.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/SupportStatus.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/port/EngineCapabilityRepositoryPort.java`

## Resultado esperado
`EngineCapability` is a domain aggregate with factory method and `retire()` state-transition.
`SupportStatus` enum has exactly `SUPPORTED`, `EXPERIMENTAL`, `UNSUPPORTED`. Repository port declares
`findById`, `findByVersionAndCode`, `findByVersionId`, `save`, `findByVersionIdAndFilters`.

## Criterios de aceite
- [ ] AC-1: `SupportStatus` enum values are `SUPPORTED`, `EXPERIMENTAL`, `UNSUPPORTED` (3 only; `UNKNOWN` is NOT an enum value — it is an application-layer sentinel).
- [ ] AC-2: `EngineCapability.isDetectable()` returns `true` iff `supportStatus ∈ {SUPPORTED, EXPERIMENTAL}` (INV-GEST-7 logic lives here, not in the controller).
- [ ] AC-3: `EngineCapability.retire()` sets `supportStatus = UNSUPPORTED`; calling on already-unsupported is a no-op.
- [ ] AC-4: `EngineCapabilityRepositoryPort` is in `domain.port`; no JPA import (ADR-001-hexagonal-architecture.md).
- [ ] AC-5: `./gradlew :gest-service:compileJava` exits 0.

## Dependencias
- GEST-001 (precede — module scaffold)
- GEST-006 (precede — EngineVersion aggregate for FK reference)

## Estimativa
S

## Prioridade
P2
