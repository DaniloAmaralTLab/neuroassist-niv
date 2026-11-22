# FE-ACS-001 -- acs.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/acs/shell-entry/src/lib/acs.contract.ts` is authored with the four exports required by the shell integration contract: `MODULE_KEY`, `MODULE_MENU_METADATA`, `MODULE_PERMISSION_MAP`, and `MODULE_FEATURE_FLAGS`, all using the BE-canonical authority strings (INV-7, SPEC-05).

## Approach (execution path)
1. Create `libs/acs/shell-entry/src/lib/acs.contract.ts` exporting `MODULE_KEY = 'acs'`.
2. Define `MODULE_MENU_METADATA` with key, title, icon (`group`), section (`admin`), order (`40`) and three entries: Caregivers, Patient sessions, Tenants (ops) with their BE authority strings and `hostRestricted: true` for the ops entry.
3. Define `MODULE_PERMISSION_MAP` with 7 entries mapping each BE authority string to its label and justification (api-contract §2-5).
4. Define `MODULE_FEATURE_FLAGS` with `acs.patient-sessions` ON (core MVP), `acs.tenant-admin` OFF (ops-only), `acs.caregiver-list` OFF (pending G3 endpoint).
5. Export all four from the shell-entry barrel `index.ts`.
6. Verify: `AccessDecisionService.can(key)` resolves for each permission key in `MODULE_PERMISSION_MAP` — guards must use these keys unchanged (INV-7).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/shell-entry/src/lib/acs.contract.ts`
- [ ] `MODULE_KEY = 'acs'` exported
- [ ] `MODULE_MENU_METADATA` with 3 entries — Tenants entry marked `hostRestricted: true`
- [ ] `MODULE_PERMISSION_MAP` with 7 BE-canonical authority keys (no vision names)
- [ ] `MODULE_FEATURE_FLAGS` — `acs.caregiver-list: false` (G3 pending BE endpoint)
- [ ] All four symbols re-exported from `libs/acs/shell-entry/src/index.ts`
- [ ] `npx nx lint acs-shell-entry` PASS

## Acceptance criteria
- [ ] `MODULE_PERMISSION_MAP` keys match the 7 BE authority strings from api-contract §2-5 exactly (INV-7)
- [ ] `MODULE_FEATURE_FLAGS['acs.caregiver-list'].defaultState === false` (G3 pending BE endpoint)
- [ ] `npx nx build acs-shell-entry` PASS (no TS errors)

## Dependencies
Nenhuma (this is the foundation for all subsequent ACS issues).

## Tenant-context impact
None — this is a static module-contract; it does not read or write tenant state.

## Prioridade
P1
