# INT-EVNT-002 -- ACS service-client minting path for evnt-service (client-credentials principal provisioning)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Contexto

EVNT calls PAT (`GET /pat/commands/{id}`) and HIST (`POST /audit`) using an **ACS-issued
service-client JWT** for the `evnt-service` principal. EVNT also uses a service-client token
for ACS introspection. The minting path (client-credentials grant vs provisioned principal) is
an ACS concern flagged OPEN by EDGE and PAT too; it must be confirmed against the live ACS
contract before EVNT-012, EVNT-013, and EVNT-014 can obtain a real token. EVNT's side is fixed:
a cached service-client JWT carrying `pat.command.read` (and `hist.audit.write` if separate).
`evnt-service` principal ID and secret are configured via `EVNT_SERVICE_CLIENT_ID` +
`EVNT_SERVICE_CLIENT_SECRET` (see `setup-local.md`).

## Spec de referencia
- docs/architecture/backend/services/evnt-service/contracts/integration-contracts.md §2, §3, §4
- docs/architecture/backend/services/evnt-service/setup-local.md

## Escopo
- [ ] ACS team to confirm client-credentials grant endpoint and `evnt-service` principal registration
- [ ] EVNT-012 (PatCommandFeignClient) to integrate the minted token before the first ingest call
- [ ] EVNT-013 (AcsClient) to use the service-client token for introspection
- [ ] EVNT-014 (HistAuditFeignClient) to use the service-client token for audit calls

## Criterios de aceite
- [ ] AC-1 ACS exposes a client-credentials grant endpoint and registers `evnt-service` as a service principal
- [ ] AC-2 `evnt-service` can obtain a service-client JWT carrying `pat.command.read` using `EVNT_SERVICE_CLIENT_ID` + `EVNT_SERVICE_CLIENT_SECRET`
- [ ] AC-3 `GET /pat/commands/{id}` succeeds with the service-client token (not the edge.device token)
- [ ] AC-4 Token is cached in-process and refreshed before expiry (not re-fetched per request)

## Dependencias
- EVNT-012 (PatCommandFeignClient — requires the minted token)
- EVNT-013 (AcsClient — introspection service-client)
- EVNT-014 (HistAuditFeignClient — requires the minted token)

## Estimativa
S

## Prioridade
P4
