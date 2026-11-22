# INT-TRN-001 -- [COORDINATION] ACS issues TRN service-client token with conv.tree.publish + conv.tree-version.retire + conv.audio.delete + hist.audit.record + pat.patient.read authorities (closes TRN side of CONV INT-CONV-2)

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
Cross-module coordination: ACS must issue the TRN service-client token with five specific authorities: `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete`, `hist.audit.record`, `pat.patient.read`. Without them, every outbound TRN call returns 403. This closes the TRN side of CONV INT-CONV-2 (the CONV half already declared the obligation to seed these `conv.*` codes in V0077). The `hist.audit.record` and `pat.patient.read` codes are seeded by HIST/PAT respectively; TRN only consumes them.

## Spec de referencia
- integration-contracts.md §5 (INT-TRN-1)
- SPEC-10 §service-client token

## Escopo
- [ ] coordenar com ACS/HIST/PAT/CONV para garantir que as 5 authorities estejam seeded antes do primeiro deploy do trn-service em staging
- [ ] verificar que ServiceClientTokenProvider (TRN-021) obtém token com as 5 authorities via ACS

## Criterios de aceite
- [ ] AC-1 The TRN service-client token (minted by ACS and held by TRN) includes the five authorities in its `authorities` claim; verified by an ACS+TRN integration test against a real ACS instance or a stub.
- [ ] AC-2 `POST /conv/trees` with the TRN service-client token returns `201` (not `403`); verified against a CONV stub or real CONV instance.

## Dependencias
- CONV-009 (V0077 seeds `conv.*` authorities — CONV side must run first)
- TRN-021 (precede — ServiceClientTokenProvider must be implemented)

## Estimativa
S

## Prioridade
P4
