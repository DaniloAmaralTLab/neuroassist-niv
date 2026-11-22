# GEST-002 -- EngineController — GET /gest/engines and GET /gest/engines/{version}

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Implement the read surface of the engine-version registry: list (with optional `?status=` filter) and
get-by-version. Both require `gest.engine.read` authority. Responses include an `ETag` header keyed on
the result set. No `X-Tenant-Id` scoping — registry is global (INV-GEST-3).

## Spec de referencia
- SPEC-01 (API surface §2.1–2.2)
- contracts/api-contract.md §2.1–2.2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/api/EngineController.java`

## Resultado esperado
`GET /gest/engines` returns `200` with filtered engine list + `ETag`. `GET /gest/engines/{version}`
returns `200` or `404 engine-version-not-found`. `./gradlew :gest-service:test` passes for
`EngineControllerTest`.

## Criterios de aceite
- [ ] AC-1: `GET /gest/engines?status=active` returns `200 { "engines": [...] }` with `ETag` header.
- [ ] AC-2: `GET /gest/engines/{version}` with unknown version returns `404 application/problem+json`
  with `type: engine-version-not-found`.
- [ ] AC-3: Request without a valid `Authorization` bearer token returns `401`.
- [ ] AC-4: `@PreAuthorize` annotation references the `RoleAuthorityPolicy.GEST_ENGINE_READ` constant
  (D-535), not a string literal.
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `EngineControllerTest`.

## Dependencias
- GEST-001 (precede — module scaffold)
- GEST-005 (precede — EngineVersionDto)
- GEST-006 (precede — EngineVersion domain aggregate)

## Estimativa
M

## Prioridade
P1
