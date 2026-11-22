# EDGE-004 -- RoleAuthorityPolicy — single source of authority constants (D-535, INV-EDGE-7)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Create the `RoleAuthorityPolicy` class as the **single source of truth** for all EDGE authority
string constants, designed to prevent drift between role mapping and `@PreAuthorize` expressions
(D-535, INV-EDGE-7). Every controller `@PreAuthorize` string MUST reference a constant from this
class, never a literal. Constants: `DEVICE_ENROLL`, `DEVICE_READ`, `DEVICE_PAIR`, `DEVICE_ACTIVATE`,
`DEVICE_DEACTIVATE`, `DEVICE_REVOKE`, `DEVICE_UNPAIR`, `HEARTBEAT_RECORD`, `CATALOG_READ`.

## Spec de referencia
- SPEC-06 (security — RoleAuthorityPolicy, INV-EDGE-7, D-535)
- SPEC-01 (api surface — authority model)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/domain/RoleAuthorityPolicy.java`
## Criterios de aceite
- [ ] AC-1 `RoleAuthorityPolicy` contains exactly 9 authority constants matching the api-contract §9 matrix (`edge.device.enroll`, `edge.device.read`, `edge.device.pair`, `edge.device.activate`, `edge.device.deactivate`, `edge.device.revoke`, `edge.device.unpair`, `edge.heartbeat.record`, `edge.catalog.read`)
- [ ] AC-2 `./gradlew :edge-service:compileJava` exits 0

## Dependencias
- EDGE-001 (precede)

## Estimativa
S

## Prioridade
P1
