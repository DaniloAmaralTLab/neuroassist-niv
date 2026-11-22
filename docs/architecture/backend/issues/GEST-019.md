# GEST-019 -- Write-path authority guard — @PreAuthorize per RoleAuthorityPolicy and 403 on read-only token (INV-GEST-5)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto
Add `@PreAuthorize` annotations to all 5 write endpoints and all read endpoints, referencing
`RoleAuthorityPolicy` constants (D-535). A read-only token (patient-session, edge.device) on any write
path MUST return `403 Forbidden`. Write introspection (`AcsIntrospectionPort.isRevoked()`) is wired
here via a `@Transactional` service guard applied before the domain method.

## Spec de referencia
- SPEC-06 (security — authority enforcement, INV-GEST-5)
- contracts/api-contract.md §1.1–1.2

## Escopo
- [ ] implementar `src/main/java/com/neuroassist/gest/api/EngineController.java`
- [ ] implementar `src/main/java/com/neuroassist/gest/api/CapabilityController.java`
- [ ] implementar `src/test/java/com/neuroassist/gest/api/AuthorityGuardTest.java`

## Resultado esperado
Every endpoint has an `@PreAuthorize` annotation referencing the correct `RoleAuthorityPolicy`
constant. Read-only token on write path returns `403`. `./gradlew :gest-service:test` passes for
`AuthorityGuardTest`.

## Criterios de aceite
- [ ] AC-1: `POST /gest/engines` annotated with `@PreAuthorize("hasAuthority(T(com.neuroassist.gest.infrastructure.auth.RoleAuthorityPolicy).GEST_ENGINE_CREATE)")`.
- [ ] AC-2: `POST /gest/engines/{version}/deprecate` annotated with `RoleAuthorityPolicy.GEST_ENGINE_RETIRE`.
- [ ] AC-3: `POST /gest/capabilities` annotated with `RoleAuthorityPolicy.GEST_CAPABILITY_CREATE`.
- [ ] AC-4: `POST /gest/capabilities/{id}/retire` annotated with `RoleAuthorityPolicy.GEST_CAPABILITY_RETIRE`.
- [ ] AC-5: `AuthorityGuardTest` verifies that an `edge.device` token without create authority receives `403` on each write endpoint (INV-GEST-5).
- [ ] AC-6: `./gradlew :gest-service:test` exits 0 for `AuthorityGuardTest`.

## Dependencias
- GEST-018 (precede — SecurityConfig and RoleAuthorityPolicy)
- GEST-016 (precede — AcsIntrospectionPort for revocation)

## Estimativa
M

## Prioridade
P5
