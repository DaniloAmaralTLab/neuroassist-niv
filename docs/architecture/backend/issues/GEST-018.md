# GEST-018 -- SecurityConfig — OAuth2 resource server, JWKS validation, and RoleAuthorityPolicy constants (D-535)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Configure GEST as an ACS resource server: JWT validation via JWKS at `${ACS_JWKS_URI}`. Define
`RoleAuthorityPolicy` as a constants class holding the 6 `gest.*` authority strings. All
`@PreAuthorize` annotations in controllers MUST reference these constants (D-535), not string literals.
GEST mints no token; `X-Tenant-Id` is never trusted.

## Spec de referencia
- SPEC-06 (security — resource server, authority catalog)
- contracts/api-contract.md §1.1 (authority catalog)

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/auth/SecurityConfig.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/infrastructure/auth/RoleAuthorityPolicy.java`

## Resultado esperado
`SecurityConfig` enables Spring Security OAuth2 Resource Server with JWKS. `RoleAuthorityPolicy`
declares all 6 authorities. `./gradlew :gest-service:compileJava` exits 0.

## Criterios de aceite
- [ ] AC-1: `SecurityConfig` configures `oauth2ResourceServer().jwt().jwkSetUri(${ACS_JWKS_URI})`.
- [ ] AC-2: `RoleAuthorityPolicy` declares exactly the 6 constants: `GEST_ENGINE_READ`, `GEST_ENGINE_CREATE`, `GEST_ENGINE_RETIRE`, `GEST_CAPABILITY_READ`, `GEST_CAPABILITY_CREATE`, `GEST_CAPABILITY_RETIRE` with values `gest.engine.read`, `gest.engine.create`, `gest.engine.retire`, `gest.capability.read`, `gest.capability.create`, `gest.capability.retire`.
- [ ] AC-3: `SecurityConfig` does NOT declare any per-endpoint security (that belongs to `@PreAuthorize` in controllers per D-535).
- [ ] AC-4: `./gradlew :gest-service:compileJava` exits 0.

## Dependencias
- GEST-001 (precede — module scaffold)

## Estimativa
S

## Prioridade
P5
