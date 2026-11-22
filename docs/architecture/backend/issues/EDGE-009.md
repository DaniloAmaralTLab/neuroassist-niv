# EDGE-009 -- Application — UnpairDevice + RevokeDevice use cases (terminal states, revocation list, INV-EDGE-6)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Create `UnpairDeviceUseCase` (break device↔patient binding, invalidate credential, drop
`cached_catalog`, audit `DeviceUnpaired`) and `RevokeDeviceUseCase` (terminal: set `lifecycleState=revoked`,
add `credentialId` to `edge_credential_revocation` in the same transaction, audit `DeviceRevoked`,
INV-EDGE-6). Both are idempotent (re-revoke → `204` no second audit). A `revoked` device can never be
reactivated — requires a new enroll + pair (INV-EDGE-6). Credential immediately blocked on the
revocation list so introspection returns `active:false` (G1).

## Spec de referencia
- SPEC-02 (UnpairDevice + RevokeDevice use cases, INV-EDGE-6)
- SPEC-05 (idempotency — re-revoke/re-unpair no second audit)
- event-contracts.md §1 (DeviceUnpaired, DeviceRevoked)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/UnpairDeviceUseCase.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/application/RevokeDeviceUseCase.java`
## Criterios de aceite
- [ ] AC-1 `RevokeDevice` adds `credentialId` to `edge_credential_revocation` in the same transaction (INV-EDGE-6, G1)
- [ ] AC-2 Re-revoke of an already-`revoked` device returns `204` with no second `DeviceRevoked` audit (SPEC-05)
- [ ] AC-3 `UnpairDevice` drops `cached_catalog` for the device
- [ ] AC-4 `./gradlew :edge-service:test` exits 0

## Dependencias
- EDGE-007 (PairDevice precedes), EDGE-003 (EdgeCredentialRevocationPort)

## Estimativa
S

## Prioridade
P2
