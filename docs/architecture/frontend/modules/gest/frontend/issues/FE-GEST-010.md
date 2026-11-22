# FE-GEST-010 -- CatalogFacade — EDGE catalog + support-check, ActiveCommandVM.detectable computation (INV-GEST-7)

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`CatalogFacade` loads the EDGE command catalog + runs support-check at bootstrap; `activeCommandsVm()` signal exposes `ActiveCommandVM[]` where `detectable=true` only when ALL primitive codes for that command are `detectable=true` per the `engineVersion` support-check response; a compound command is detectable iff EVERY primitive is detectable; `unknown`/`unsupported` codes → `detectable=false`; non-detectable commands are marked 'not yet detectable' and NEVER armed by the state machine (INV-GEST-7).

## Approach (execution path)
1. `CatalogFacade.loadCatalog()`: call `CatalogPort.read()`, cache `CatalogCommandWire[]`.
2. `checkSupport(engineVersion: string, codes: string[])`: call `CapabilityPort.checkSupport()`; cache result by `engineVersion`.
3. `activeCommandsVm()`: `computed()` crossing catalog × support map via `toActiveCommand(catalogCmd, supportMap)` mapper.
4. `toActiveCommand()` mapper: map `minGestureTimeMs → minGestureDurationMs`, `maxGestureTimeMs → maxGestureDurationMs`; set `detectable = primaryDetectable && (secondaryPrimitive ? secondaryDetectable : true)`; `unknown/unsupported → detectable=false`.
5. On `403` from support-check → all commands: `detectable=false, supportStatus='unknown'`; surface warning (INT-GEST-ACS-1 open).
6. `supportResolved` event recomputes `activeCommandsVm()`.
7. Spec: (a) compound with one `unsupported` primitive → `detectable=false`; (b) all primitives `supported` → `detectable=true`; (c) unknown code → `detectable=false`; (d) `403` on support-check → all commands unverified; (e) `minGestureTimeMs` mapped to `minGestureDurationMs` correctly.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/data-access/src/lib/catalog.facade.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/catalog.facade.spec.ts`
- [ ] implementar `frontend/libs/gest/data-access/src/lib/mappers/active-command.mapper.ts`
- [ ] `detectable` = AND over ALL primitive codes' `detectable` (INV-GEST-7)
- [ ] Unknown/unsupported code → `detectable=false`
- [ ] `minGestureTimeMs → minGestureDurationMs`, `maxGestureTimeMs → maxGestureDurationMs` mapped
- [ ] `403` → all gates set to `{detectable:false, supportStatus:'unknown'}`
- [ ] `npx nx test gest-data-access` PASS
- [ ] `npx nx build gest-data-access` PASS

## Acceptance criteria
- [ ] Compound command spec: one unsupported primitive → `detectable=false` (INV-GEST-7)
- [ ] `403` → all commands unverified (not silently detectable)
- [ ] `npx nx test gest-data-access` PASS

## Dependencies
- FE-GEST-007 (CapabilityPort)
- FE-GEST-008 (CatalogPort)
- INT-FE-GEST-002 (compoundWindowMs read from EDGE catalog — `minGestureTimeMs/maxGestureTimeMs`)

## Tenant-context impact
None — station-local catalog; support-check queries the global GEST registry (neuroassist_global).

## Prioridade
P2
