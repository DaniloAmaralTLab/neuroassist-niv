# FE-GEST-001 -- gest.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP (empty), MODULE_FEATURE_FLAGS, STATION_TOKEN_AUTHORITIES

**Status:** INTACT -- gerado 2026-11-20
**Maturidade:** 0 -- Inicial
**Done/Total:** 0/9 itens

## Outcome
`libs/gest/src/lib/gest.contract.ts` is authored with `MODULE_KEY = 'gest'`, `MODULE_MENU_METADATA` (station context, no caregiver sidebar), `MODULE_PERMISSION_MAP = {}` (empty — no caregiver gest.* authority in v1; reconciliation SPEC-05 §2), `MODULE_FEATURE_FLAGS` (4 flags), and `STATION_TOKEN_AUTHORITIES` (5 device-token rights the edge.device token must carry — INT-GEST-ACS-1).

## Approach (execution path)
1. Define `MODULE_KEY = 'gest'`.
2. Define `MODULE_MENU_METADATA` with `section: 'station'`, `icon: 'sensors'`, single entry `{label: 'Detection status', route: '/station/status', requires: '__station_identity__', contextual: true}` — no caregiver top-level destination.
3. Define `MODULE_PERMISSION_MAP = {}` empty with explicit reconciliation comment: `gest.runtime.read/control/diagnostics.read` DROPPED (no such BE authority; SPEC-01 §2).
4. Define `MODULE_FEATURE_FLAGS` for `gest.compound-gestures` (on), `gest.operator-preview` (on), `gest.offline-queue` (on), `gest.wake-lock` (on).
5. Define `STATION_TOKEN_AUTHORITIES = ['evnt.event.ingest', 'gest.capability.read', 'gest.engine.read', 'edge.catalog.read', 'edge.heartbeat.record'] as const`.
6. Re-export all five symbols from `libs/gest/src/index.ts`.

## Implementation checklist (by layer/file)
- [ ] implementar `frontend/libs/gest/src/lib/gest.contract.ts`
- [ ] `MODULE_KEY = 'gest'` exported
- [ ] `MODULE_MENU_METADATA` section=station, no caregiver sidebar entry
- [ ] `MODULE_PERMISSION_MAP = {}` with reconciliation comment (SPEC-05 §2)
- [ ] `MODULE_FEATURE_FLAGS` with exactly 4 flags
- [ ] `STATION_TOKEN_AUTHORITIES` with exactly 5 entries
- [ ] All five symbols re-exported from `frontend/libs/gest/src/index.ts`
- [ ] `npx nx lint gest` PASS
- [ ] `npx nx build gest` PASS (no TS errors)

## Acceptance criteria
- [ ] `MODULE_PERMISSION_MAP` is empty — `Object.keys(MODULE_PERMISSION_MAP).length === 0`
- [ ] `STATION_TOKEN_AUTHORITIES` includes `gest.capability.read` and `gest.engine.read` (INT-GEST-ACS-1)
- [ ] No `gest.runtime.*` or `gest.diagnostics.*` key exists anywhere in the contract (SPEC-05 §2)
- [ ] `npx nx build gest` PASS

## Dependencies
None — this is the foundation for all subsequent GEST issues.

## Tenant-context impact
None — this is a static module contract; no tenant data is read or written.

## Prioridade
P1
