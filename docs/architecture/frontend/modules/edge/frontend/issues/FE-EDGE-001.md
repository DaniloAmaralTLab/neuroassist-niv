## [FE-EDGE-001] edge.contract.ts — MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`libs/edge/src/lib/edge.contract.ts` is authored with all four exports matching the BE-canonical authority constants (INV-EDGE-7, D-639), making EDGE's permission map the single source of truth for every guard, action gate, and navigation check in the module.

**Context / Problem statement:**
- Module entry contract is the prerequisite for all other EDGE FE files; every guard and navigation service references its exports.
- SPEC-05 defines the exact authority strings, menu metadata, and feature flags.
- The vision authority names (`edge.device.view`, `edge.heartbeat.view`) are **superseded** by the BE contract (G-EDGE-1); this file must use `edge.device.read` exclusively.
- Bloqueia: FE-EDGE-002, FE-EDGE-004, FE-EDGE-005, FE-EDGE-017, FE-EDGE-018

**Approach (execution path):**
1. Create `libs/edge/src/lib/edge.contract.ts` with `MODULE_KEY = 'edge'`.
2. Author `MODULE_MENU_METADATA` with contextual entries for `/patients/:patientId/device` (`edge.device.read`) and `/patients/:patientId/device/pair` (`edge.device.pair`); `section: 'care'`, `order: 30`, no standalone top-level sidebar destination.
3. Author `MODULE_PERMISSION_MAP` with exactly the 7 BE-canonical authority keys: `edge.device.enroll`, `edge.device.pair`, `edge.device.read`, `edge.device.activate`, `edge.device.deactivate`, `edge.device.unpair`, `edge.device.revoke` — each with `label` and `justification` per SPEC-05 §2.
4. Author `MODULE_FEATURE_FLAGS`: `edge.patient-phone-pairing` (`defaultState: true`) and `edge.device-lifecycle` (`defaultState: true`).
5. Export all four constants from the module barrel (`libs/edge/src/index.ts`).

**Non-goals:**
- No guard or component logic here — this file is data only.
- Do not include `edge.heartbeat.record` or `edge.catalog.read` (device-token authorities, never dashboard keys — ADR-014).

**Layer(s):**
frontend / Tool entry — `libs/edge/src/lib/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-05-tool-contract.md` (all sections)

**Architecture alignment:**
- BE authorities canonical (INV-EDGE-7, D-639)
- Standalone + OnPush + Signals (N/A for this file — data-only)
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Lib path: libs/edge/src/lib/**
- 🔲 `libs/edge/src/lib/edge.contract.ts` (MODULE_KEY, MODULE_MENU_METADATA, MODULE_PERMISSION_MAP, MODULE_FEATURE_FLAGS)
- 🔲 `libs/edge/src/index.ts` (barrel export of all 4 constants)

**Tests**
- 🔲 `npx nx test edge` PASS
- 🔲 `npx nx lint edge` PASS

**Milestone:**
Wave 1 / P1 Foundation

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P1

**Acceptance criteria:**
- `MODULE_PERMISSION_MAP` contains exactly the 7 keys declared in SPEC-05 §2 and no others.
- `MODULE_MENU_METADATA.entries` have `contextual: true` and do NOT include a top-level sidebar entry.
- `edge.device.view` and `edge.heartbeat.view` do NOT appear anywhere in the file (G-EDGE-1 reconciliation).
- `npx nx test edge` PASS
- `npx nx lint edge` PASS
- `npx nx build edge` PASS

**Dependencies:**
Nenhuma (first issue in the module)

**Data impact:**
Nenhum (FE não persiste dados client-side além de auth-session storage)

**API / Contract impact:**
- Authorities must equal the BE `RoleAuthorityPolicy` constants (api-contract §9, INV-EDGE-7)

**Testing / Evidence required:**
- Unit test asserting `Object.keys(MODULE_PERMISSION_MAP)` equals `['edge.device.enroll','edge.device.pair','edge.device.read','edge.device.activate','edge.device.deactivate','edge.device.unpair','edge.device.revoke']`.

**Risks / Notes:**
- If a scaffold pre-generates this file with the superseded `edge.device.view` key, it must be corrected here (G-EDGE-1).
