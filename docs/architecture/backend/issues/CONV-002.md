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
- [ ] TODO[agent]: itens adicionais de escopo

## Criterios de aceite
- [ ] TODO[agent]: criterio de aceite verificavel

## Dependencias
TODO[agent]: issues/endpoints dependentes ou "Nenhuma".

## Estimativa
S

## Prioridade
P1
