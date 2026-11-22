## [INT-FE-EDGE-006] INT: StationLivenessPort seam — libs/edge is the single sender, GEST consumes in-process

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

**Outcome:**
The `StationLivenessPort` seam between `libs/edge` (provider / single heartbeat sender) and
`@neuroassist/gest` (consumer) is wired and verified: GEST pushes its mapped detection state in-process
via `setDetectionState(...)` and requests out-of-cadence beats via `beatNow()`; it opens **no** second
heartbeat sender and adds **no** fourth network call. `libs/edge` carries the pushed state on its next
periodic beat and sends immediately on `beatNow()`. This realises the SAFETY-GEST-1 decision across the
EDGE↔GEST boundary (GEST SPEC-06 §2.1, INV-GEST-8).

**Context / Problem statement:**
- GEST SPEC-06 §2.1 declares the port and states `libs/edge` owns the one and only heartbeat sender;
  `sendBeacon` is rejected (cannot carry the bearer). EDGE SPEC-06 §5 implements the sender.
- This INT issue tracks the cross-module contract: the port type/signature must be identical on both
  sides, provided by `libs/edge`, and injected into `GestShellIntegrationService`.
- Depends on FE-EDGE-026 (the provider). GEST-side consumption is owned by the GEST backlog; this issue
  owns the EDGE provider surface + the shared contract verification.

**Approach (execution path):**
1) Read GEST SPEC-06 §2.1 and confirm the `StationLivenessPort` signature
   (`setDetectionState(state, reason, engineVersion)`, `beatNow()`) and the shared
   `DetectionStateEnum`/`DetectionReason` types match EDGE SPEC-03/SPEC-06.
2) Export the port + an Angular provider from `@neuroassist/edge` (or a shared boundary lib) so GEST can
   inject it without depending on EDGE internals.
3) Verify (integration test) that a GEST `setDetectionState`→`beatNow()` sequence results in exactly one
   additional beat from `libs/edge` and zero heartbeat calls originating in GEST.

**Non-goals:**
- Does NOT implement GEST's visibility handler or detection mapping (GEST backlog).
- Does NOT add a GEST network egress (the whole point is to avoid a second sender).

**Layer(s):**
frontend / Shell integration — `libs/edge/integration/` (+ `@neuroassist/gest` consumer, tracked in GEST backlog)

**Bounded context:**
edge (provider) ↔ gest (consumer)

**Service execution spec(s):**
- `docs/architecture/frontend/modules/edge/frontend/frontend-spec/SPEC-06-shell-integration.md` (§5, §5.1)
- `docs/architecture/frontend/modules/gest/frontend/frontend-spec/SPEC-06-shell-integration.md` (§2.1, §3.1)

**Architecture alignment:**
- In-process port call, not a network boundary (keeps GEST at its three device-token calls)
- Nx boundary: GEST depends on the exported port, not on EDGE feature libs
- Tag Nx: `scope:edge`, `type:domain`

**Implementation checklist (by file)**

**Lib path**
- 🔲 Confirm `StationLivenessPort` signature parity with GEST SPEC-06 §2.1 (shared `DetectionStateEnum`/`DetectionReason`)
- 🔲 `libs/edge/integration/src/index.ts` exports the port + provider for GEST injection
- 🔲 Nx dep-graph check: `gest` → port only (no edge feature-lib import)

**Tests**
- 🔲 `nx test edge-integration` PASS (one beat per `setDetectionState`+`beatNow`; no GEST-originated heartbeat)
- 🔲 Nx boundary lint PASS

**Milestone:**
Wave 4 / Hub integrations (SAFETY-GEST-1 increment)

**Labels:**
type:integration
layer:frontend
scope:edge
priority:P4

**Acceptance criteria:**
- Port signature identical on both modules; provided by `libs/edge`.
- Integration test proves a single sender; zero heartbeat egress from GEST.
- `npx nx lint edge-integration` PASS (boundaries).

**Dependencies:**
- FE-EDGE-026 (StationLivenessService / provider)
- GEST SPEC-06 §2.1 (consumer contract — companion GEST backlog item)

**Data impact:**
- Nenhum

**API / Contract impact:**
- Shared FE contract `StationLivenessPort`; no BE contract change (reuses `POST /edge/heartbeat`).

**Testing / Evidence required:**
- Integration test + Nx dep-graph evidence that GEST adds no heartbeat egress.

**Risks / Notes:**
- If GEST and EDGE diverge on the enum/reason types, the in-process push silently drops data; pin both to one shared type and assert it in the test.
