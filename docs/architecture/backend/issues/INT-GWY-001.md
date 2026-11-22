# INT-GWY-001 -- ACS — confirm GET /acs/.well-known/jwks.json exact path and iss claim value for GWY ReactiveAuthenticationManagerResolver routing key

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

GWY's `ReactiveAuthenticationManagerResolver` (GWY-004) routes each JWT to the correct
decoder by inspecting the `iss` claim. For this to work, the ACS issuer string in its
minted tokens must match the key used to select the ACS decoder in the resolver, and
the JWKS endpoint at `/acs/.well-known/jwks.json` must actually return a valid JWK set.
This INT issue asks the ACS team to confirm: (1) the exact `iss` claim value in
ACS-minted tokens (caregiver and patient-session), (2) that `GET /acs/.well-known/jwks.json`
is reachable at that path behind the gateway's `/acs/**` route. Without these, GWY-004
cannot be wired.

## Spec de referencia

- `integration-contracts.md` §2 (ACS JWKS URI config key `gateway.jwks.acs-uri`)
- SPEC-03 (multi-issuer JWT)
- `docs/architecture/backend/services/acs-service/contracts/api-contract.md` (source of truth for the issuer value)

## Escopo

- [ ] ACS team confirms the exact `iss` claim value in tokens minted by `acs-service`
- [ ] ACS team confirms `GET /acs/.well-known/jwks.json` is exposed by `acs-service` at that exact path
- [ ] GWY team wires the confirmed `iss` value as the ACS decoder routing key in `MultiIssuerJwtConfig`

## Resultado esperado

The `iss` claim value for ACS-minted tokens is confirmed and wired into GWY's
`ReactiveAuthenticationManagerResolver` so ACS-signed tokens are admitted.

## Criterios de aceite

- [ ] AC-1 The ACS issuer string is documented in `acs-service/contracts/api-contract.md` or `acs-service/spec/backend/SPEC-05-*.md` and matches the value in `gateway.jwks.acs-uri` routing config
- [ ] AC-2 `GET /acs/.well-known/jwks.json` returns a valid JWK set when ACS is running
- [ ] AC-3 GWY integration test `GatewayAuthIT` (GWY-004) passes for a valid ACS-signed token after this information is wired

## Dependencias

Nenhuma (prerequisite for GWY-004).

## Estimativa

S

## Prioridade
P2
