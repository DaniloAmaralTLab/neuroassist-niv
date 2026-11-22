# FE-HIST-001 -- hist.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

**SPEC refs:** SPEC-05 §1–4, generator-config.yml §module_contract

## Outcome
`hist.contract.ts` is in place: the module exports `MODULE_KEY='hist'`, `MODULE_MENU_METADATA` (section 'care', order 40, route '/history', requires 'hist.history.read'), `MODULE_PERMISSION_MAP` with exactly one caregiver authority (`hist.history.read`), and `MODULE_FEATURE_FLAGS` (`hist.escalation-trail: on`, `hist.audit-console: off`). No write authority and no operator authority is included.

## Approach (execution path)
1. Create `frontend/libs/hist/src/lib/hist.contract.ts` following the SPEC-05 §1–3 illustration.
2. Export `MODULE_KEY = 'hist'` as a const string.
3. Export `MODULE_MENU_METADATA` with key/title/icon/section/order/entries (single entry: `{ label: 'History', route: '/history', requires: 'hist.history.read' }`).
4. Export `MODULE_PERMISSION_MAP` — only `'hist.history.read'` with label + justification. Explicitly OMIT `hist.audit.read`, `hist.audit.record`, `hist.erasure.create` (SPEC-05 §2).
5. Export `MODULE_FEATURE_FLAGS` — `'hist.escalation-trail': { defaultState: true, justification: '...' }` and `'hist.audit-console': { defaultState: false, justification: '...' }`.
6. Re-export the contract from `frontend/libs/hist/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/hist/src/lib/hist.contract.ts`
- [ ] `MODULE_KEY = 'hist'` exported
- [ ] `MODULE_MENU_METADATA` — section 'care', order 40, route '/history', requires 'hist.history.read'
- [ ] `MODULE_PERMISSION_MAP` — exactly `'hist.history.read'`; hist.audit.read is NOT present (SPEC-05 §2)
- [ ] `MODULE_FEATURE_FLAGS` — `hist.escalation-trail: true`, `hist.audit-console: false`
- [ ] `npx nx test hist` PASS
- [ ] `npx nx lint hist` PASS

## Acceptance criteria
- [ ] `npx nx test hist` PASS — unit test asserts `MODULE_PERMISSION_MAP` has exactly one key `'hist.history.read'` and that `hist.audit.read` is absent
- [ ] `npx nx lint hist` PASS
- [ ] Authority string is `'hist.history.read'` (not `'hist.history.view'` — `hist-authority-exact`)
- [ ] `hist.audit.record`, `hist.audit.read`, `hist.erasure.create` are absent from the map

## Dependencies
Nenhuma (issue inicial de fundação do módulo).

## Tenant-context impact
Nenhum — o contrato declara autoridades; o escopo por tenant é derivado do JWT no servidor (SPEC-04 §3).

## Prioridade
P1
