# EDGE-003 -- Domain — DevicePairingCode + EdgeCredentialRevocation + CachedCatalog value objects and ports

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Contexto

Create the remaining domain entities and their repository ports. `DevicePairingCode` holds the
single-use routing tuple (`code_hash`, `tenantId`, `deviceId`, `expiresAt`, `consumedAt`) — the
plaintext code is never stored (INV-EDGE-3). `EdgeCredentialRevocation` is the immediate-revocation
list (G1); a listed `credentialId` is never refreshed and fails introspection (INV-EDGE-6).
`CachedCatalog` is the last-good PAT command catalog served offline (ADR-004, INV-EDGE-5); it is
derived and rebuildable, dropped on unpair/revoke.

## Spec de referencia
- SPEC-04 (data model — device_pairing_code, edge_credential_revocation, cached_catalog)
- SPEC-03 (offline catalog distribution, INV-EDGE-5)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/DevicePairingCode.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/EdgeCredentialRevocation.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/CachedCatalog.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/DevicePairingCodeRepositoryPort.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/EdgeCredentialRevocationPort.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/CachedCatalogRepositoryPort.java`
## Criterios de aceite
- [ ] AC-1 `DevicePairingCode` stores no plaintext code field — only `codeHash` (INV-EDGE-3)
- [ ] AC-2 `EdgeCredentialRevocationPort.isRevoked(credentialId)` returns true for listed IDs (INV-EDGE-6)
- [ ] AC-3 `./gradlew :edge-service:test` exits 0 (unit tests for domain value objects)

## Dependencias
- EDGE-001 (precede)

## Estimativa
S

## Prioridade
P1
