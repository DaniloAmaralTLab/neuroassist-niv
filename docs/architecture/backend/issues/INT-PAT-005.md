# INT-PAT-005 -- LGPD erasure strategy — deferred decision for PAT soft-delete vs HIST immutability

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

PAT's data-model §6 explicitly defers LGPD erasure (G4): patient and command rows are
retained with soft-delete (`active`/`inactive` and `active`/`retired`) so HIST audit
entries and historical EVNT `Event` rows keep resolving their `patient_id`/`command_id`
references. The spec notes: "erasure must later reconcile with HIST immutability and id
references held by ACS/EDGE/EVNT/CONV."

This is a cross-module decision: erasing a PAT patient row would orphan HIST audit
records (which are immutable), EVNT event rows that reference `command_id`, and
EDGE/CONV references to `patient_id`. The erasure strategy requires a coordinated
decision with the HIST, EVNT, ACS, EDGE and CONV teams before any erasure endpoint
is implemented. This issue tracks the deferred decision — no implementation is
expected in the current scaffold phase.

## Spec de referencia

- data-model.md (§6 data lifecycle, G4 LGPD deferred)
- SPEC-04 (data lifecycle, erasure note)

## Escopo

- [ ] documentar a estratégia de erasure LGPD PAT (coordinate with HIST, EVNT, ACS, EDGE, CONV owners)
- [ ] registrar a decisão final como um ADR no PAT (adr/ ou global adr/)

## Criterios de aceite

- [ ] AC-1 O ADR de erasure LGPD PAT existe e define como reconciliar a remoção com a imutabilidade do HIST
- [ ] AC-2 Nenhum endpoint de erasure é implementado antes do ADR ser aceito (guard: revisão do arquiteto)

## Dependencias

- Nenhuma (issue de planejamento / ADR — precede qualquer endpoint de erasure)

## Estimativa

L

## Prioridade
P9
