# GEST-003 -- CapabilityController — GET /gest/capabilities and GET /gest/capabilities/{id}

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the read surface of the capability registry. `GET /gest/capabilities` supports optional
AND-combined query filters (`engineVersion`, `code`, `supportStatus`). Both endpoints require
`gest.capability.read` and return `ETag` for caching. The registry is global (INV-GEST-3).

## Spec de referencia
- SPEC-01 (API surface §3.1–3.2)
- contracts/api-contract.md §3.1–3.2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/api/CapabilityController.java`

## Resultado esperado
`GET /gest/capabilities?engineVersion=1.3.0` returns `200` with matching capabilities + `ETag`.
`GET /gest/capabilities/{id}` returns `200` or `404 capability-not-found`.
`./gradlew :gest-service:test` passes for `CapabilityControllerTest`.

## Criterios de aceite
- [ ] AC-1: `GET /gest/capabilities` with valid token returns `200 { "engineVersion": ..., "capabilities": [...] }` and `ETag` header.
- [ ] AC-2: `GET /gest/capabilities/{id}` with unknown id returns `404 application/problem+json`
  with `type: capability-not-found`.
- [ ] AC-3: `X-Tenant-Id` header when present is ignored; response is identical to same request without it (INV-GEST-3).
- [ ] AC-4: `@PreAuthorize` annotation references `RoleAuthorityPolicy.GEST_CAPABILITY_READ` constant (D-535).
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `CapabilityControllerTest`.

## Dependencias
- GEST-001 (precede — module scaffold)
- GEST-005 (precede — EngineCapabilityDto)
- GEST-007 (precede — EngineCapability domain aggregate)

## Estimativa
M

## Prioridade
P1
