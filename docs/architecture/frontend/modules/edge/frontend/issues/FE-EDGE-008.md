## [FE-EDGE-008] Wire record types + mappers (toEdgeDeviceVM, toEdgeDeviceRow, toPairingDraft)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EdgeDeviceWire`, `EdgeDeviceRowWire`, and `EnrollResultWire` mirror the BE JSON shapes 1:1; the three mappers convert wire → VM and explicitly model `version` as absent (G-EDGE-2), and map BE field names `connectivity`→`status`, `lastHeartbeatAt`→`lastSyncAt`.

**Context / Problem statement:**
- SPEC-04 §3 defines the wire types; SPEC-03 §4 defines the VM ↔ wire mapping contract.
- G-EDGE-2: the BE api-contract has NO `version` field on `EdgeDeviceWire`; `version` MUST be modelled as absent in the mapper (carry-forward `fe-facade:fabricated-null-fields`).
- BE names (`connectivity`, `lastHeartbeatAt`) differ from VM names (`status`, `lastSyncAt`) — the mapper must translate, not alias.
- Mappers live in `libs/edge/data-access` and are the only place that knows both shapes (carry-forward `http-adapter:fe-dto-drift`).
- Bloqueia: FE-EDGE-009

**Approach (execution path):**
1. Create `libs/edge/data-access/src/lib/models/edge-device.wire.ts` with `EdgeDeviceWire`, `EdgeDeviceRowWire`, `EnrollResultWire` as `interface` (readonly fields).
2. Add a TODO comment on `EdgeDeviceWire`: `// G-EDGE-2: no 'version' field — BE must add it; mapper explicitly omits version`.
3. Create `libs/edge/data-access/src/lib/mappers/edge-device.mapper.ts` with:
   - `toEdgeDeviceVM(wire: EdgeDeviceWire): EdgeDeviceVM` — maps `connectivity→status`, `lastHeartbeatAt→lastSyncAt`, leaves `version: null` (explicitly absent).
   - `toEdgeDeviceRow(wire: EdgeDeviceRowWire): EdgeDeviceRowVM` (for the list).
   - `toPairingDraft(wire: EnrollResultWire): DevicePairingVM` (pairing draft from enroll result).
4. Add unit tests for all three mappers including the `version=null` invariant.

**Non-goals:**
- Do not add `version` to `EdgeDeviceWire` (it does not exist in the BE contract yet — G-EDGE-2).
- Do not map `connectivity=null` to `'online'` — null WHILE lifecycleState != paired means `badge='unavailable'`.

**Layer(s):**
frontend / Data access — `libs/edge/data-access/src/lib/models/` and `mappers/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§3)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§4)

**Architecture alignment:**
- Standalone + OnPush + Signals
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Data access lib**
- 🔲 `libs/edge/data-access/src/lib/models/edge-device.wire.ts` (3 wire types)
- 🔲 `libs/edge/data-access/src/lib/mappers/edge-device.mapper.ts` (3 mappers)
- 🔲 `libs/edge/data-access/src/lib/mappers/edge-device.mapper.spec.ts` (unit tests)

**Tests**
- 🔲 `npx nx test edge-data-access` PASS
- 🔲 `npx nx lint edge-data-access` PASS

**Milestone:**
Wave 2 / P2 Data Access

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P2

**Acceptance criteria:**
- `EdgeDeviceWire` has no `version` field.
- `toEdgeDeviceVM` maps `connectivity→status` and `lastHeartbeatAt→lastSyncAt`.
- `toEdgeDeviceVM` returns `version: null` (explicitly absent).
- `toEdgeDeviceVM` returns `badge='unavailable'` when `lifecycleState !== 'paired'` or `connectivity===null`.
- Mapper spec covers: online, offline, awaiting_claim (unavailable), null connectivity.
- `npx nx test edge-data-access` PASS

**Dependencies:**
- FE-EDGE-007 (service needs wire types at compile time)

**Data impact:**
Nenhum

**API / Contract impact:**
- Wire shapes mirror BE api-contract §2.3 (GET /edge/devices/{id}) and §2.1 (POST /edge/devices)

**Testing / Evidence required:**
- Mapper spec output showing `version` field is `null` for a standard wire fixture.

**Risks / Notes:**
- When G-EDGE-2 is resolved (BE adds `version`), update `EdgeDeviceWire` and `toEdgeDeviceVM` — do NOT invent it here.
