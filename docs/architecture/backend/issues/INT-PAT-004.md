# INT-PAT-004 -- GEST/EDGE catalog pull contract — verify ETag/304 consumer integration (SPEC-03, ADR-004)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

PAT's catalog-distribution contract (SPEC-03, ADR-004) specifies that detection services
(GEST, EDGE) pull the active command catalog via `GET /pat/patients/{patientId}/commands?status=active`
using an ACS-issued service-client token. PAT returns a strong `ETag` and honors `If-None-Match`
with `304 Not Modified` to minimize re-downloads on the constrained edge link.

The integration contract between PAT (producer) and GEST/EDGE (consumers) must be verified
end-to-end: PAT produces a stable ETag, GEST/EDGE correctly use `If-None-Match`, and the
offline staleness bound is owned by EDGE (ADR-004 trade-off). This issue tracks the cross-service
verification rather than the PAT-side implementation (covered in PAT-010).

## Spec de referencia

- SPEC-03 (catalog distribution, ETag/304, ADR-004 §3.2)
- integration-contracts.md (§4 inbound — GEST/EDGE consumer contract)

## Escopo

- [ ] verificar que GEST-service e EDGE-service utilizam o cabeçalho `If-None-Match` corretamente ao consumir o catálogo PAT
- [ ] confirmar o acordo de staleness: EDGE opera com o último catálogo conhecido até poder recarregar (ADR-004 trade-off)
- [ ] documentar o contrato ETag verificado em integration-contracts.md §4

## Criterios de aceite

- [ ] AC-1 Um teste de integração PAT ↔ GEST/EDGE mock verifica que PAT responde 304 quando o ETag coincide
- [ ] AC-2 integration-contracts.md §4 documenta explicitamente a política de staleness offline do EDGE
- [ ] AC-3 `./gradlew :pat-service:integrationTest` exits 0 cobrindo o fluxo ETag/304

## Dependencias

- PAT-010 (precede — ETag/304 implementado no CommandController)

## Estimativa

M

## Prioridade
P4
