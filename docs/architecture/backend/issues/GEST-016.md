# GEST-016 -- AcsIntrospectionPort and AcsClient Feign adapter (revocation check on write paths only)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Contexto
Implement the ACS introspection adapter. Write paths (`POST /gest/engines`, `POST /gest/engines/{version}/deprecate`,
`POST /gest/capabilities`, `POST /gest/capabilities/{id}/retire`) must call
`AcsIntrospectionPort.isRevoked(jti)` before proceeding. Read paths are NOT introspection-sensitive
(advisory global data). Revoked `jti` → `401 Unauthorized`.

## Spec de referencia
- SPEC-06 (security — write-path revocation)
- contracts/hub-integration.md §1
- contracts/api-contract.md §0.2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/domain/port/AcsIntrospectionPort.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/integration/AcsClient.java`
- [ ] implementar `src/test/java/com/neuroassist/gest/infrastructure/integration/AcsClientTest.java`

## Resultado esperado
`AcsIntrospectionPort.isRevoked(jti)` returns `true` for revoked tokens. Service layer translates to
`401`. Read paths bypass introspection. WireMock test covers revoked and active JTI scenarios.

## Criterios de aceite
- [ ] AC-1: `AcsIntrospectionPort` is in `domain.port` with method `boolean isRevoked(String jti)`.
- [ ] AC-2: `AcsClient` calls `POST /acs/auth/introspect` with `url_prop: acs.base-url`.
- [ ] AC-3: Revoked `jti` on a write path results in `401 Unauthorized` response.
- [ ] AC-4: Read paths (`GET /gest/engines`, `GET /gest/capabilities`, `POST /gest/capabilities/support-check`) do NOT call `AcsIntrospectionPort` (advisory global data).
- [ ] AC-5: `./gradlew :gest-service:test` exits 0 for `AcsClientTest` with WireMock stubs.

## Dependencias
- GEST-001 (precede — module scaffold)

## Estimativa
M

## Prioridade
P4
