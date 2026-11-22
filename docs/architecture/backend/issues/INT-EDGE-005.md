# INT-EDGE-005 -- G-EDGE-2 — FE device-version field gap: FE displays device version but BE api-contract has no version field (open decision: add to data-model or drop from FE)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/2 itens

## Contexto

**G-EDGE-2 — FE device `version` field gap.** The FE design reference (frontend/design-reference)
displays a device `version` field (e.g., firmware version or software version) on the device card.
However, the BE api-contract (`api-contract.md §2.2/2.3`) and `data-model.md §2.2 (edge_device table)`
contain **no `version` field**. This creates an FE→BE contract gap: either the BE must add the
field, or the FE must remove it.

**Decision required:**
- Option A: Add `version` (or `softwareVersion`, `firmwareVersion`) to `edge_device`, `api-contract.md §2.3`
  and `data-model.md §2.2` (backward-additive migration in V0032).
- Option B: Remove the `version` display from the FE design reference as out of scope for MVP.

## Spec de referencia
- api-contract.md §2.2–2.3 (device list/read body — no version field)
- data-model.md §2.2 (edge_device schema — no version column)

## Escopo
## Criterios de aceite
- [ ] AC-1 Decision (Option A or B) documented and reflected consistently in `api-contract.md` and `data-model.md`
- [ ] AC-2 If Option A: `edge_device` migration `V0032` adds the version column; `DeviceResponse` DTO updated in EDGE-005
- [ ] AC-3 If Option B: FE design reference removes the `version` display from device card

## Dependencias
- EDGE-005 (DeviceResponse DTO — may need version field if Option A)
- Requires architect + stakeholder decision

## Estimativa
S

## Prioridade
P2
