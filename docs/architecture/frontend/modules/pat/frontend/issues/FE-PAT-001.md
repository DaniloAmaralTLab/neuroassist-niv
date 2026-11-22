# FE-PAT-001 -- pat.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Outcome
`libs/pat/src/lib/pat.contract.ts` is authored with the four module-contract exports using BE-canonical authority strings (INV-PAT-8): MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP (8 authorities), MODULE_FEATURE_FLAGS (2 flags).

## Approach (execution path)
1. Create `libs/pat/src/lib/pat.contract.ts` exporting `MODULE_KEY = 'pat'`.
2. Add `MODULE_MENU_METADATA`: key, title "Patients & Commands", icon "tune", section "care", order 20, two entries (`pat.command.read` / `pat.patient.create`).
3. Add `MODULE_PERMISSION_MAP` with all 8 BE authority strings (pat.patient.create, pat.patient.read, pat.command.read, pat.command.create, pat.command.calibrate, pat.command.retire, pat.gesture-type.read, pat.gesture-type.create) and English justification text per SPEC-05 §2.
4. Add `MODULE_FEATURE_FLAGS`: `pat.live-gesture-test` (defaultState: true) and `pat.compound-gestures` (defaultState: true) per SPEC-05 §3.
5. Re-export from `libs/pat/src/index.ts` barrel.
6. Confirm no vision-era authority names (pat.patient.view, pat.command.view/edit/remove) remain — gap G1 reconciliation.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/src/lib/pat.contract.ts`
- [ ] Re-exportar de `libs/pat/src/index.ts`
- [ ] `npx nx test pat` PASS
- [ ] `npx nx lint pat` PASS

## Acceptance criteria
- [ ] `MODULE_PERMISSION_MAP` contains exactly the 8 BE authority keys listed in SPEC-05 §2 and no vision-era name.
- [ ] `MODULE_FEATURE_FLAGS` exports `pat.live-gesture-test` and `pat.compound-gestures` both with `defaultState: true`.
- [ ] `npx nx build pat` PASS (no TS errors, no Jinja artifacts).
- [ ] All module-contract types conform to `ModuleMenuMetadata`, `ModulePermissionMap`, `ModuleFeatureFlags` from `@neuroassist/shared/contracts`.

## Dependencies
Nenhuma (issue de foundation; independente).

## Tenant-context impact
Nenhum (pat.contract.ts is a static export; no runtime tenant branching).

## Prioridade
P1
