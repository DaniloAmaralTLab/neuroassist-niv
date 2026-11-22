# INT-EDGE-006 -- EVNT — expose `POST /evnt/detection-lapses` and `POST /evnt/detection-lapses/{lapseId}/resolution` (G6, SAFETY-GEST-1)

**Status:** INTACT -- gerado 2026-11-20 (SAFETY-GEST-1 amendment)
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

EDGE's G6 lapse escalation call (integration-contracts §6.2, ADR-005) sends two requests to EVNT
when it half-owns the contract. EVNT has not yet been architected, so EDGE commits only to the
**shape** it expects (the endpoint and idempotency semantics). This INT issue tracks the EVNT side.

EDGE sends:
- **Raise:** `POST {evnt.baseUrl}/evnt/detection-lapses` with service-client JWT carrying an
  EVNT-namespace authority (e.g. `evnt.detection-lapse.raise`), `Idempotency-Key: <evnt_idempotency_key>`,
  `X-Correlation-Id`, and payload `{ deviceId, patientId, tenantId, cause, detectionState,
  reason, lastDetectingAt, lapseStartedAt, engineVersion }`.
- **Resolve:** `POST {evnt.baseUrl}/evnt/detection-lapses/{lapseId}/resolution` with same
  service-client identity, `X-Correlation-Id`, body `{ deviceId, tenantId }`.

EVNT must deduplicate raises by `Idempotency-Key` and must expose both endpoints with the
authority EVNT chooses. EVNT ADR-005 owns the escalation ladder (push → SMS → voice).

## Spec de referencia
- integration-contracts.md §6.2 (G6 — EDGE's side; endpoint shape; payload; `INT TODO[architect]` block)
- SPEC-10 (integrations G6 — EVNT detection-lapse contract)
- ADR-005-detection-state-and-lapse-alert.md §Decisão point 3 (EVNT owns escalation)

## Escopo
- [ ] confirmar (ao arquitectar EVNT) os paths exactos `POST /evnt/detection-lapses` e `POST /evnt/detection-lapses/{lapseId}/resolution`; actualizar `integration-contracts.md §6.2` com os paths e authority confirmados
- [ ] confirmar a authority string em namespace EVNT (e.g. `evnt.detection-lapse.raise` / `evnt.detection-lapse.resolve`) e alimentar INT-EDGE-007 (ACS service-client provisioning)
- [ ] confirmar a semântica de idempotência (EVNT deduplica por `Idempotency-Key` → `200` ou `201` em retries — align com EDGE's one-open-episode invariant INV-EDGE-10)

## Criterios de aceite
- [ ] AC-1 `integration-contracts.md §6.2` `INT TODO[architect]` block replaced with confirmed endpoint paths and authority strings when EVNT is architected
- [ ] AC-2 EVNT deduplicates raises by `Idempotency-Key`; a retried raise returns 2xx without opening a second escalation
- [ ] AC-3 `POST /evnt/detection-lapses/{lapseId}/resolution` accepts the EDGE resolve payload and closes the EVNT-side escalation

## Dependencias
- INT-EDGE-007 (ACS must mint the service-client token with the EVNT authority confirmed here)
- EDGE-032 (EvntLapseClient — uses placeholder until this INT is resolved; update url_prop once confirmed)

## Estimativa
S

## Prioridade
P4
