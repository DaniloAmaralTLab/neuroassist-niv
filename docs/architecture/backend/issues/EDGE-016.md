# EDGE-016 -- Infrastructure — AcsClient Feign adapter (JWKS cache + introspect + service-client token, G1/G2)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Contexto

Create `AcsClient` Feign adapter for EDGE's three outbound ACS interactions
(integration-contracts.md §2): (1) JWKS cache refresh (`GET {acs.baseUrl}/acs/.well-known/jwks.json`
— public, used to verify human JWTs); (2) introspection for sensitive ops
(`POST {acs.baseUrl}/acs/auth/introspect` — service-client, blacklist-aware validation on
enroll/revoke); (3) service-client token acquisition via ACS client-credentials for the `edge-service`
principal (G2 — the credential EDGE holds to call PAT). Token is cached and refreshed before expiry.
On ACS outage, cached keys still pass; revocation check is best-effort + logged (not hard-fail).

## Spec de referencia
- SPEC-06 (ACS JWKS validation, introspect, G1/G2)
- integration-contracts.md §2 (ACS outbound contract)

## Escopo
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/acs/AcsClient.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/acs/AcsJwksAdapter.java`
- [ ] implementar `backend/services/edge-service/src/main/java/com/neuroassist/edge/infrastructure/acs/AcsIntrospectionAdapter.java`
- [ ] implementar `backend/services/edge-service/src/test/java/com/neuroassist/edge/infrastructure/acs/AcsClientWireMockTest.java`
## Criterios de aceite
- [ ] AC-1 `AcsJwksAdapter` caches the last-known key set; on ACS JWKS outage, cached keys still validate tokens (never accepts unsigned tokens)
- [ ] AC-2 `AcsIntrospectionAdapter` is called on enroll and revoke operations and returns `active=false` for blacklisted JTIs
- [ ] AC-3 Service-client token for `edge-service` is cached and refreshed before expiry (not re-fetched on every request)
- [ ] AC-4 `./gradlew :edge-service:test` exits 0 (WireMock stubs for JWKS, introspect, client-credentials)

## Dependencias
- EDGE-019 (SecurityConfig wires the JWKS adapter), INT-EDGE-002 (ACS minting path TBD)

## Estimativa
S

## Prioridade
P4
