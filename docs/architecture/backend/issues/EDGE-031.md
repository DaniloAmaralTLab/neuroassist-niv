# EDGE-031 -- Infrastructure — `EdgeDetectionLapseJpaEntity` + adapter + detection-state columns on `EdgeDeviceJpaEntity` (ADR-005)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Provides the JPA infrastructure for the ADR-005 lapse ledger and detection-state columns:
1. Extend `EdgeDeviceJpaEntity` with the five ADR-005 columns (`detectionState`,
   `detectionStateSince`, `detectionReason`, `engineVersion`, `lastDetectingAt`) mapped with
   `@Enumerated(EnumType.STRING)` and nullable. Extend the JPA adapter to map them to/from
   the `EdgeDevice` domain object.
2. Create `EdgeDetectionLapseJpaEntity` with all columns from `data-model.md §2.5` (routed to
   per-tenant schema `t_<tenantId>` via `TenantContextHolder`), with the partial unique index
   hint (enforced by `V0032` DDL). Implement `EdgeDetectionLapseRepositoryAdapter` implementing
   `EdgeDetectionLapseRepositoryPort` (domain port from EDGE-029) using Spring Data JPA.

Schema routing follows the same `TenantContextHolder` pattern used by `EdgeDeviceJpaEntity` and
`CachedCatalogJpaEntity` (EDGE-013 / EDGE-014).

## Spec de referencia
- SPEC-04 (data model, schema routing — tenant isolation, INV-EDGE-1)
- data-model.md §2.2 (detection-state columns on `edge_device`)
- data-model.md §2.5 (full `edge_detection_lapse` DDL, INV-EDGE-10)

## Escopo
- [ ] estender `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeDeviceJpaEntity.java` — adicionar mapeamento JPA dos 5 campos de detection-state; atualizar o mapeamento to/from domain `EdgeDevice`
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeDetectionLapseJpaEntity.java` — entidade JPA mapeada a `edge_detection_lapse` no schema tenant; `@Table(name = "edge_detection_lapse")`; todos os campos conforme `data-model.md §2.5`; `cause` e `detectionState` como `@Enumerated(EnumType.STRING)`
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeDetectionLapseJpaRepository.java` — `JpaRepository<EdgeDetectionLapseJpaEntity, UUID>` + query `findByDeviceIdAndResolvedAtIsNull(UUID): Optional<EdgeDetectionLapseJpaEntity>`
- [ ] criar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeDetectionLapseRepositoryAdapter.java` — implementa `EdgeDetectionLapseRepositoryPort`; mapeia domain↔JPA entity; schema routing via `TenantContextHolder`

## Criterios de aceite
- [ ] AC-1 `EdgeDetectionLapseRepositoryAdapter.findOpenByDeviceId(id)` returns empty when no row with `resolvedAt = null` for that device (INV-EDGE-10; backed by `uq_edge_detection_lapse_open` DDL constraint)
- [ ] AC-2 Saving a second open episode for the same device throws a `DataIntegrityViolationException` (the `uq_edge_detection_lapse_open` DDL partial unique index fires — INV-EDGE-10)
- [ ] AC-3 `EdgeDetectionLapseJpaEntity` has no imports from `domain` (domain objects carry no JPA annotations — ArchUnit RULE-03)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0 (integration test with Testcontainers PostgreSQL applying V0030–V0032)

## Dependencias
- EDGE-013 (EdgeDeviceJpaEntity baseline — precede)
- EDGE-029 (EdgeDetectionLapseRepositoryPort interface — precede)
- EDGE-030 (V0032 migration script — precede, supplies DDL)

## Estimativa
M

## Prioridade
P3
