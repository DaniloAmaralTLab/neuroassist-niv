# EDGE-014 -- Infrastructure — EdgeCredentialRevocation + CachedCatalog JPA entities and adapters

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Create JPA entities and adapters for `EdgeCredentialRevocation` and `CachedCatalog`.
`EdgeCredentialRevocationJpaAdapter` stores revoked `credentialId`s and answers
`isRevoked(credentialId)` for the heartbeat and introspection paths (INV-EDGE-6, G1).
`CachedCatalogJpaAdapter` stores the last-good PAT catalog payload and `pat_etag` per device;
the adapter drops the cache on unpair/revoke via `deleteByDeviceId()` (called by EDGE-009).

## Spec de referencia
- SPEC-04 (data model — edge_credential_revocation, cached_catalog)
- SPEC-03 (offline catalog distribution, INV-EDGE-5)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeCredentialRevocationJpaEntity.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeCredentialRevocationJpaRepository.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/EdgeCredentialRevocationJpaAdapter.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/CachedCatalogJpaEntity.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/CachedCatalogJpaRepository.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/persistence/CachedCatalogJpaAdapter.java`
## Criterios de aceite
- [ ] AC-1 `EdgeCredentialRevocationJpaAdapter.isRevoked(credentialId)` returns `true` for a listed ID (INV-EDGE-6)
- [ ] AC-2 `CachedCatalogJpaAdapter.deleteByDeviceId()` removes the catalog row (called on unpair/revoke — EDGE-009)
- [ ] AC-3 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-012 (tenant migration), EDGE-003 (domain ports), EDGE-009 (drop cache on revoke/unpair)

## Estimativa
S

## Prioridade
P3
