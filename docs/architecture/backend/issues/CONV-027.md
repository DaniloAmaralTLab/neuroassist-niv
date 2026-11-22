# CONV-027 -- MethodSecurityEnforcementIT — 401/403 for every endpoint, wrong token class (patient-session on TRN path, TRN on station path), @PreAuthorize integration test (SPEC-06, D-642)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

Implements `MethodSecurityEnforcementIT` — an integration test that exhaustively verifies the
401/403 security boundary for every CONV endpoint (D-642 fix pattern, SPEC-06). Covers:
(1) unauthenticated → 401 on each protected endpoint; (2) patient-session token on a TRN-only
path (publish/retire/erase) → 403; (3) TRN service-client token on a station path
(read/audio/usage) → 403; (4) valid patient-session token with the wrong authority (e.g. sending
a token with only `conv.tree.read` to `POST /conv/usage-signals`) → 403. These tests prove that
`@EnableMethodSecurity` is active (D-642) and that every controller's `@PreAuthorize` references
the correct `RoleAuthorityPolicy` constant (D-535). The test mocks the ACS JWKS via WireMock
so no live ACS service is needed.

## Escopo
- [ ] implementar `backend/services/conv-service/src/test/java/com/neuroassist/conv/security/MethodSecurityEnforcementIT.java`
- [ ] registrar WireMock JWKS stub em `application-test.yml` apontando para o mock ACS `/.well-known/jwks.json`
- [ ] cobrir todos os 7 endpoints (incluindo o public `/conv/health` que deve retornar 200 sem token)

## Criterios de aceite
- [ ] AC-1 Each of the 6 protected endpoints returns `401` when called without an `Authorization` header
- [ ] AC-2 `POST /conv/trees` with a patient-session token returns `403 Forbidden` (ACS INV-3)
- [ ] AC-3 `GET /conv/tree` with a TRN service-client token returns `403 Forbidden` (ACS INV-3)
- [ ] AC-4 `GET /conv/health` returns `200 OK` without any `Authorization` header (permitAll)
- [ ] AC-5 `./gradlew :conv-service:integrationTest` exits 0

## Dependencias
- CONV-016 (precede — SecurityConfig fully wired)
- CONV-002 (precede — RoleAuthorityPolicy constants used in @PreAuthorize)

## Estimativa
S

## Prioridade
P9
