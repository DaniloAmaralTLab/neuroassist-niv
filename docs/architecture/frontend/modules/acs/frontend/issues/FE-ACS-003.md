# FE-ACS-003 -- acs.module.ts (shell-entry barrel) + acs.bootstrap.ts lifecycle init/destroy

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
The shell-entry barrel exports `ACS_ROUTES` and `AcsModule`, and `acs.bootstrap.ts` implements the `ModuleBootstrap` lifecycle (`init` reads tenant context + ops-host flag, registers breadcrumbs; `destroy` clears signals and unregisters navigation) so that the ACS module cleanly mounts and unmounts without dangling subscriptions (SPEC-06 §3).

## Approach (execution path)
1. Create `libs/acs/shell-entry/src/lib/acs.module.ts` (or use the index barrel) that re-exports `ACS_ROUTES` as the default lazy entry.
2. Create `libs/acs/shell-entry/src/lib/acs.bootstrap.ts` implementing `ModuleBootstrap`.
3. `init`: read the active tenant from `@neuroassist/shared/tenant-context`; compute `onAdminHost` from `ACS_OPS_HOST` env token; publish ops-menu visibility; register ACS breadcrumb path with `NavigationService`.
4. `destroy`: unregister ACS breadcrumbs; clear `caregiverFacade` and `patientSessionFacade` signals; ensure no dangling RxJS subscriptions remain.
5. `init` must NOT perform login (owned by `@neuroassist/shared/auth-session`) and must NOT write the active tenant.
6. Update `libs/acs/shell-entry/src/index.ts` to export `acsBootstrap` and `ACS_ROUTES`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/acs/shell-entry/src/index.ts`
- [ ] implementar `frontend/libs/acs/shell-entry/src/lib/acs.bootstrap.ts`
- [ ] `init` reads tenant context from `@neuroassist/shared/tenant-context` (no write)
- [ ] `destroy` calls `clearSignals()` on both facades (or equivalent reset mechanism)
- [ ] No dangling subscriptions after `destroy` (take-until pattern or DestroyRef)
- [ ] `npx nx lint acs-shell-entry` PASS

## Acceptance criteria
- [ ] WHEN ACS `init` runs, THE SYSTEM SHALL register ACS breadcrumbs with `NavigationService`
- [ ] WHEN ACS `destroy` runs, THE SYSTEM SHALL unregister breadcrumbs and clear module-local facade signals
- [ ] `npx nx build acs-shell-entry` PASS

## Dependencies
FE-ACS-001 (contract), FE-ACS-002 (routes), FE-ACS-005 (descriptor) — bootstrap references descriptor and routes.

## Tenant-context impact
`init` reads (never writes) the active tenant from `@neuroassist/shared/tenant-context`. A tenant switch via `tenant-context.switchTo` invalidates any future ACS cache (bootstrap-flow rule).

## Prioridade
P1
