# INT-EDGE-002 -- ACS — confirm service-client token minting path for edge-service principal (G2 TODO[architect], client-credentials vs provisioned principal)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

**ACS service-client credential for edge-service (G2).** EDGE calls PAT's command catalog endpoint
using an ACS-issued service-client token carrying `pat.command.read` + `pat.gesture-type.read`
(integration-contracts.md §1.1, §2). The exact ACS minting path — client-credentials grant vs a
provisioned service principal enrolled in ACS — is an **ACS concern not yet fully specified** in the
ACS api-contract (same open item that PAT raised as INT-PAT-001). EDGE's side is fixed: a cached
service-client JWT carrying the PAT authorities; ACS must provision the `edge-service` principal.

**Action:** confirm the ACS client-credentials grant endpoint, the `clientId`/`clientSecret` provisioning
procedure, and the token scope for `edge-service` against the live ACS contract at scaffold time.

## Spec de referencia
- integration-contracts.md §1.1 (G2 — service-client for PAT pull), §2 (ACS service-client acquisition)

## Escopo
## Criterios de aceite
- [ ] AC-1 ACS client-credentials grant endpoint confirmed and documented in `integration-contracts.md §2`
- [ ] AC-2 `edge-service` service principal registered in ACS with `pat.command.read` + `pat.gesture-type.read` authorities
- [ ] AC-3 EDGE-016 (`AcsClient`) updated with the confirmed token-acquisition path

## Dependencias
- EDGE-016 (AcsClient service-client acquisition — blocked until this resolves)
- Requires ACS scaffold phase

## Estimativa
S

## Prioridade
P4
