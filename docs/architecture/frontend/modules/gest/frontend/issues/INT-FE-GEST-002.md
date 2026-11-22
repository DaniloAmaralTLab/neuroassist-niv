# INT-FE-GEST-002 -- INT-GEST-PAT-1: compoundWindowMs — EDGE catalog provides gesture window parameters, not PAT hardcoded

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
The compound gesture timing window (`minGestureTimeMs` / `maxGestureTimeMs`) comes from the EDGE catalog response (`GET /edge/catalog → CatalogCommandWire`), NOT from a hardcoded constant in the GEST frontend; `CatalogFacade` maps `minGestureTimeMs → ActiveCommandVM.minGestureDurationMs` and `maxGestureTimeMs → maxGestureDurationMs`; `CompoundGestureStateMachine` reads ONLY from `ActiveCommandVM` (never from a module-level constant).

## Context / Problem statement
INV-GEST-2 defines the state machine window as configurable. The original design had `compoundWindowMs` as a PAT (Patient profile) setting. Architecture decision (SPEC-04 §3): the value is owned by the EDGE catalog command definition, managed per-station by the EDGE service. The PAT service does NOT provide gesture timing. This INT issue documents the confirmed data ownership and ensures FE-GEST-015 is wired correctly.

## Action required
1. Confirm with EDGE team: `minGestureTimeMs` and `maxGestureTimeMs` are present in the `GET /edge/catalog` response for each command.
2. EDGE team provides example catalog response JSON with these fields.
3. FE team verifies `CatalogFacade.toActiveCommand()` mapper (FE-GEST-010) correctly maps both fields.
4. `CompoundGestureStateMachine` (FE-GEST-015) reads `ActiveCommandVM.minGestureDurationMs / maxGestureDurationMs` — no module constant.

## Implementation checklist
- [ ] EDGE team confirms fields in catalog response
- [ ] Example catalog JSON with `minGestureTimeMs` / `maxGestureTimeMs` obtained
- [ ] FE-GEST-010 mapper verified against example response
- [ ] FE-GEST-015 state machine spec uses values from `ActiveCommandVM` (not constants)
- [ ] Close when FE-GEST-015 spec passes with values from EDGE catalog fixture

## Dependencies
- FE-GEST-008 (EdgeCatalogApiService — GET /edge/catalog)
- FE-GEST-010 (CatalogFacade — mapper)
- FE-GEST-015 (CompoundGestureStateMachine — consumer)

## Prioridade
P2
