# FE-DASH-017 -- entry screen shell promotion — promote screens/entry as a SHELL route (ACS login CTA → /home); DASH never registers entry in DASH_ROUTES (SPEC-01 §5, owner=SHELL)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/8 itens

## Outcome
The prototype `screens/entry` is promoted into the shell app as a static brand/login route whose single call-to-action drives the ACS login flow, landing on `/home` on success. DASH never registers `entry` in `DASH_ROUTES`. The promotion wires `entry` as a shell-level route (`/entry` or the app root `/`) in `apps/neuroassist-niv-web/src/app/app.routes.ts`.

## Approach (execution path)
1. Copy/promote `frontend/design-reference/angular-prototype/apps/neuroassist-niv-web/src/app/screens/entry/` to `frontend/apps/neuroassist-niv-web/src/app/entry/entry-page.component.ts`.
2. Create a minimal `EntryPageComponent` (standalone, OnPush): logo, tagline, one "Enter the dashboard" / "Sign in" call-to-action button.
3. The CTA button routes to the ACS login flow (e.g. `router.navigate(['/login'])` or `routerLink="/login"`). It does NOT navigate directly to `/home` — the ACS login guard lands on `/home` after successful authentication.
4. Register in `apps/neuroassist-niv-web/src/app/app.routes.ts`:
   - `{ path: 'entry', component: EntryPageComponent }` or as the root route — MUST NOT be in `DASH_ROUTES`.
5. No operational data loaded on this screen (BE ADR-001 inspection: `writes: none`, reads none).
6. Verify: `DASH_ROUTES` grep shows no `entry` path.

## Implementation checklist (by layer/file)
- [ ] `frontend/apps/neuroassist-niv-web/src/app/entry/entry-page.component.ts` created from prototype `screens/entry`
- [ ] `frontend/apps/neuroassist-niv-web/src/app/entry/entry-page.component.html` — static brand, one CTA button
- [ ] `frontend/apps/neuroassist-niv-web/src/app/app.routes.ts` — `entry` registered here, NOT in `DASH_ROUTES`
- [ ] CTA button navigates to ACS login flow (not directly to `/home`)
- [ ] No `HttpClient` injection in `EntryPageComponent`
- [ ] `DASH_ROUTES` does not contain `entry` path (grep verified)
- [ ] `npx nx build neuroassist-niv-web` PASS
- [ ] `npx nx lint neuroassist-niv-web` PASS

## Acceptance criteria
- [ ] `grep -r "entry" frontend/libs/dash/src/lib/dash.routes.ts` returns nothing
- [ ] Navigating to entry screen and tapping CTA lands on ACS login route
- [ ] `npx nx build neuroassist-niv-web` PASS

## Dependencies
- FE-DASH-002 (confirms `DASH_ROUTES` has no entry route)
- ACS login route must be registered in the shell

## Tenant-context impact
None — entry screen has no operational data, no tenant context.

## Service execution spec(s)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-01-route-map.md` (§5)
- `docs/architecture/frontend/modules/dash/frontend/frontend-spec/SPEC-06-shell-integration.md` (§4)
- `docs/architecture/frontend/modules/dash/frontend/contracts/backend-api-cross-link.md` (§4)

## Architecture alignment
- D-493: prototype-to-production — entry screen promoted from `screens/entry`
- Entry screen owner = SHELL (orchestrator default, revisable)
- No operational data (ADR-001)
- Tags Nx: `scope:shell`, `type:feature`

## Milestone
Wave 6 / Navigation

## Labels
type:feature
layer:frontend
scope:shell
priority:P6

## Prioridade
P6
