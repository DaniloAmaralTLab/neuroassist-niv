# FE-PAT-002 -- PAT_ROUTES + PatRootComponent (lazy-load topology, root redirect)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/4 itens

## Outcome
`PAT_ROUTES` exported from `libs/pat` lazy-loads the catalog and registry feature routes via `loadComponent`; `PatRootComponent` resolves the active patient and redirects to `/patients/:patientId/commands` or `/patients/register`.

## Approach (execution path)
1. Create `libs/pat/src/lib/pat.routes.ts` exporting `PAT_ROUTES: Routes`.
2. Add root path `/patients` mapped to `PatRootComponent` with `authGuard`.
3. Add `/patients/register` → `loadComponent(() => import feature-patient-registry PatientRegistrationPageComponent)` with `[authGuard, canManageCatalogGuard]`.
4. Add `/patients/:patientId/commands` → `loadComponent(() => import feature-command-catalog CommandCatalogPageComponent)` with `[authGuard, canManageCatalogGuard]`.
5. Create `libs/pat/src/lib/pat-root.component.ts` (standalone, OnPush): inject `PatientFacade`, on init call `list()`, redirect to active patient commands; if no patient redirect to `/patients/register`.
6. Re-export from barrel `libs/pat/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/src/lib/pat.routes.ts`
- [ ] implementar `libs/pat/src/lib/pat-root.component.ts`
- [ ] Re-exportar `PAT_ROUTES` de `libs/pat/src/index.ts`
- [ ] `npx nx test pat` PASS
- [ ] `npx nx lint pat` PASS

## Acceptance criteria
- [ ] Every sub-route uses `loadComponent` (no eager bundle of catalog or registry — SPEC-01 §2).
- [ ] `PatRootComponent` redirects to `:patientId/commands` when `PatientFacade.active()` resolves; to `/patients/register` when none — SPEC-01 §1.
- [ ] Both `/patients/register` and `/patients/:patientId/commands` list `[authGuard, canManageCatalogGuard]` as `canActivate`.
- [ ] `npx nx build pat` PASS.

## Dependencies
FE-PAT-001 (pat.contract.ts must exist for MODULE_KEY reference).
FE-PAT-018 (authGuard), FE-PAT-019 (canManageCatalogGuard) — guards referenced by routes.
FE-PAT-008 (PatientFacade) — consumed by PatRootComponent.

## Tenant-context impact
Nenhum (routing is session-aware via authGuard; tenant is JWT-derived).

## Prioridade
P1
