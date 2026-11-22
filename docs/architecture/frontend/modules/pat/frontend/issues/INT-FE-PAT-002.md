# INT-FE-PAT-002 -- pat-service HTTP integration — CommandHttpAdapter live contract (all 5 operations against /pat/patients/{id}/commands and /pat/commands/{id})

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`CommandHttpAdapter` is verified against the live `pat-service` contract for all 5 operations (listByPatient, get, create, calibrate, retire); request bodies and response shapes are confirmed against api-contract §2.

## Approach (execution path)
1. Write `command-http.adapter.spec.ts` covering all 5 operations with HttpClientTestingModule: `listByPatient(patientId)` → `GET /pat/patients/{patientId}/commands`; `create(patientId, form)` → `POST /pat/patients/{patientId}/commands` with `{ label, urgency, sensitivity, primaryPrimitive, secondaryPrimitive, minGestureTimeMs, maxGestureTimeMs }` primitives as ids; `calibrate(id, partial)` → `PATCH /pat/commands/{id}`; `retire(id)` → `DELETE /pat/commands/{id}` → 204; `get(id)` → `GET /pat/commands/{id}`.
2. Verify `create` body includes all required fields — no missing field (carry-forward `http-adapter:request-body-field-whitelist`).
3. Verify `calibrate` sends only the changed fields (partial PATCH) and awaits 200.
4. Verify `retire` awaits 204 and resolves (idempotent — BE §2.5).
5. Verify `command-retired` (409 on PATCH) is mapped to `AppError.code = 'command-retired'` (SPEC-07).

## Implementation checklist (by layer/file)
- [ ] implementar/completar `libs/pat/data-access/src/lib/command/command-http.adapter.spec.ts`
- [ ] `npx nx test pat-data-access` PASS
- [ ] Integration smoke (opcional): `POST /pat/patients/{id}/commands` → 201

## Acceptance criteria
- [ ] `create()` sends all 7 required fields with primitives as ids (SPEC-04 §3).
- [ ] `retire()` resolves on 204 (not 404 for already-retired — BE idempotent §2.5).
- [ ] `command-retired` on PATCH maps to `AppError.code = 'command-retired'` (SPEC-07).
- [ ] `npx nx test pat-data-access` PASS.

## Dependencies
FE-PAT-009 (CommandHttpAdapter implementation).
INT-FE-PAT-004 (shared layer wiring).

## Tenant-context impact
Cross-tenant command operations return 404 (INV-PAT-2, server-enforced); adapter requires no tenant param.

## Prioridade
P4
