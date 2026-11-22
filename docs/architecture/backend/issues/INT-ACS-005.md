# INT-ACS-005 -- GWY routing + X-Correlation-Id propagation (ACS behind gateway, /acs base path)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

ACS is fronted by GWY (`neuroassist-niv-api-gateway`). This integration issue validates:

1. **Gateway routing**: GWY must have a route that forwards `Path=/acs/**` requests to
   `lb://acs-service` (Eureka load-balanced). The controller base path `/acs` must match
   the gateway predicate exactly (pitfall
   `api-controller:base-path-from-service-name:contract-base-path-ignored-endpoints-unreachable`
   — base path is `/acs`, not `/acs-service`).

2. **X-Correlation-Id generation**: GWY generates `X-Correlation-Id` if the request does
   not carry one, then ACS echoes it on the response and on every downstream HIST call
   (api-contract §0.1).

3. **Public endpoint passthrough**: `/acs/auth/login` and `/acs/.well-known/jwks.json` must
   not require a JWT at the gateway level (GWY must not add `BearerTokenRelay` for public
   paths).

This issue only documents the GWY configuration requirements; GWY scaffold is owned by
the GWY module. The ACS side (base path, header propagation) is validated here.

## Spec de referencia

- SPEC-01 (§0.1 mandatory headers, §0 base path /acs)
- integration-contracts.md (§2.2 inbound direction via GWY)

## Escopo

- [ ] documentar no `docs/architecture/backend/services/acs-service/setup-local.md` os requisitos de rota do GWY para ACS
- [ ] validar que todos os controllers ACS usam base path `/acs` e não `/acs-service`

## Criterios de aceite

- [ ] AC-1 All ACS controllers use `@RequestMapping("/acs")` (or subpath); grep for `@RequestMapping.*acs-service` returns zero hits in `src/main/java/com/neuroassist/acs/api/`
- [ ] AC-2 GWY application.yml (when ACS routes are added) has `Path=/acs/**` predicate pointing to `lb://acs-service` — documented in ACS `setup-local.md` as a GWY routing requirement
- [ ] AC-3 `CorrelationIdFilter` generates a UUID `X-Correlation-Id` when the request header is absent (GWY absent in test) and echoes it on the response
- [ ] AC-4 `./gradlew :acs-service:test` exits 0

## Dependencias

- ACS-004 (precede — controllers must use correct base path)
- ACS-019 (precede — CorrelationIdFilter)

## Estimativa

S

## Prioridade
P1
