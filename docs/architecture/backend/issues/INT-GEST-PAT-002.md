# INT-GEST-PAT-002 -- PAT/DASH to consume GEST support-check to surface "not yet detectable" advisory marker

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto
When a caregiver maps a command to a gesture primitive in PAT's calibration UX, PAT/DASH must warn
the caregiver if the currently deployed engine cannot detect that primitive — the INV-PAT-6 "not yet
detectable" marker. GEST provides the read contract (`POST /gest/capabilities/support-check`);
PAT/DASH own the call and the UI rendering. GEST's posture is advisory: it must still allow the
mapping even when `detectable = false` (INV-GEST-4). This issue is handed to PAT/DASH.

## Spec de referencia
- contracts/integration-contracts.md §5 (INT-GEST-PAT-2)
- SPEC-10 (integrations §4)
- contracts/api-contract.md §3.3 (support-check contract)

## Escopo
- [ ] PAT/DASH to call `POST /gest/capabilities/support-check` with the target `engineVersion` and
  `gestureTypeCode(s)` when a caregiver maps a command to a primitive.
- [ ] PAT/DASH to render a non-blocking "not yet detectable" indicator when `detectable = false`;
  the mapping is still allowed (advisory, INV-GEST-4).

## Resultado esperado
Calibration UX shows the "not yet detectable" badge when the mapped gesture primitive is absent from
the GEST registry for the current engine version. GEST service has no change.

## Criterios de aceite
- [ ] AC-1: PAT/DASH calls `support-check` with the `engineVersion` active at the time of mapping and the chosen `gestureTypeCode`(s); `detectable=false` triggers a UI warning, not a block.
- [ ] AC-2: GEST service has NO change as a result of this issue. GEST does not know PAT's engine selection and renders no UI.

## Dependencias
- GEST-004 (precede — SupportCheckController, the read surface that PAT/DASH will consume)

## Estimativa
M

## Prioridade
P4
