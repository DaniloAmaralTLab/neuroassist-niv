# CONV-016 -- OAuth2 resource server + SecurityConfig — ACS JWKS validation, patient-session + TRN service-client token split, @EnableMethodSecurity, public path /conv/health (D-642, SPEC-06)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

Configures `conv-service` as an OAuth2 resource server validating tokens via ACS JWKS.
`SecurityConfig` must: (1) annotate `@EnableMethodSecurity(prePostEnabled = true)` (D-642 —
without this, `@PreAuthorize` is silently inert); (2) configure `JwtGrantedAuthoritiesConverter`
to read the `authorities` claim (not `scope`); (3) register `GET /conv/health` as `permitAll`;
(4) require authentication on all other paths. Two token classes are accepted: patient-session
(`actorType=patient-session`) and TRN service-client (`actorType=service-client`); wrong token
class on a path returns `403` (ACS INV-3). ACS JWKS URI: `${neuroassist.acs.base-url}/.well-known/jwks.json`.
The `security.oauth2.resourceserver.jwt.jwk-set-uri` property must be set (known pitfall: missing
this causes `IllegalStateException` at startup — Learning pitfall `jwk-set-uri`).

## Escopo
- [ ] implementar `backend/services/conv-service/src/main/java/com/neuroassist/conv/infrastructure/security/SecurityConfig.java`
- [ ] implementar `backend/services/conv-service/src/main/resources/application.yml`
- [ ] adicionar `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` em `application.yml` apontando para `${neuroassist.acs.base-url}/.well-known/jwks.json`
- [ ] configurar `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` em `application-test.yml` apontando para o WireMock JWKS do ACS

## Criterios de aceite
- [ ] AC-1 `GET /conv/health` returns `200` without an `Authorization` header
- [ ] AC-2 `GET /conv/tree` without a bearer token returns `401 Unauthorized`
- [ ] AC-3 `POST /conv/trees` with a patient-session token (not TRN service-client) returns `403 Forbidden` (ACS INV-3)
- [ ] AC-4 `@EnableMethodSecurity(prePostEnabled = true)` is present in `SecurityConfig`; `JwtGrantedAuthoritiesConverter` reads the `authorities` claim
- [ ] AC-5 `./gradlew :conv-service:compileJava` exits 0

## Dependencias
- CONV-002 (precede — RoleAuthorityPolicy constants)
- CONV-001 (precede — module scaffold)

## Estimativa
S

## Prioridade
P5
