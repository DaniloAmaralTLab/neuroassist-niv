# FE-PAT-006 -- pat.bootstrap.ts — init/destroy lifecycle (tenant invalidation, webcam cleanup, breadcrumb teardown)

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/3 itens

## Outcome
`pat.bootstrap.ts` exports `patBootstrap: ModuleBootstrap` with `init` (register breadcrumbs, subscribe integration service to facade signals, read active tenant) and `destroy` (unregister breadcrumbs, clear PAT signals, stop any open webcam stream, handle tenant switch) per SPEC-06 §3.

## Approach (execution path)
1. Create `libs/pat/src/lib/pat.bootstrap.ts` implementing the `ModuleBootstrap` interface.
2. `init(ctx)`: read active tenant from `@neuroassist/shared/tenant-context` (never write it); register PAT breadcrumbs with shell `NavigationService`; subscribe `PatShellIntegrationService` to facade signals.
3. `destroy(ctx)`: unregister PAT breadcrumbs and menu entries; clear module-local facade signals (`PatientFacade`, `CommandFacade`, `GestureTypeFacade`); stop any live `getUserMedia` track (defence-in-depth R5); handle `tenant-context.switchTo(...)` invalidation.
4. `init` must NOT perform login (owned by `@neuroassist/shared/auth-session`).
5. Write unit tests for `destroy` verifying no dangling subscriptions and webcam stream cleanup.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/src/lib/pat.bootstrap.ts`
- [ ] unit tests para `destroy` (webcam cleanup, signal clear, breadcrumb teardown)
- [ ] `npx nx test pat` PASS
- [ ] `npx nx lint pat` PASS

## Acceptance criteria
- [ ] `patBootstrap.destroy()` leaves no dangling subscriptions, clears all PAT signals, and stops any open webcam stream.
- [ ] `patBootstrap.init()` does not call any auth-session login flow (SPEC-06 §3).
- [ ] A `tenant-context.switchTo(...)` during the session invalidates any future PAT catalog state.
- [ ] `npx nx build pat` PASS.

## Dependencies
FE-PAT-020 (PatShellIntegrationService).
FE-PAT-008 (PatientFacade), FE-PAT-010 (CommandFacade), FE-PAT-011 (GestureTypeFacade).

## Tenant-context impact
Tenant switch is handled in `destroy` by clearing PAT signals — no future stale data from the previous tenant is served to the next session.

## Prioridade
P1
