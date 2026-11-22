# FE-PAT-003 -- PatModule barrel entry — libs/pat public API and exports

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`@neuroassist/pat` is a fully importable Nx lib with a clean barrel `index.ts` exporting `PatModule`, `PAT_ROUTES`, and all public contract symbols; the shell can lazy-load it via `loadChildren`.

## Approach (execution path)
1. Create `libs/pat/src/lib/pat.module.ts` exporting `PatModule` (standalone NgModule that re-exports `PAT_ROUTES` for `loadChildren` compatibility).
2. Author `libs/pat/src/index.ts` to publicly export: `PatModule`, `PAT_ROUTES`, `MODULE_KEY`, `MODULE_MENU_METADATA`, `MODULE_PERMISSION_MAP`, `MODULE_FEATURE_FLAGS`, `PAT_MODULE_DESCRIPTOR`.
3. Ensure the Nx `project.json` for `libs/pat` declares `sourceRoot`, `tags: ["scope:pat", "type:domain"]`.
4. Confirm `tsconfig.base.json` path alias `@neuroassist/pat` → `libs/pat/src/index.ts`.
5. Verify `npx nx build pat` succeeds from workspace root.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/src/lib/pat.module.ts`
- [ ] implementar `libs/pat/src/index.ts`
- [ ] Verificar `tsconfig.base.json` path alias `@neuroassist/pat`
- [ ] `npx nx build pat` PASS
- [ ] `npx nx lint pat` PASS

## Acceptance criteria
- [ ] `import { PatModule } from '@neuroassist/pat'` resolves without error.
- [ ] `loadChildren: () => import('@neuroassist/pat').then(m => m.PatModule)` can be used by the shell (SPEC-06 §1).
- [ ] `npx nx build pat` PASS (no missing exports, no TS errors).

## Dependencies
FE-PAT-001 (pat.contract.ts).
FE-PAT-002 (pat.routes.ts).

## Tenant-context impact
Nenhum (barrel and module only; no runtime tenant logic).

## Prioridade
P1
