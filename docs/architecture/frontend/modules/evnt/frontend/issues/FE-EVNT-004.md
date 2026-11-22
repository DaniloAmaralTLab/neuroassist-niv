# FE-EVNT-004 -- EVNT_MODULE_DESCRIPTOR + config/module-descriptors.ts registration

**Status:** OPEN
**GitHub:** [#TBD]

## Outcome

`libs/evnt/src/lib/evnt.descriptor.ts` exports `EVNT_MODULE_DESCRIPTOR` with the four declared shell surfaces (EmergencyTakeover, HomeNoticeSlot, TopbarRoutineNoticeIndicator, EscalationChannelStatus). The shell's `config/module-descriptors.ts` includes the EVNT descriptor.

## Context / Problem statement

- The shell needs a static descriptor for EVNT before the lazy chunk loads — to reserve layout and arm the takeover observer (SPEC-06 §1/§4).
- The descriptor declares which shell surfaces EVNT contributes (the four listed in SPEC-06 §1).
- Without this, the takeover CAN be missed in the window between shell boot and lazy-chunk resolution.
- Bloqueia: FE-EVNT-020 (integration service reads descriptor)

## Approach (execution path)

1. Create `libs/evnt/src/lib/evnt.descriptor.ts` with `EVNT_MODULE_DESCRIPTOR: ModuleDescriptor = { key: MODULE_KEY, menu: MODULE_MENU_METADATA, loadChildren: () => import('@neuroassist/evnt').then(m => m.EvntModule), routeBase: '/alarm', permissions: Object.keys(MODULE_PERMISSION_MAP), featureFlags: MODULE_FEATURE_FLAGS, shellSurfaces: ['HomeNoticeSlot', 'TopbarRoutineNoticeIndicator', 'EmergencyTakeover', 'EscalationChannelStatus'] }`.
2. Update `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts` to push `EVNT_MODULE_DESCRIPTOR` into `MODULE_DESCRIPTORS`.
3. Export `EVNT_MODULE_DESCRIPTOR` from `libs/evnt/src/index.ts`.

## Non-goals

- No `EvntShellIntegrationService` — that is FE-EVNT-020.
- No alarm-takeover logic — that is FE-EVNT-020.

## Layer(s)

frontend / tool entry (`libs/evnt/src/lib/`) + shell integration

## Bounded context

evnt

## Service execution spec(s)

- `docs/architecture/frontend/modules/evnt/frontend/frontend-spec/SPEC-06-shell-integration.md` §1/§4

## Architecture alignment

- Tag Nx: `scope:evnt`, `type:domain`

## Implementation checklist (by file)

**Lib path**
- [ ] `libs/evnt/src/lib/evnt.descriptor.ts`
- [ ] `apps/neuroassist-niv-web/src/app/config/module-descriptors.ts` (EVNT entry)
- [ ] `libs/evnt/src/index.ts` (export descriptor)

**Tests**
- [ ] `npx nx test evnt` PASS
- [ ] `npx nx lint evnt` PASS

## Milestone

Wave P1 / Foundation

## Labels

type:domain
layer:frontend
scope:evnt
priority:P1

## Acceptance criteria

- `npx nx test evnt` PASS
- `npx nx lint evnt` PASS
- `npx nx build neuroassist-niv-web` PASS
- `EVNT_MODULE_DESCRIPTOR.shellSurfaces` contains exactly the 4 surfaces listed in SPEC-06 §1
- Shell compiles without eager-loading the EVNT feature library

## Dependencies

- FE-EVNT-001 (MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS)

## Tenant-context impact

Nenhum (descriptor is static metadata).

## Risks / Notes

- The descriptor is the shell's fallback for menu/permission metadata before lazy-load resolves — keep it minimal and sync with the contract.

## Prioridade

P1
