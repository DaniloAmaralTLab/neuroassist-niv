# FE-PAT-011 -- GestureTypeHttpAdapter (GESTURE_TYPE_PORT) + GestureTypeWire + GestureTypeFacade

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`GestureTypeHttpAdapter` implements `GESTURE_TYPE_PORT` (list, get, register); `GestureTypeFacade` exposes `types()` as a session-lived readonly signal; `GestureTypeWire` mirrors the BE record; `toGestureType` maps wire → VM.

## Approach (execution path)
1. Create `gesture-type.wire.ts` with `GestureTypeWire: { id, code, displayName, description? }` per SPEC-04 §3.
2. Create `gesture-type.port.ts` with `GESTURE_TYPE_PORT` injection token.
3. Create `gesture-type.mapper.ts` with `toGestureType(wire: GestureTypeWire): GestureTypeVM` — `description?` modelled as explicitly absent when missing.
4. Create `gesture-type-http.adapter.ts`: `list()` → `GET /pat/gesture-types`; `get(id)` → `GET /pat/gesture-types/{id}`; `register(form)` → `POST /pat/gesture-types` sends `{ code, displayName, description }` (SPEC-04 §3).
5. Create `gesture-type.facade.ts`: `types()` readonly signal fetched on each catalog navigation (session-lived cache; SPEC-04 §1); `register(form)` pessimistic (await 201, select returned type in open slot); `register` maps `gesture-type-code-taken` (409) → field error on new-type code (SPEC-07).
6. Engine-support caveat: `register` surfaces that naming a type does not imply detection engine support (R1, INV-PAT-6) — this is a UI concern, not a data-access concern (SPEC-02 §1).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/data-access/src/lib/gesture-type/gesture-type.wire.ts`
- [ ] implementar `libs/pat/data-access/src/lib/gesture-type/gesture-type.port.ts`
- [ ] implementar `libs/pat/data-access/src/lib/gesture-type/gesture-type.mapper.ts`
- [ ] implementar `libs/pat/data-access/src/lib/gesture-type/gesture-type-http.adapter.ts`
- [ ] implementar `libs/pat/data-access/src/lib/gesture-type/gesture-type.facade.ts`
- [ ] unit tests facade + mapper
- [ ] `npx nx test pat-data-access` PASS
- [ ] `npx nx lint pat-data-access` PASS

## Acceptance criteria
- [ ] `register(form)` sends `{ code, displayName, description }` to `POST /pat/gesture-types`; on 201 selects the returned type in the open gesture slot.
- [ ] `gesture-type-code-taken` (409) maps to field error on new-type code, not a global toast (SPEC-07).
- [ ] `types()` signal is refreshed on each catalog navigation (no stale cross-session cache).
- [ ] `npx nx build pat-data-access` PASS.

## Dependencies
FE-PAT-005 (pat.providers.ts registers GESTURE_TYPE_PORT).

## Tenant-context impact
GestureType is a global vocabulary (not per-tenant per api-contract §3.1); `types()` does not need tenant-context invalidation, but facade signals are cleared by `patBootstrap.destroy()` for consistency (FE-PAT-006).

## Prioridade
P2
