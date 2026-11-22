# EVNT-008 -- Implement Event JPA entity and EventJpaRepositoryAdapter (partial index ix_event_active_alarm, uq_event_device_report)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto

JPA persistence adapter for the `event` table (tenant schema). The entity must map all columns
including `report_meta` as `@JdbcTypeCode(SqlTypes.JSON)` (jsonb). The `uq_event_device_report`
constraint makes `save()` throw `DataIntegrityViolationException` on duplicate `(deviceId, reportId)`;
the adapter catches this and resolves to the idempotent replay path (`findByDeviceIdAndReportId`).
Active-alarm query uses the partial index `ix_event_active_alarm` (urgency=emergency AND
confirmedAt IS NULL, newest by occurredAt — INV-EVNT-3). Multi-tenant: schema routing via
`TenantContextHolder` (Hibernate `CurrentTenantIdentifierResolver` or `@Filter`).

## Spec de referencia
- SPEC-04 (data model — event)
- docs/architecture/backend/services/evnt-service/contracts/data-model.md §2.1
- SPEC-05 (idempotency INV-EVNT-4)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/EventJpaEntity.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/EventJpaRepository.java`
- [ ] implementar `src/main/java/com/neuroassist/evnt/infrastructure/persistence/EventRepositoryAdapter.java`
- [ ] integration test with PostgreSQL Testcontainers for active-alarm query and uq replay
- [ ] map `DataIntegrityViolationException` on `uq_event_device_report` to idempotent 200 path

## Criterios de aceite
- [ ] AC-1 `save(event)` with new `(deviceId, reportId)` persists the row and returns the entity with generated `id`
- [ ] AC-2 `save(event)` with duplicate `(deviceId, reportId)` throws, caught by adapter, returns existing event (idempotent replay — INV-EVNT-4)
- [ ] AC-3 `findActiveAlarm(patientId)` returns the unconfirmed emergency with highest `occurredAt`, or empty if none (INV-EVNT-3)
- [ ] AC-4 Multi-tenant schema routing ensures `event` rows from different tenants are isolated
- [ ] AC-5 `./gradlew :evnt-service:test --tests "*.persistence.EventRepositoryAdapterTest"` exits 0

## Dependencias
- EVNT-001 (precede)
- EVNT-002 (precede — Event domain)
- EVNT-007 (precede — migrations must exist for Testcontainers schema)
- EVNT-015 (precede — TenantContextHolder)

## Estimativa
M

## Prioridade
P3
