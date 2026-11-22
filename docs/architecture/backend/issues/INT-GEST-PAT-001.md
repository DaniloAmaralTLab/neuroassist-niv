# INT-GEST-PAT-001 -- PAT to add compoundWindowMs to Command aggregate for compound-gesture inter-primitive timing

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
A compound command is an ordered sequence of primitives. The station needs the maximum allowed gap
between consecutive primitives (`compoundWindowMs`) to recognise it. PAT's `Command` currently carries
only `minGestureDurationMs` / `maxGestureDurationMs` (single-gesture duration bounds) and lacks the
inter-primitive gap field. GEST's recommendation: PAT owns `compoundWindowMs` on `Command` as a
patient-tunable clinical parameter (see `integration-contracts.md §4`). GEST stores nothing about
timing; this issue is handed to PAT.

## Spec de referencia
- contracts/integration-contracts.md §4 (INT-GEST-PAT-1)
- SPEC-10 (integrations §3)

## Escopo
- [ ] PAT to add `compoundWindowMs` (int, milliseconds) to the `Command` aggregate and its calibration
  contract / EDGE catalog projection, with a conservative default.
- [ ] PAT to surface `compoundWindowMs` in the calibration UX alongside the existing duration bounds.

## Resultado esperado
`GET /edge/catalog` (EDGE cache ← PAT) includes `compoundWindowMs` per command. Station reads the
inter-primitive window from the catalog and no longer relies on a hardcoded FE default.

## Criterios de aceite
- [ ] AC-1: PAT `Command` data model includes `compoundWindowMs` (int, ms, non-null, default ≥ 300ms per product team guidance) and the field is included in the EDGE catalog projection.
- [ ] AC-2: GEST service has NO change as a result of this issue. `gest-service` stores no timing data and makes no call to fetch it.

## Dependencias
Nenhuma (issue handed to PAT; GEST does not block on it).

## Estimativa
M

## Prioridade
P4
