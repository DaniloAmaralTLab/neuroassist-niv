# INT-PAT-001 -- ACS service-client token minting — confirm authority-grant path with ACS at scaffold

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

PAT's catalog-distribution contract (integration-contracts §4) depends on detection-side
services (GEST/EDGE/EVNT backends) presenting an ACS-issued token whose `actorType` is a
service/platform client and whose `authorities` include `pat.command.read` and
`pat.gesture-type.read`. The exact ACS mechanism that mints such a service-client token
(client-credentials vs a provisioned service principal) is an ACS concern — PAT only requires
the token to carry the right authorities and NOT be a `patient-session` token (INV-PAT-7).
This TODO[architect] was left open in `integration-contracts.md §4` and must be confirmed
against the live ACS contract before PAT's ACS infrastructure adapter (PAT-014) can be
finalized.

## Spec de referencia

- integration-contracts.md (§4, TODO[architect] service-client token minting)
- SPEC-06 (authority model, detection service client row)
- SPEC-03 (catalog distribution, ADR-004 service-client authority)

## Escopo

- [ ] confirmar mecanismo de emissão de token service-client no ACS (client-credentials ou principal provisionado)
- [ ] validar que o token resultante carrega `pat.command.read` e `pat.gesture-type.read` como authorities
- [ ] registrar a decisão no ACS e atualizar integration-contracts.md §4

## Criterios de aceite

- [ ] AC-1 O mecanismo de emissão de token service-client para GEST/EDGE/EVNT é documentado em integration-contracts.md §4 (sem TODO[architect])
- [ ] AC-2 Um teste de integração WireMock confirma que PAT aceita um token service-client com `pat.command.read` e rejeita um `patient-session` token com `403` (INV-PAT-7)
- [ ] AC-3 `./gradlew :pat-service:integrationTest` exits 0 cobrindo o caminho service-client vs patient-session

## Dependencias

- PAT-014 (precede — ACS adapter)
- ACS-002 (esclarece o mecanismo de token; verificar antes de PAT-014)

## Estimativa

M

## Prioridade
P4
