# INT-CONV-005 -- INT-CONV-5: TRN consent upstream — CONV assumes published version already consented at TRN authoring; no consent capture in CONV (ADR-005 G1/G2, SPEC-10)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

Cross-module coordination issue (implementation tracked in TRN). CONV assumes that every tree
version published via `POST /conv/trees` has already been consented by both caregiver and patient
at TRN authoring time (ADR-005 G1/G2: consent is captured by TRN before the dual-authorization
(`caregiverConfirmed`/`patientConfirmed`) is complete; only fully-approved content reaches CONV).
CONV captures no consent of its own. This is an architectural boundary: TRN must not publish
to CONV until the dual authorization is complete; CONV trusts the `sourceVersionRef` in the
publish payload as the consent receipt (pointing to the TRN-side approval record).

## Escopo
- [ ] documentar no TRN publish flow que CONV publish MUST only be called after `caregiverConfirmed AND patientConfirmed` are both true in the TRN approval record

## Spec de referencia
- integration-contracts.md §4
- SPEC-10 §consent-upstream
- ADR-005 (patient-voice TTS boundary + consent)

## Criterios de aceite
- [ ] AC-1 TRN publish flow spec includes a gate: "do not call `POST /conv/trees` unless `approval.caregiverConfirmed = true AND approval.patientConfirmed = true`"
- [ ] AC-2 CONV's `POST /conv/trees` body includes `sourceVersionRef` = TRN approval id; CONV stores it in `tree_version.source_version_ref` for traceability (api-contract §5)

## Dependencias
- CONV-006 (precede — CONV stores sourceVersionRef in TreeVersion)

## Estimativa
S

## Prioridade
P5
