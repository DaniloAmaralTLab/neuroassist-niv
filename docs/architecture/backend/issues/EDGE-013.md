# EDGE-013 -- Infrastructure — EdgeDevice + DevicePairingCode JPA entities and adapters (schema-per-tenant routing)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Create JPA entities and adapters for `EdgeDevice` and `DevicePairingCode`. `EdgeDeviceJpaEntity`
maps to `edge_device` in the per-tenant schema; the adapter uses a `TenantAwareDataSource` routing
to `t_<tenantId>` based on `TenantContextHolder.require()` (ArchUnit RULE-04). `DevicePairingCodeJpaEntity`
maps to `device_pairing_code` in `neuroassist_global` (global schema routing — different DataSource
or schema override). Both adapters implement the corresponding domain ports from EDGE-003.

## Spec de referencia
- SPEC-04 (JPA entities, schema-per-tenant routing)
- data-model.md §2.1–2.2 (DDL)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeDeviceJpaEntity.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeDeviceJpaRepository.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeDeviceJpaAdapter.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/DevicePairingCodeJpaEntity.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/DevicePairingCodeJpaRepository.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/DevicePairingCodeJpaAdapter.java`
## Criterios de aceite
- [ ] AC-1 `EdgeDeviceJpaAdapter.findByIdAndTenantId()` queries the per-tenant schema (never crosses tenant boundary — INV-EDGE-1)
- [ ] AC-2 `DevicePairingCodeJpaAdapter.consumeCode()` performs compare-and-set (`UPDATE ... WHERE consumed_at IS NULL AND expires_at > now()`) returning affected rows (SPEC-05)
- [ ] AC-3 `./gradlew :edge-service:test` exits 0 (integration tests with EmbeddedPostgres)

## Dependencias
- EDGE-011, EDGE-012 (migrations), EDGE-002, EDGE-003 (domain ports)

## Estimativa
S

## Prioridade
P3
