# INT-HIST-006 -- GEST documentation amendment (divergence #8) — GEST cites ADR-005, drops best-effort note; GEST hard-502 for all 4 facts (fail-closed equivalent); HIST tolerates divergences 1-7 in ingest adapter; amendment is doc-only

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Contexto

The HIST–GEST integration analysis revealed 8 envelope divergences (event-contracts.md §2).
Divergences 1-7 are structural format differences that HIST's `EnvelopeReconciliationAdapter`
(HIST-003) handles transparently. Divergence #8 is a **policy alignment** issue:

GEST docs currently include a "best-effort" note suggesting that GEST tolerates HIST being
unavailable. Under ADR-005, all GEST facts are classified as hard-502 (non-safety catalog
facts — fail-closed). The "best-effort" framing contradicts this classification.

The required fix is **doc-only**:
- GEST event-contracts or GEST integration docs must cite ADR-005.
- The "best-effort" note must be removed or replaced with the explicit "hard-502 (fail-closed)"
  classification.
- No GEST code re-scaffold is needed; the HIST ingest adapter already handles divergences 1-7.

## Spec de referencia

- event-contracts.md §2 (GEST divergence #8 — policy alignment)
- integration-contracts.md (HIST–GEST classification)
- ADR-005 (failure policy — GEST facts → hard-502)

## Escopo

- [ ] GEST: update `docs/architecture/backend/services/gest-service/contracts/event-contracts.md` to cite ADR-005 and reclassify all 4 GEST facts as hard-502

## Criterios de aceite

- [ ] AC-1 GEST event-contracts.md no longer contains any "best-effort" language for audit calls
- [ ] AC-2 GEST event-contracts.md explicitly cites ADR-005 and labels all 4 facts (EngineVersionRegistered, EngineVersionDeprecated, EngineCapabilityDeclared, EngineCapabilityRetired) as hard-502
- [ ] AC-3 No GEST code change accompanies this amendment (doc-only)

## Dependencias

- Nenhuma dependência de código

## Estimativa

XS

## Prioridade
P9
