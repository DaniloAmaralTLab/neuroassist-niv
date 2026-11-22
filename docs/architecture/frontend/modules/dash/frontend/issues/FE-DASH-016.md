# FE-DASH-016 -- DashShellIntegrationService breadcrumb — /home root breadcrumb [Home]; navigation wiring in shell (SPEC-06 §2)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`DashShellIntegrationService` is extended to wire the `/home` breadcrumb state: the root breadcrumb `[Home]` is registered when the overview route activates, and cleared on deactivation. No nested breadcrumb is generated from DASH (the overview is the root; all outbound links belong to their owning modules).

## Approach (execution path)
1. Extend `DashShellIntegrationService` with a `registerBreadcrumb()` method that calls the shell's `BreadcrumbService.set(['Home'])` (or equivalent).
2. Call `registerBreadcrumb()` from `initDash()` (FE-DASH-003) or from `OverviewPageComponent.ngOnInit()`.
3. The breadcrumb value is `[{ label: 'Home', route: '/home' }]` and is the root (no parent crumbs).
4. On route deactivation (FE-DASH-003 `destroyDash()`), clear only the DASH breadcrumb state.
5. Outbound links to `/history`, `/calibration`, etc. do not register DASH breadcrumb entries — those modules own their own crumbs.

## Implementation checklist (by layer/file)
- [ ] `frontend/libs/dash/integration/src/lib/dash-shell-integration.service.ts` extended with `registerBreadcrumb()`
- [ ] Breadcrumb state: `[{ label: 'Home', route: '/home' }]` registered on route activation
- [ ] Breadcrumb cleared on DASH route deactivation
- [ ] No child breadcrumb for outbound links (`/history`, `/calibration`)
- [ ] `npx nx lint dash` PASS
- [ ] `npx nx build dash` PASS

## Acceptance criteria
- [ ] `/home` route shows `[Home]` breadcrumb in the shell
- [ ] Navigating outbound to `/history` does NOT show a DASH-originated crumb
- [ ] `npx nx build dash` PASS

## Dependencies
- FE-DASH-007 (DashShellIntegrationService exists)
- FE-DASH-003 (dash.bootstrap.ts lifecycle wiring)
- Shell's BreadcrumbService (must be available via DI)

## Tenant-context impact
None — breadcrumb is a UI-only navigation state.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2)

## Architecture alignment
- Tags Nx: `scope:dash`, `type:util`

## Milestone
Wave 6 / Navigation

## Labels
type:feature
layer:frontend
scope:dash
priority:P6

## Prioridade
P6
