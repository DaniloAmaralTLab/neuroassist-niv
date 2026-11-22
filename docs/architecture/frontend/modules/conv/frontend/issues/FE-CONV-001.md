# FE-CONV-001 -- conv.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS

**Status:** INTACT -- gerado 2026-11-22
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

**SPEC refs:** SPEC-05 §1–4, generator-config.yml §module_contract, contracts/backend-api-cross-link.md §2

## Outcome
`conv.contract.ts` is in place: the module exports `MODULE_KEY='conv'`, `MODULE_MENU_METADATA` (section='patient', order=0, identity='patient.session', single entry /patient/converse requiring 'conv.tree.read'), `MODULE_PERMISSION_MAP` with exactly the three patient-session authorities (`conv.tree.read`, `conv.audio.read`, `conv.usage.record`), and `MODULE_FEATURE_FLAGS` (`conv.usage-signal.enabled: off`, `conv.switch-scan.enabled: on`). No publish, retire or erase UI authority is included (those are TRN service-client only).

## Approach (execution path)
1. Create `frontend/libs/conv/src/lib/conv.contract.ts` following the SPEC-05 §1–3 illustration.
2. Export `MODULE_KEY = 'conv'` as a const string.
3. Export `MODULE_MENU_METADATA` — key='conv', title='Talk', icon='chat_bubble', section='patient', order=0, identity='patient.session'; one entry: `{ label: 'Talk', route: '/patient/converse', requires: 'conv.tree.read' }`.
4. Export `MODULE_PERMISSION_MAP` — exactly the three keys from the BE authority matrix verbatim (D-639): `'conv.tree.read'`, `'conv.audio.read'`, `'conv.usage.record'`. Explicitly OMIT `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` (TRN service-client only, SPEC-05 §2). Omit `pat.patient.read` (server-side service-client call, not a UI authority).
5. Export `MODULE_FEATURE_FLAGS` — `'conv.usage-signal.enabled': { defaultState: false, ... }` (opt-in per INV-CONV-6) and `'conv.switch-scan.enabled': { defaultState: true, ... }` (switch-scan channel default on).
6. Re-export the contract from `frontend/libs/conv/src/index.ts`.
7. Unit test: assert `MODULE_PERMISSION_MAP` has exactly three keys; assert none of the TRN authorities are present.

**Open item (registry label):** `modules.registry[CONV].frontendLib = 'conv-ui'` contradicts the on-disk convention `@neuroassist/conv`. Specs and this issue follow the on-disk convention; the registry label should be reconciled separately (non-blocking).

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/conv/src/lib/conv.contract.ts` created
- [ ] `MODULE_KEY = 'conv'` exported
- [ ] `MODULE_MENU_METADATA` — section='patient', order=0, identity='patient.session', route '/patient/converse', requires 'conv.tree.read'
- [ ] `MODULE_PERMISSION_MAP` — exactly `'conv.tree.read'`, `'conv.audio.read'`, `'conv.usage.record'`; NO publish/retire/erase authority present (SPEC-05 §2)
- [ ] `MODULE_FEATURE_FLAGS` — `conv.usage-signal.enabled: false`, `conv.switch-scan.enabled: true`
- [ ] Re-exported from `frontend/libs/conv/src/index.ts`
- [ ] `npx nx test conv` PASS — asserts `MODULE_PERMISSION_MAP` has exactly 3 keys; `conv.tree.publish` absent
- [ ] `npx nx lint conv` PASS

## Acceptance criteria
- [ ] `MODULE_PERMISSION_MAP` has exactly three keys: `'conv.tree.read'`, `'conv.audio.read'`, `'conv.usage.record'`
- [ ] `conv.tree.publish`, `conv.tree-version.retire`, `conv.audio.delete` are absent from the permission map
- [ ] `MODULE_MENU_METADATA.identity === 'patient.session'` (not a caregiver JWT)
- [ ] `conv.usage-signal.enabled.defaultState === false` (opt-in, off by default)
- [ ] `npx nx test conv` PASS; `npx nx lint conv` PASS

## Dependencies
None — first foundation issue.

## Tenant-context impact
None — `conv.contract.ts` holds no per-tenant state; the permission map is global.
