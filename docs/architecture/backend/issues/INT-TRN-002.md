# INT-TRN-002 -- [COORDINATION] TRN gates POST /conv/trees on completed dual-authorization (both halves, distinct actors); sourceVersionRef = "trn:approval:<approvalId>" in publish body (closes TRN side of CONV INT-CONV-5)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
Cross-module coordination: TRN must gate every `POST /conv/trees` call on completed dual-authorization (both halves present, distinct actors, INV-TRN-1) and include `sourceVersionRef = "trn:approval:<approvalId>"` in the request body. This closes the TRN side of CONV INT-CONV-5 — CONV captures the `sourceVersionRef` as the consent receipt (ADR-005 G1/G2). The CONV half (`INT-CONV-5`) already declared the obligation to store and enforce `sourceVersionRef`.

## Spec de referencia
- integration-contracts.md §5 (INT-TRN-2)
- SPEC-10 §TreePublicationPort (sourceVersionRef)

## Escopo
- [ ] `SynthesizeAndPublishService` (TRN-024): assert `authorization.caregiver_confirmed_at IS NOT NULL` AND `authorization.patient_confirmed_at IS NOT NULL` before dispatching any publish outbound_job
- [ ] `ConvClient`/`PublishTreeRequest` (TRN-016): include `sourceVersionRef = "trn:approval:<approvalId>"` in the outgoing body

## Criterios de aceite
- [ ] AC-1 TRN never calls `POST /conv/trees` unless `authorization.caregiver_confirmed_at IS NOT NULL AND authorization.patient_confirmed_at IS NOT NULL` (enforced in `SynthesizeAndPublishService`).
- [ ] AC-2 The publish request body includes `sourceVersionRef = "trn:approval:<approvalId>"`; verified by a `ConvClient` unit test capturing the outgoing request.

## Dependencias
- TRN-009 (precede — DualAuthorizationService must be implemented)
- TRN-016 (precede — ConvClient must accept sourceVersionRef field)

## Estimativa
S

## Prioridade
P5
