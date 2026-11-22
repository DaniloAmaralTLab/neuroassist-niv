# FE-PAT-021 -- Loading skeleton + EmptyStateComponent + PageErrorComponent for command catalog

**Status:** INTACT -- gerado 2026-11-19
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/5 itens

## Outcome
The command catalog renders a bone skeleton while loading, an empty state when no active commands exist, and a page error with a Retry affordance on load failure — all as standalone presentational components.

## Approach (execution path)
1. Create `command-catalog-skeleton.component.ts` (standalone, OnPush): renders shimmer/skeleton rows matching the `CommandRowComponent` layout; shown while `listState = 'loading'`.
2. Create `command-catalog-empty.component.ts` (standalone, OnPush): shown while `listState = 'success'` and `commands` is empty; includes a CTA to open the editor in new mode if `canCreate`.
3. Create `command-catalog-error.component.ts` (standalone, OnPush): `output()` retry = void; shown while `listState = 'error'`; renders message and a Retry button (single manual retry per SPEC-07 §4).
4. Wire all three into `CommandCatalogPageComponent` via conditional rendering against `listState` signal.
5. Use `@neuroassist/shared/ui-feedback` for error display; preserve BE `detail` and `correlationId` per SPEC-07 §1.

## Implementation checklist (by layer/file)
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-catalog-page/command-catalog-skeleton.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-catalog-page/command-catalog-empty.component.ts`
- [ ] implementar `libs/pat/feature-command-catalog/src/lib/command-catalog-page/command-catalog-error.component.ts`
- [ ] `npx nx test pat-feature-command-catalog` PASS
- [ ] `npx nx lint pat-feature-command-catalog` PASS

## Acceptance criteria
- [ ] Skeleton shown while `listState = 'loading'`; empty state while `'success'` + no commands; page error while `'error'` with Retry button (SPEC-03 EARS, SPEC-07 §4).
- [ ] No auto-retry; user initiates Retry manually.
- [ ] `npx nx build pat-feature-command-catalog` PASS.

## Dependencies
FE-PAT-010 (listState signal from CommandFacade).
FE-PAT-012 (CommandCatalogPageComponent renders these components conditionally).

## Tenant-context impact
Nenhum (presentational; error messages are tenants-agnostic).

## Prioridade
P7
