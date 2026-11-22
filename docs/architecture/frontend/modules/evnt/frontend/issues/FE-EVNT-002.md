# FE-EVNT-002 -- EVNT_ROUTES + lazy-load topology — /alarm loadComponent with authGuard + canReadEventGuard

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/src/lib/evnt.routes.ts` exports `EVNT_ROUTES` with a single `/alarm` route that lazy-loads `AlarmPageComponent` guarded by `authGuard` and `canReadEventGuard`. The shell `neuroassist-niv-web` imports `@neuroassist/evnt` via `loadChildren` → `EVNT_ROUTES`. EVNT has no breadcrumb on `/alarm`.

## Context / Problem statement

- EVNT exposes one routed surface: the full-screen emergency alarm `/alarm` (SPEC-01 §1).
- The alarm is a takeover — it carries no breadcrumb and is not embedded in normal navigation chrome.
- Lazy-loading MUST be respected: the alarm feature lib must not be eager-bundled into the shell (SPEC-01 §3).
- The confirm action is additionally gated at the handler (not only the route), covered in FE-EVNT-006.
- Bloqueia: FE-EVNT-005, FE-EVNT-011

## Approach (execution path)

1. Create `libs/evnt/src/lib/evnt.routes.ts` exporting `EVNT_ROUTES: Routes = [{ path: 'alarm', canActivate: [authGuard, canReadEventGuard], loadComponent: () => import('./feature-alarm/alarm-page.component').then(m => m.AlarmPageComponent), title: 'Emergency alarm' }]`.
2. In `apps/neuroassist-niv-web/src/app/evnt-module/evnt-module.ts`, add the `loadChildren` descriptor that imports `EVNT_ROUTES` from `@neuroassist/evnt`.
3. Verify the route resolves to `/alarm` (the shell adds no base prefix; SPEC-01 §1).
4. No breadcrumb config on this route (SPEC-01 §1 — takeover has no breadcrumb).
5. `evnt.event.ingest` MUST NOT appear in any route guard or menu entry (G-EVNT-5).

## Non-goals

- No AlarmPageComponent implementation — that is FE-EVNT-011.
- No guard implementation — that is FE-EVNT-006.
- No Shell auto-route/overlay logic — that is FE-EVNT-020.

## Layer(s)

frontend / tool entry (`libs/evnt/src/lib/`) + shell integration (`apps/neuroassist-niv-web/`)

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-01-route-map.md` §1–§3

## Architecture alignment

- Standalone + OnPush (lazy-loaded component)
- Lazy-by-default (loadComponent)
- Tag Nx: `scope:evnt`, `type:feature`

## Implementation checklist (by file)

**Lib path**
- [ ] `libs/evnt/src/lib/evnt.routes.ts`
- [ ] `apps/neuroassist-niv-web/src/app/evnt-module/evnt-module.ts` (loadChildren entry)

**Tests**
- [ ] `npx nx test evnt` PASS
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P1 / Foundation

## Labels

type:feature
layer:frontend
scope:evnt
priority:P1

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build neuroassist-niv-web` PASS (no eager-bundle of alarm feature)
- Route `/alarm` is accessible only to sessions with `evnt.event.read` (guarded by canReadEventGuard)
- `/alarm` has no breadcrumb config
- `evnt.event.ingest` does not appear in any route or guard (INV-EVNT-6)

## Dependencies

- FE-EVNT-001 (MODULE_KEY and MODULE_PERMISSION_MAP for guard keys)
- FE-EVNT-006 (guard implementations)

## Tenant-context impact

Nenhum direto — tenant routing handled server-side from JWT.

## Risks / Notes

- Ensure the shell app's router does not conflict with other module route bases.

## Prioridade

P1
