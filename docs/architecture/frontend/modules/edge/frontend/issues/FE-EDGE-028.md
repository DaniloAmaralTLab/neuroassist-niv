## [FE-EDGE-028] Detection-state wire fields + VM mapping (absent ⇒ UNKNOWN; derived detection axis)

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
`EdgeDeviceWire` / `EdgeDeviceRowWire` gain `detectionState?`, `detectionStateSince`, `detectionReason`,
`engineVersion`, `lastDetectingAt`; `EdgeDeviceVM` gains the same, with `detectionState` defaulting to
`'UNKNOWN'` WHILE absent on the wire (never `'RUNNING'`). `DeviceStatusVM` gains the derived
`detection` axis (`'detecting' | 'not_detecting' | 'offline' | 'unavailable'`) + `detectionReason`,
computed by the SPEC-03 §1.1 matrix. The mapper never fabricates a detection value and never derives it
from a client timer.

**Context / Problem statement:**
- SPEC-03 §1 / §1.1 (amended): detection as a second axis distinct from connectivity; fixed matrix.
- SPEC-04 §3 (amended): wire fields on read; `engineVersion` is the detection-engine version, NOT the
  still-absent G-EDGE-2 agent `version`.
- BE api-contract §2.2 list rows carry no `detectionReason`/`engineVersion` — the row VM reflects that.
- Blocks: FE-EDGE-026 (service state types), FE-EDGE-029/030 (surfaces).

**Approach (execution path):**
1) Extend wire types in `libs/edge/data-access` to mirror BE §2.2/§2.3 1:1.
2) Extend `EdgeDeviceVM` + `DeviceStatusVM` (SPEC-03 §1) and the `DetectionState`/`DetectionReason` types.
3) In `toEdgeDeviceVM`/`toEdgeDeviceRow`: carry fields through, substitute `'UNKNOWN'` when absent,
   compute `DeviceStatusVM.detection` per the §1.1 matrix (offline dominates; online+RUNNING = detecting;
   online+not-RUNNING = not_detecting).
4) Add `lastDetectingRelative` display-only computed.

**Non-goals:**
- Does NOT render the surfaces (FE-EDGE-029/030).
- Does NOT add the G-EDGE-2 agent `version` (still INT-FE-EDGE-005 / open).

**Layer(s):**
frontend / Data access — `libs/edge/data-access/`

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§1, §1.1, §4)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-04-data-access.md` (§3)

**Architecture alignment:**
- Mapper models absent fields explicitly (carry-forward `fe-facade:fabricated-null-fields`)
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Lib path**
- 🔲 `libs/edge/data-access/src/lib/models/edge-device.wire.ts` (detection fields on `EdgeDeviceWire`/`EdgeDeviceRowWire`)
- 🔲 `libs/edge/data-access/src/lib/models/edge-device.vm.ts` (`DetectionState`, `DetectionReason`, VM fields, `detection` axis)
- 🔲 `libs/edge/data-access/src/lib/mappers/edge-device.mapper.ts` (carry-through + UNKNOWN default + §1.1 derivation)

**Tests**
- 🔲 `nx test edge-data-access` PASS (matrix: online+RUNNING→detecting; online+PAUSED/DEGRADED/UNAVAILABLE/UNKNOWN→not_detecting; offline→offline; absent→UNKNOWN not detecting)
- 🔲 `nx lint edge-data-access` PASS

**Milestone:**
Wave 2 / Data access (SAFETY-GEST-1 increment)

**Labels:**
type:feature
layer:frontend
scope:edge
priority:P2

**Acceptance criteria:**
- `npx nx test edge-data-access` PASS covering every matrix row of SPEC-03 §1.1
- `npx nx lint edge-data-access` PASS
- `npx nx build edge` PASS
- A test asserts an absent wire `detectionState` maps to `'UNKNOWN'` and `detection !== 'detecting'`.

**Dependencies:**
- FE-EDGE-008 (wire types + mappers)

**Data impact:**
- Nenhum

**API / Contract impact:**
- BE api-contract §2.2 (list), §2.3 (read) detection fields.

**Testing / Evidence required:**
- Mapper spec table covering the full §1.1 matrix including the offline-dominates and absent cases.

**Risks / Notes:**
- Do NOT conflate `engineVersion` with the G-EDGE-2 agent `version`; they are separate fields with separate gaps.
