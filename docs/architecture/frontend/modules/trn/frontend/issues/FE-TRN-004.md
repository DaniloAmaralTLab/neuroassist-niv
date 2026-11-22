# FE-TRN-004 -- TRN_MODULE_DESCRIPTOR Shell registration entry in neuroassist-niv-web

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`TRN_MODULE_DESCRIPTOR` is defined in `libs/trn/shell-entry/` and registered in the caregiver web Shell `neuroassist-niv-web`'s `config/module-descriptors.ts`, enabling lazy-loading of TRN_ROUTES under `/training` for the caregiver identity.

## Context / Problem statement
- SPEC-06 §1: the Shell registers TRN as a "Training" destination in the `'care'` section (order 40) with the 12 caregiver permissions.
- The `scope:web → scope:trn` import boundary is allowed (shared ADR-006).
- The descriptor must reference `identity: 'caregiver.jwt'` and load `TRN_ROUTES` lazily.
- Bloqueia: FE-TRN-022 (TrnShellIntegrationService)

## Approach (execution path)
1. Create `libs/trn/shell-entry/src/lib/trn-descriptor.ts` exporting `TRN_MODULE_DESCRIPTOR: ModuleDescriptor` per SPEC-06 §1 (key, title, icon, section, order, identity, routeBase, routePath, loadChildren, permissions[12]).
2. Add `TRN_MODULE_DESCRIPTOR` import in `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts` and register it in the descriptor array.
3. Confirm the Shell's route configuration picks up `/training` via `loadChildren`.
4. Verify no patient-session entries or second identity appear in the descriptor.

## Non-goals
- No implementation of TrnShellIntegrationService here (FE-TRN-022).
- No routes registration for a Patient-Mode host (G1 optional).

## Layer(s)
frontend / Shell integration (`libs/trn/shell-entry/` + `apps/neuroassist-niv-web/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-06-shell-integration.md` (§1)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-05-tool-contract.md` (§1–§2)

## Architecture alignment
- `scope:web → scope:trn` boundary is allowed
- Single caregiver identity in the descriptor

## Implementation checklist (by layer/file)

**Lib path: `frontend/libs/trn/shell-entry/`**
- 🔲 `src/lib/trn-descriptor.ts` — TRN_MODULE_DESCRIPTOR (key, title, icon, section, order, identity, routeBase, loadChildren, permissions[12])

**App: `frontend/apps/neuroassist-niv-web/`**
- 🔲 `src/app/config/module-descriptors.ts` — imports and registers TRN_MODULE_DESCRIPTOR

**Tests**
- 🔲 Unit test: TRN_MODULE_DESCRIPTOR.permissions has 12 entries
- 🔲 Unit test: TRN_MODULE_DESCRIPTOR.identity === 'caregiver.jwt'
- 🔲 `npx nx lint trn` PASS
- 🔲 `npx nx build neuroassist-niv-web` PASS

## Milestone
Wave 1 / Foundation

## Labels
type:feature
layer:frontend
scope:trn
priority:P1

## Acceptance criteria
- `TRN_MODULE_DESCRIPTOR` is registered in the caregiver web Shell with section `'care'`, order `40`, identity `'caregiver.jwt'`.
- Descriptor permissions array lists all 12 caregiver authority strings.
- `npx nx build neuroassist-niv-web` PASS after the descriptor is registered.
- No second identity or patient-session entry appears in the descriptor.

## Dependencies
- FE-TRN-001 (trn.contract.ts for MODULE_MENU_METADATA)
- FE-TRN-002 (TRN_ROUTES)

## Data impact
- None — static descriptor registration.

## API / Contract impact
- None — no HTTP calls here; descriptor is static metadata.

## Testing / Evidence required
- Unit test output showing 12 permissions in TRN_MODULE_DESCRIPTOR.
- Shell build passes with TRN registered.

## Risks / Notes
- INT-FE-TRN-003: modules.registry[TRN].frontendLib is `trn-ui` in project-context.json; the actual on-disk name is `trn` — reconcile in /fe-architect-promote.
