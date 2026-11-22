# FE-PAT-004 -- PAT_MODULE_DESCRIPTOR + shell registration in config/module-descriptors.ts

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`PAT_MODULE_DESCRIPTOR` is defined in `libs/pat/src/lib/pat.descriptor.ts` and pushed into `MODULE_DESCRIPTORS` in the shell, so the sidebar shows "Patients & Commands" before the lazy chunk resolves.

## Approach (execution path)
1. Create `libs/pat/src/lib/pat.descriptor.ts` implementing `ModuleDescriptor`: key `pat`, menu from `MODULE_MENU_METADATA`, `loadChildren` referencing `@neuroassist/pat` PatModule, `routeBase: '/patients'`, permissions from `Object.keys(MODULE_PERMISSION_MAP)`, featureFlags from `MODULE_FEATURE_FLAGS` (SPEC-06 §1).
2. Export `PAT_MODULE_DESCRIPTOR` from `libs/pat/src/index.ts` barrel.
3. In `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts` import `PAT_MODULE_DESCRIPTOR` and push it into the `MODULE_DESCRIPTORS` array.
4. Ensure the sidebar can render the "Patients & Commands" section from the static descriptor without loading the lazy chunk (SPEC-06 §4).

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/src/lib/pat.descriptor.ts`
- [ ] Re-exportar `PAT_MODULE_DESCRIPTOR` de `libs/pat/src/index.ts`
- [ ] Registrar em `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts`
- [ ] `npx nx build neuroassist-niv-web` PASS
- [ ] `npx nx lint pat` PASS

## Acceptance criteria
- [ ] Shell sidebar shows "Patients & Commands" on boot from the static descriptor without eager-loading the catalog or registry feature libraries (SPEC-06 §4).
- [ ] `PAT_MODULE_DESCRIPTOR.permissions` equals `Object.keys(MODULE_PERMISSION_MAP)`.
- [ ] `npx nx build neuroassist-niv-web` PASS.

## Dependencies
FE-PAT-001 (MODULE_PERMISSION_MAP, MODULE_MENU_METADATA, MODULE_FEATURE_FLAGS).
FE-PAT-003 (PatModule needed for loadChildren).
INT-FE-PAT-005 (Shell integration contract verification).

## Tenant-context impact
Nenhum (descriptor is static; menu visibility is derived from the session permission map at runtime by NavigationService).

## Prioridade
P1
