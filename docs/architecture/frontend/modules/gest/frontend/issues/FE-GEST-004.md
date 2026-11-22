# FE-GEST-004 -- gest.descriptor.ts — GEST_MODULE_DESCRIPTOR for Patient-Mode host, identity: edge.device

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/6 itens

## Outcome
`libs/gest/src/lib/gest.descriptor.ts` exports `GEST_MODULE_DESCRIPTOR` with `identity: 'edge.device'` and `permissions: []`; the Patient-Mode host registers GEST by importing this descriptor and wires the device-token interceptor instead of the caregiver bearer. Which host app provides Patient Mode is gap G1 — GEST does not decide it (INT-FE-GEST-003).

## Approach (execution path)
1. Define `GEST_MODULE_DESCRIPTOR: ModuleDescriptor` from `@neuroassist/shared/contracts`:
   - `key: MODULE_KEY` ('gest')
   - `menu: MODULE_MENU_METADATA`
   - `loadChildren: () => import('@neuroassist/gest').then(m => m.GestModule)`
   - `routeBase: '/station'`
   - `permissions: Object.keys(MODULE_PERMISSION_MAP)` (resolves to `[]`)
   - `featureFlags: MODULE_FEATURE_FLAGS`
   - `identity: 'edge.device'`
2. The `identity: 'edge.device'` field tells the host to wire the device-token interceptor (not the caregiver bearer) for GEST egress.
3. Export from `libs/gest/src/index.ts`.
4. Write a minimal spec asserting `identity === 'edge.device'` and `permissions.length === 0`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/src/lib/gest.descriptor.ts`
- [ ] `identity: 'edge.device'` field present
- [ ] `permissions: []` (empty — no caregiver gest.* authority in v1)
- [ ] `routeBase: '/station'`
- [ ] Exported from `frontend/libs/gest/src/index.ts`
- [ ] `npx nx build gest` PASS

## Acceptance criteria
- [ ] `GEST_MODULE_DESCRIPTOR.identity === 'edge.device'`
- [ ] `GEST_MODULE_DESCRIPTOR.permissions.length === 0`
- [ ] `npx nx build gest` PASS

## Dependencies
- FE-GEST-001 (MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS)
- INT-FE-GEST-003 (G1 — Patient-Mode host undecided; this descriptor is the clean seam)

## Tenant-context impact
None — station module descriptor, no tenant data.

## Prioridade
P1
