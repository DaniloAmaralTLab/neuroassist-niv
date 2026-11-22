# FE-ACS-005 -- acs.descriptor.ts + module-descriptors.ts — shell registration (ACS_MODULE_DESCRIPTOR)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
`ACS_MODULE_DESCRIPTOR` is defined in `libs/acs/shell-entry` and registered in the shell's `config/module-descriptors.ts`, enabling the shell to lazy-load `@neuroassist/acs`, serve the "Access" sidebar section from the fallback descriptor before the chunk resolves, and route `/access/*` correctly (SPEC-06 §1-4).

## Approach (execution path)
1. Create `libs/acs/shell-entry/src/lib/acs.descriptor.ts` exporting `ACS_MODULE_DESCRIPTOR: ModuleDescriptor`.
2. Fields: `key = MODULE_KEY`, `menu = MODULE_MENU_METADATA`, `loadChildren` lazy import, `routeBase = '/access'`, `permissions` (all 7 BE authority strings), `featureFlags = MODULE_FEATURE_FLAGS`.
3. Open `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts` and push `ACS_MODULE_DESCRIPTOR` into `MODULE_DESCRIPTORS`.
4. Verify: the shell sidebar renders the "Access" section from the fallback descriptor without eagerly loading feature-caregivers or feature-patient-sessions.
5. Verify: navigation to `/access/caregivers` triggers exactly one dynamic import (the ACS chunk).

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/shell-entry/src/lib/acs.descriptor.ts`
- [ ] implementar `frontend/apps/neuroassist-niv-web/src/app/config/module-descriptors.ts`
- [ ] `loadChildren` uses `import('@neuroassist/acs').then(m => m.ACS_ROUTES)` (lazy, no eager ref)
- [ ] `routeBase = '/access'` (ops route is host-gated, not part of the main routeBase)
- [ ] `permissions` array contains all 7 BE authority strings
- [ ] `npx nx lint neuroassist-niv-web` PASS

## Acceptance criteria
- [ ] WHEN the shell boots, THE SYSTEM SHALL expose the "Access" sidebar section from `ACS_MODULE_DESCRIPTOR.menu` without eager-loading ACS feature libraries
- [ ] `ACS_MODULE_DESCRIPTOR` appears in `MODULE_DESCRIPTORS` in `module-descriptors.ts`
- [ ] `npx nx build neuroassist-niv-web` PASS

## Dependencies
FE-ACS-001 (MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS), FE-ACS-002 (ACS_ROUTES).

## Tenant-context impact
None — the descriptor is static module metadata.

## Prioridade
P1
