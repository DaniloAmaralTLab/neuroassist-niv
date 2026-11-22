# FE-PAT-009 -- CommandHttpAdapter (COMMAND_PORT) — CommandWire, GesturePrimitiveWire + toCommandRow mapper

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`CommandHttpAdapter` implements `COMMAND_PORT` for all 5 operations (listByPatient, get, create, calibrate, retire); `CommandWire` and `GesturePrimitiveWire` mirror the BE records; `toCommandRow` mapper derives `gestureDescription` from primitives.

## Approach (execution path)
1. Create `command.wire.ts` with `GesturePrimitiveWire: { id, code, displayName }` and `CommandWire: { id, patientId, tenantId?, label, urgency, sensitivity, primaryPrimitive: GesturePrimitiveWire, secondaryPrimitive: GesturePrimitiveWire|null, minGestureTimeMs, maxGestureTimeMs, status, createdBy?, createdAt?, updatedAt? }` per SPEC-04 §3.
2. Create `command.port.ts` with `COMMAND_PORT` injection token.
3. Create `command.mapper.ts` with `toCommandRow(wire: CommandWire): CommandRowVM` — `gestureDescription` derived as `primaryPrimitive.displayName` + (if secondary) `' + ' + secondaryPrimitive.displayName`; `CommandEditorForm` → request body converter (primitives sent as ids on create/calibrate).
4. Create `command-http.adapter.ts`: `listByPatient(patientId)` → `GET /pat/patients/{patientId}/commands`; `create(patientId, form)` sends required fields per SPEC-04 §3 (carry-forward `http-adapter:request-body-field-whitelist`); `calibrate(id, partial)` → `PATCH /pat/commands/{id}`; `retire(id)` → `DELETE /pat/commands/{id}`; `get(id)` → `GET /pat/commands/{id}`.
5. Unit tests for mapper (gestureDescription derivation, secondary null handling) and adapter.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/data-access/src/lib/command/command.wire.ts`
- [ ] implementar `libs/pat/data-access/src/lib/command/command.port.ts`
- [ ] implementar `libs/pat/data-access/src/lib/command/command.mapper.ts`
- [ ] implementar `libs/pat/data-access/src/lib/command/command-http.adapter.ts`
- [ ] unit tests mapper + adapter
- [ ] `npx nx test pat-data-access` PASS
- [ ] `npx nx lint pat-data-access` PASS

## Acceptance criteria
- [ ] `create(patientId, form)` sends `{ label, urgency, sensitivity, primaryPrimitive, secondaryPrimitive, minGestureTimeMs, maxGestureTimeMs }` with primitives as gesture-type ids — no dropped required field (SPEC-04 §3).
- [ ] `calibrate(id, partial)` sends PATCH and awaits 200 before resolving.
- [ ] `retire(id)` sends DELETE, awaits 204 (SPEC-04 §4).
- [ ] `gestureDescription` for a compound command equals `primary.displayName + ' + ' + secondary.displayName`.
- [ ] `npx nx build pat-data-access` PASS.

## Dependencies
FE-PAT-005 (pat.providers.ts registers COMMAND_PORT).

## Tenant-context impact
Cross-tenant command access returns 404 (INV-PAT-2, server-enforced); no FE tenant branching in the adapter.

## Prioridade
P2
