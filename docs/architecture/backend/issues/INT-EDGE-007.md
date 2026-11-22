# INT-EDGE-007 -- ACS — provision edge-service service-client token with EVNT lapse authority (`evnt.detection-lapse.raise` / `evnt.detection-lapse.resolve`, G6)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

EDGE's G6 detection-lapse escalation calls EVNT with an **ACS-issued service-client JWT** carrying
EVNT-namespace authorities (`evnt.detection-lapse.raise` and `evnt.detection-lapse.resolve`).
EDGE already holds an ACS service-client token for PAT catalog reads (G2: authorities
`pat.command.read` + `pat.gesture-type.read`). ADR-005 adds two new required authorities to the
same `edge-service` service-client principal — or mints a second service-client token if ACS
supports authority-scoped tokens per request.

This INT issue tracks the ACS side: confirming that the ACS client-credentials flow for
`edge-service` can be configured to include `evnt.detection-lapse.raise` and
`evnt.detection-lapse.resolve`, and that EVNT's resource server validation will accept the ACS
JWKS-signed token with those authorities (G1: EVNT trusts ACS-issued service-client tokens for
backend-to-backend calls).

The exact authority strings are confirmed by INT-EDGE-006 when EVNT is architected.

## Spec de referencia
- integration-contracts.md §2 (G2 resolution — ACS service-client token for edge-service; `TODO[architect]` note)
- integration-contracts.md §6.2 (G6 — service-client identity: "ACS-issued service-client JWT for the `edge-service` principal … carrying the EVNT detection-lapse-raise/resolve authority")
- SPEC-06 (G2 token ownership; ACS as trust anchor for service-client tokens)

## Escopo
- [ ] confirmar (ao arquitectar ACS) que o `edge-service` service-client principal pode ser aprovisionado com `evnt.detection-lapse.raise` e `evnt.detection-lapse.resolve` via client-credentials grant ou authority-scope config
- [ ] confirmar se o token G2 (PAT authorities) e o token G6 (EVNT authorities) são o mesmo token ou dois tokens distintos emitidos pela mesma flow; actualizar `integration-contracts.md §2 TODO[architect]` note
- [ ] confirmar que EVNT's resource server validates the ACS-signed service-client token for `edge-service` using ACS JWKS (G1: EVNT trusts ACS alongside EDGE JWKS)

## Criterios de aceite
- [ ] AC-1 ACS client-credentials for `edge-service` can produce a JWT including `evnt.detection-lapse.raise` and `evnt.detection-lapse.resolve` in `authorities`
- [ ] AC-2 `integration-contracts.md §2` `TODO[architect]` note updated with the confirmed minting path (single token vs scoped second token)
- [ ] AC-3 EVNT's resource server accepts this ACS-signed token and authorises the raise/resolve endpoints (confirmed at EVNT backlog/scaffold against ACS contract)

## Dependencias
- INT-EDGE-002 (ACS service-client path baseline — this INT extends it with EVNT authorities)
- INT-EDGE-006 (confirms the exact EVNT authority strings — input to ACS provisioning config)

## Estimativa
S

## Prioridade
P4
