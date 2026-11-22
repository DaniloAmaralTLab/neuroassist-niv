# INT-ACS-002 -- Resource server token validation (JWKS provider + /acs/auth/introspect contract for GWY/PAT/EVNT)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ACS is the trust anchor for all other modules. This issue validates the two
verification surfaces consumed by resource servers (integration-contracts.md §2.2):

1. **JWKS** (`GET /acs/.well-known/jwks.json`): resource servers configure
   `spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://acs-service/acs/.well-known/jwks.json`.
   The key set must be served in standard JWK format with `alg` and `kid` claims.

2. **Introspect** (`POST /acs/auth/introspect`): for resource servers that need
   revocation-aware validation beyond JWKS caching. Response must include `active`,
   `sub`, `actorType`, `tenantId`, `authorities`.

Validation should include: a known-good token is `active=true`; a revoked token is
`active=false`; a malformed token does not raise an exception (returns `active=false`).

## Spec de referencia

- integration-contracts.md (§2.2 inbound — resource servers → ACS)
- SPEC-01 (§1.2 JWKS, §1.3 introspect)

## Escopo

- [ ] validar endpoint `GET /acs/.well-known/jwks.json` retorna JWK Set válido e compatível com spring-security oauth2 resource server
- [ ] validar `POST /acs/auth/introspect` responde corretamente para tokens válidos, revogados e malformados

## Criterios de aceite

- [ ] AC-1 `GET /acs/.well-known/jwks.json` returns a JSON object with `keys` array; each key has `kty`, `alg`, `kid`, `use=sig`; verified by parsing with `com.nimbusds.jose.jwk.JWKSet.parse()`
- [ ] AC-2 A caregiver token minted by `JwtTokenIssuerAdapter` validates successfully against the JWKS endpoint (signature verification round-trip)
- [ ] AC-3 `POST /acs/auth/introspect` returns `active=false` for a token whose `jti` is blacklisted; returns `active=true` with correct claims for a valid token
- [ ] AC-4 `./gradlew :acs-service:integrationTest` exits 0

## Dependencias

- ACS-018 (precede — TokenIssuer adapter)
- ACS-019 (precede — blacklist)

## Estimativa

S

## Prioridade
P5
