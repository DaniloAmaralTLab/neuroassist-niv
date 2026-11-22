# FE-DASH-004 -- DASH_DESCRIPTOR + tool-descriptors.ts wiring — shell registration (home branch, section 'care', order 0)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/7 itens

## Outcome
`libs/dash/src/lib/dash.descriptor.ts` exports `DASH_DESCRIPTOR` wiring DASH as the home branch (`/home`, section `care`, order 0) in the shell; `apps/neuroassist-niv-web/src/app/config/tool-descriptors.ts` registers it so the shell lazy-loads `@neuroassist/dash` as the default post-login destination.

## Approach (execution path)
1. Create `libs/dash/src/lib/dash.descriptor.ts` exporting `DASH_DESCRIPTOR: ToolDescriptor` with: `key: 'dash'`, `title: 'Home'`, `icon: 'dashboard'`, `section: 'care'`, `order: 0`, `routePath: '/home'`, `loadChildren: () => import('@neuroassist/dash').then(m => m.DASH_ROUTES)`.
2. Add `DASH_DESCRIPTOR` to `tool-descriptors.ts` in the shell app config — the shell uses this array to register lazy routes and nav entries.
3. The shell sets `/home` as the default landing after a successful ACS sign-in (the redirect target after `authGuard` passes).
4. Export `DASH_DESCRIPTOR` from `libs/dash/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/src/lib/dash.descriptor.ts` created with `DASH_DESCRIPTOR`
- [ ] `order: 0` (first menu entry), `section: 'care'`, `routePath: '/home'`
- [ ] `loadChildren` references `@neuroassist/dash` → `DASH_ROUTES`
- [ ] `DASH_DESCRIPTOR` added to `frontend/apps/neuroassist-niv-web/src/app/config/tool-descriptors.ts`
- [ ] Re-exported from `libs/dash/src/index.ts`
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build neuroassist-niv-web` PASS (shell route resolves)

## Acceptance criteria
- [ ] `DASH_DESCRIPTOR.order === 0` and `section === 'care'`
- [ ] Shell routes resolve `/home` to `OverviewPageComponent` via lazy load
- [ ] `npx nx build neuroassist-niv-web` PASS

## Dependencies
- FE-DASH-001 (MODULE_KEY must match descriptor key)
- FE-DASH-002 (DASH_ROUTES must be exported)

## Tenant-context impact
None — the shell descriptor is a static configuration.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-06-shell-integration.md` (§1)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/generator-config.yml` (shell_surfaces)

## Architecture alignment
- Tags Nx: `scope:dash`, `type:domain`
- Lazy-loading via `loadChildren` (standalone routes, Angular 18+ pattern)

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:dash
priority:P1

## Prioridade
P1
