# INT-FE-PAT-003 -- pat-service HTTP integration — GestureTypeHttpAdapter live contract (list, register against /pat/gesture-types)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`GestureTypeHttpAdapter` is verified against `pat-service` for `GET /pat/gesture-types` (list) and `POST /pat/gesture-types` (register); `gesture-type-code-taken` (409) is mapped to field error.

## Approach (execution path)
1. Write `gesture-type-http.adapter.spec.ts`: `list()` → `GET /pat/gesture-types` returns `GestureTypeVM[]`; `register({ code, displayName, description })` → `POST /pat/gesture-types` → 201, response type selected in open gesture slot.
2. Verify `register` body sends `{ code, displayName, description }` exactly (SPEC-04 §3).
3. Verify 409 `gesture-type-code-taken` → `AppError.code = 'gesture-type-code-taken'` → field error on new-type code (SPEC-07 §2).
4. Verify engine-support caveat is a UI concern only — the adapter does not validate engine support (R1, INV-PAT-6).
5. Verify `GET /pat/gesture-types/{id}` is available but unused in v1 (api-contract §3 — available, not consumed by FE MVP).

## Implementation checklist (by layer/file)
- [ ] implementar/completar `libs/pat/data-access/src/lib/gesture-type/gesture-type-http.adapter.spec.ts`
- [ ] `npx nx test pat-data-access` PASS
- [ ] Integration smoke (opcional): `GET /pat/gesture-types` → 200 with global vocabulary

## Acceptance criteria
- [ ] `register()` sends `{ code, displayName, description }` and not any additional field.
- [ ] `gesture-type-code-taken` 409 → `AppError.code = 'gesture-type-code-taken'` (not a generic 409 toast).
- [ ] `npx nx test pat-data-access` PASS.

## Dependencies
FE-PAT-011 (GestureTypeHttpAdapter implementation).
INT-FE-PAT-004 (shared layer wiring).

## Tenant-context impact
GestureType is a global vocabulary (not per-tenant, api-contract §3.1); `list()` requires no tenant param and is available to all tenants.

## Prioridade
P4
