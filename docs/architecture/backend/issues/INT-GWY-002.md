# INT-GWY-002 -- EDGE — confirm GET /edge/.well-known/jwks.json exact path and iss claim value for GWY ReactiveAuthenticationManagerResolver routing key

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

GWY's `ReactiveAuthenticationManagerResolver` (GWY-004) must also route EDGE-signed
`edge.device` tokens to the EDGE decoder. This INT issue asks the EDGE team to confirm:
(1) the exact `iss` claim value in EDGE-minted `edge.device` tokens, (2) that
`GET /edge/.well-known/jwks.json` is reachable at that path behind the gateway's
`/edge/**` route (confirmed CONFIRMED: G3 closed). Missing the EDGE issuer string
is Risk R1: if only ACS is wired, every `edge.device` request is rejected at the edge.

## Spec de referencia

- `integration-contracts.md` §2 (EDGE JWKS URI config key `gateway.jwks.edge-uri`)
- SPEC-03 (multi-issuer JWT, Risk R1)
- `docs/architecture/backend/services/edge-service/contracts/api-contract.md` (source for EDGE issuer value)
- ADR-002 (`adr/ADR-002-edge-jwt-validation-defense-in-depth.md`)

## Escopo

- [ ] EDGE team confirms the exact `iss` claim value in `edge.device` tokens minted by `edge-service`
- [ ] EDGE team confirms `GET /edge/.well-known/jwks.json` is exposed at that exact path (G3 already CONFIRMED the path)
- [ ] GWY team wires the confirmed `iss` value as the EDGE decoder routing key in `MultiIssuerJwtConfig`

## Resultado esperado

The `iss` claim value for EDGE-minted `edge.device` tokens is confirmed and wired into
GWY's `ReactiveAuthenticationManagerResolver` so EDGE-signed tokens are admitted.

## Criterios de aceite

- [ ] AC-1 The EDGE issuer string is documented in `edge-service/contracts/api-contract.md` or `edge-service/spec/backend/SPEC-05-*.md` and matches the value in `gateway.jwks.edge-uri` routing config
- [ ] AC-2 `GET /edge/.well-known/jwks.json` returns a valid JWK set when EDGE is running
- [ ] AC-3 GWY integration test `GatewayAuthIT` (GWY-004) passes for a valid EDGE-signed `edge.device` token after this information is wired (Risk R1 anti-regression)

## Dependencias

Nenhuma (prerequisite for GWY-004).

## Estimativa

S

## Prioridade
P2
