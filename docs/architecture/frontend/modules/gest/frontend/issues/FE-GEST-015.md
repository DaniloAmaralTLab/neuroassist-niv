# FE-GEST-015 -- CompoundGestureStateMachine — idle→primaryHeld→awaitingSecondary→recognised, detectable gate hook, never arm non-detectable command (INV-GEST-2, INV-GEST-7)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`CompoundGestureStateMachine` runs `idle → primaryHeld → awaitingSecondary → recognised` (or timeout→idle); before transitioning from `idle` it checks `command.detectable === true` — a command whose primitives are not all supported stays in `idle` and is NEVER armed (INV-GEST-7); recognition emits `{commandId, confidence, recognitionWindowMs}` with `recognitionWindowMs` derived from elapsed time vs `minGestureDurationMs/maxGestureDurationMs` from the EDGE catalog (INT-GEST-PAT-1 → INT-FE-GEST-002).

## Approach (execution path)
1. State machine states: `idle`, `primaryHeld`, `awaitingSecondary`, `recognised`.
2. On `primitiveDetected(code, confidence)`:
   - From `idle`: if `command.detectable === false` → remain `idle` (gate INV-GEST-7); if `code === command.primaryPrimitive.code && confidence >= threshold` → `primaryHeld`, stamp `startMs`.
   - From `primaryHeld`: elapsed > `maxGestureDurationMs` → back to `idle`; if `command.secondaryPrimitive` and `code === secondary.code && confidence >= threshold && elapsed >= minGestureDurationMs` → `recognised`.
   - For simple commands (no secondary): from `primaryHeld`, if `elapsed >= minGestureDurationMs && confidence >= threshold` → `recognised`.
3. On `recognised`: emit `{commandId, confidence, recognitionWindowMs: elapsed}` to `commandRecognised$`; debounce cooldown before re-arming.
4. `ActiveCommandVM.detectable` checked at the START of each `primitiveDetected` to prevent race if support changes mid-session.
5. Spec: (a) `detectable=false` → no transition from `idle` (INV-GEST-7); (b) compound within window → `recognised`; (c) compound past `maxGestureDurationMs` → timeout, back to `idle`; (d) simple gesture (no secondary) → `recognised` on primary hold for `>= minGestureDurationMs`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/detection/src/lib/compound-gesture-state-machine.ts`
- [ ] implementar `frontend/libs/gest/detection/src/lib/compound-gesture-state-machine.spec.ts`
- [ ] `detectable=false` → remain `idle` (INV-GEST-7 gate)
- [ ] `maxGestureDurationMs` timeout → back to `idle`
- [ ] `recognitionWindowMs` derived from `elapsed` time (from EDGE catalog window, not hardcoded)
- [ ] Debounce cooldown after recognition before re-arming
- [ ] No `HttpClient` import (pure domain)
- [ ] `npx nx test gest-detection` PASS
- [ ] `npx nx build gest-detection` PASS

## Acceptance criteria
- [ ] Spec proves `detectable=false` → no `commandRecognised` event emitted (INV-GEST-7)
- [ ] Window values come from `ActiveCommandVM` (EDGE catalog), never hardcoded (INT-FE-GEST-002)
- [ ] `npx nx test gest-detection` PASS

## Dependencies
- FE-GEST-010 (CatalogFacade — `ActiveCommandVM.detectable`, `minGestureDurationMs`, `maxGestureDurationMs`)
- FE-GEST-014 (ClassifierService — confidence scores)
- INT-FE-GEST-002 (window values from PAT→EDGE catalog)

## Tenant-context impact
None — pure local state machine; command catalog is per-station.

## Prioridade
P3
