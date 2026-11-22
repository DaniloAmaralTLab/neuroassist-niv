## [INT-FE-EDGE-005] INT: G-EDGE-2 follow-up — edge-service must add 'version' field to EdgeDevice response

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
A tracked open gap: the BE api-contract for `GET /edge/devices/{id}` has no `version` field; the FE explicitly models `version` as absent (FE-EDGE-008); when the BE adds `version`, the FE wire type, mapper, and card component must be updated to render it. References INT-EDGE-005.

**Context / Problem statement:**
- G-EDGE-2 (backend-api-cross-link.md §2): the vision/BA data model exposes `EdgeDevice.version` (shown on the Home card); the current BE api-contract does NOT include a `version` field.
- FE currently models `version: null` in `EdgeDeviceVM` and omits the version line in `EdgeDeviceCardComponent` WHILE `version === null` (SPEC-03 §1, FE-EDGE-008/015).
- The vision `lastSyncAt`→BE `lastHeartbeatAt` and `status`→BE `connectivity` name translations are already reconciled (FE-EDGE-008).
- This INT issue is an OPEN DEPENDENCY: it blocks the Home card version display until INT-EDGE-005 (the BE issue tracking the `version` field addition) is resolved.

**Approach (execution path):**
1. Document this gap as an open INT issue (this file).
2. Reference INT-EDGE-005 in the BE `edge-service` backlog as the companion issue.
3. When INT-EDGE-005 is resolved (BE adds `version` to `GET /edge/devices/{id}`):
   a. Add `version: string | null` to `EdgeDeviceWire` (FE-EDGE-008).
   b. Update `toEdgeDeviceVM` mapper to pass `version` through.
   c. `EdgeDeviceCardComponent` already renders it conditionally with `@if (vm.device?.version)` — no change needed there.
4. Close this issue after a full regression pass (mapper spec, component spec, e2e device-status-badge).

**Non-goals:**
- Do not add `version` to `EdgeDeviceWire` before the BE api-contract is updated.
- Do not invent a version string on the FE side.

**Layer(s):**
frontend / Data access — `libs/edge/data-access/` (pending BE change)

**Bounded context:**
edge

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/contracts/backend-api-cross-link.md` (§2 — G-EDGE-2)
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-03-view-models.md` (§1 — version absent)

**Architecture alignment:**
- Tag Nx: `scope:edge`, `type:data-access`

**Implementation checklist (by file)**

**Pending BE change**
- 🔲 Confirm INT-EDGE-005 is opened in the BE EDGE backlog
- 🔲 When BE resolves: update `libs/edge/data-access/src/lib/models/edge-device.wire.ts`
- 🔲 When BE resolves: update `libs/edge/data-access/src/lib/mappers/edge-device.mapper.ts`

**Tests (after BE resolves)**
- 🔲 `npx nx test edge-data-access` PASS with version mapping

**Milestone:**
Wave 4 / P4 Hub Integrations

**Labels:**
type:integration
layer:frontend
scope:edge
priority:P4

**Acceptance criteria:**
- INT-EDGE-005 is open and cross-referenced.
- Until INT-EDGE-005 is resolved: `EdgeDeviceWire` has no `version` field; `EdgeDeviceCardComponent` renders no version line.
- After INT-EDGE-005 resolves: version line renders WHERE the BE supplies it.

**Dependencies:**
- FE-EDGE-008 (wire types and mappers)
- INT-EDGE-005 (BE companion issue — open gap)

**Data impact:**
Nenhum

**API / Contract impact:**
- BE api-contract §2.3 (`GET /edge/devices/{id}`) must be updated to include `version` before this closes

**Testing / Evidence required:**
- After BE resolves: mapper spec updated to verify `version` is mapped; component test verifies version line renders.

**Risks / Notes:**
- If the BE adds `version` without opening INT-EDGE-005, this FE issue will silently not render the version — the FE wire type only gains the field when the INT issue chain is tracked and closed.
