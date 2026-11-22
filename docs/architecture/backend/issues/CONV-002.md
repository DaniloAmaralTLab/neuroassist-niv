# CONV-002 -- RoleAuthorityPolicy — 6 conv.* authority constants + @EnableMethodSecurity (D-642, SPEC-06)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Defines the single source of truth for all `conv.*` authorities and enables method-level security
(D-642 fix: `@EnableMethodSecurity` and `JwtGrantedAuthoritiesConverter` must be present or
`@PreAuthorize` checks are silently inert). Six authorities computed with the English verb table
(D-639): `conv.tree.read`, `conv.audio.read`, `conv.usage.record`, `conv.tree.publish`,
`conv.tree-version.retire`, `conv.audio.delete`. Patient-session token carries the first three;
TRN service-client token carries the last three (ACS INV-3). `@PreAuthorize` on each controller
method MUST reference the `RoleAuthorityPolicy` constant, never a literal string (D-535).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/security/RoleAuthorityPolicy.java`
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/security/SecurityConfig.java`
- [ ] definir constantes públicas no enum/classe `RoleAuthorityPolicy` para os 6 `conv.*` authorities
- [ ] anotar `SecurityConfig` com `@EnableMethodSecurity(prePostEnabled = true)`
- [ ] registrar `JwtGrantedAuthoritiesConverter` que lê `authorities` do JWT (não `scope`)

## Criterios de aceite
- [ ] AC-1 `RoleAuthorityPolicy` expõe exatamente 6 constantes: `CONV_TREE_READ`, `CONV_AUDIO_READ`, `CONV_USAGE_RECORD`, `CONV_TREE_PUBLISH`, `CONV_TREE_VERSION_RETIRE`, `CONV_AUDIO_DELETE`, cujos valores são as strings `conv.*` correspondentes
- [ ] AC-2 `SecurityConfig` is annotated `@EnableMethodSecurity(prePostEnabled = true)`; calling a `@PreAuthorize`-protected method without the authority returns `403` in an IT
- [ ] AC-3 `./gradlew :conv-service:test` exits 0 (unit test verifies constant values)

## Dependencias
- CONV-001 (precede)

## Estimativa
S

## Prioridade
P1
